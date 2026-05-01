const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sendWelcome, sendInvite } = require('../services/email');
const { uploadsPath } = require('../config');

// ── Konstanten ───────────────────────────────────────────────────────────────
const OWNER_EMAIL = 'lpirmus2002@gmail.com';

// ── Helpers ──────────────────────────────────────────────────────────────────
function generateTempCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function requireOwner(req, res, next) {
  if (req.user?.email !== OWNER_EMAIL) {
    return res.status(403).json({ error: 'Nur der Eigentümer kann diese Aktion ausführen' });
  }
  next();
}

// ── Avatar Upload ─────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(uploadsPath, 'avatars');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `avatar-${req.user?.id || Date.now()}-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ── REGISTER — deaktiviert (nur per Einladung) ────────────────────────────────
router.post('/register', async (req, res) => {
  return res.status(403).json({
    error: 'Registrierung ist deaktiviert. Bitte wende dich an den Administrator.'
  });
});

// ── LOGIN ─────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }
    if (user.is_active === 0) {
      return res.status(403).json({ error: 'Konto wurde deaktiviert' });
    }
    const { password_hash, ...safeUser } = user;
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({
      token,
      user: safeUser,
      must_change_password: !!user.force_password_change
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ME ────────────────────────────────────────────────────────────────────────
router.get('/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, username, email, avatar, bio, phone, created_at, force_password_change FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Nicht gefunden' });
  res.json(user);
});

// ── PROFIL BEARBEITEN ─────────────────────────────────────────────────────────
router.put('/profile', auth, (req, res) => {
  const { username, bio, phone } = req.body;
  db.prepare('UPDATE users SET username = ?, bio = ?, phone = ? WHERE id = ?').run(username, bio, phone, req.user.id);
  const user = db.prepare('SELECT id, username, email, avatar, bio, phone, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// ── AVATAR ────────────────────────────────────────────────────────────────────
router.post('/avatar', auth, upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei' });
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatarUrl, req.user.id);
  res.json({ avatar: avatarUrl });
});

// ── PASSWORT ÄNDERN (normal) ──────────────────────────────────────────────────
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!await bcrypt.compare(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: 'Aktuelles Passwort falsch' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PASSWORT ERZWINGEN (erstes Login) ─────────────────────────────────────────
router.post('/set-password', auth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen haben' });
    }
    const hash = await bcrypt.hash(password, 10);
    db.prepare('UPDATE users SET password_hash = ?, force_password_change = 0 WHERE id = ?').run(hash, req.user.id);
    const user = db.prepare('SELECT id, username, email, avatar, bio, phone, created_at, force_password_change FROM users WHERE id = ?').get(req.user.id);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── EINLADEN (nur Eigentümer) ─────────────────────────────────────────────────
router.post('/invite', auth, requireOwner, async (req, res) => {
  try {
    const { email, username } = req.body;
    if (!email || !username) {
      return res.status(400).json({ error: 'E-Mail und Benutzername erforderlich' });
    }

    const exists = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
    if (exists) {
      return res.status(409).json({ error: 'E-Mail oder Benutzername bereits vergeben' });
    }

    const tempCode = generateTempCode(8);
    const hash = await bcrypt.hash(tempCode, 10);

    db.prepare(
      'INSERT INTO users (username, email, password_hash, force_password_change) VALUES (?, ?, ?, 1)'
    ).run(username, email, hash);

    // E-Mail mit temp Code senden
    const sent = await sendInvite(email, username, tempCode);

    res.json({
      success: true,
      message: sent
        ? `Einladung an ${email} gesendet`
        : `Konto erstellt. Temp-Code (SMTP nicht konfiguriert): ${tempCode}`,
      temp_code: sent ? undefined : tempCode
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── BENUTZER LISTE (nur Eigentümer) ──────────────────────────────────────────
router.get('/users', auth, requireOwner, (req, res) => {
  const users = db.prepare(
    'SELECT id, username, email, avatar, created_at, force_password_change, is_active FROM users ORDER BY created_at ASC'
  ).all();
  res.json(users);
});

// ── BENUTZER DEAKTIVIEREN/AKTIVIEREN (nur Eigentümer) ────────────────────────
router.patch('/users/:id/toggle', auth, requireOwner, (req, res) => {
  const { id } = req.params;
  const user = db.prepare('SELECT id, email, is_active FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
  if (user.email === OWNER_EMAIL) return res.status(403).json({ error: 'Eigentümer kann nicht deaktiviert werden' });
  const newStatus = user.is_active ? 0 : 1;
  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(newStatus, id);
  res.json({ success: true, is_active: newStatus });
});

// ── BENUTZER LÖSCHEN (nur Eigentümer) ────────────────────────────────────────
router.delete('/users/:id', auth, requireOwner, (req, res) => {
  const { id } = req.params;
  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
  if (user.email === OWNER_EMAIL) return res.status(403).json({ error: 'Eigentümer kann nicht gelöscht werden' });
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ success: true });
});

// ── Google Sign In ────────────────────────────────────────────────────────────
router.post('/google', async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ error: 'Google-Token fehlt' });

    // Userdaten von Google holen
    const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`);
    if (!response.ok) return res.status(401).json({ error: 'Google-Token ungültig' });
    const googleUser = await response.json();

    const { email, name, sub: googleId, picture } = googleUser;
    if (!email) return res.status(400).json({ error: 'Keine E-Mail von Google erhalten' });

    // Nur eingeladene / existierende User dürfen sich einloggen
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      // Kein Account vorhanden → kein Zugang (kein automatisches Anlegen)
      return res.status(403).json({
        error: 'Kein Konto mit dieser Google-E-Mail. Bitte wende dich an den Administrator.'
      });
    }

    // Google ID verknüpfen falls noch nicht
    if (!user.apple_id || user.apple_id !== googleId) {
      db.prepare('UPDATE users SET auth_provider = ? WHERE id = ?').run('google', user.id);
    }

    if (user.is_active === 0) {
      return res.status(403).json({ error: 'Konto wurde deaktiviert' });
    }

    const { password_hash, ...safeUser } = user;
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: safeUser, must_change_password: !!user.force_password_change });
  } catch (err) {
    console.error('[Google Auth]', err.message);
    res.status(500).json({ error: 'Google-Anmeldung fehlgeschlagen: ' + err.message });
  }
});

// ── Apple Sign In ─────────────────────────────────────────────────────────────
router.post('/apple', async (req, res) => {
  try {
    if (!process.env.APPLE_CLIENT_ID) {
      return res.status(501).json({ error: 'Apple Sign In nicht konfiguriert' });
    }
    const { identityToken, user: appleUser } = req.body;
    if (!identityToken) return res.status(400).json({ error: 'Apple-Token fehlt' });

    const appleSignin = require('apple-signin-auth');
    const payload = await appleSignin.verifyIdToken(identityToken, {
      audience: process.env.APPLE_CLIENT_ID,
      ignoreExpiration: false,
    });

    const appleUserId = payload.sub;
    const email = payload.email || `${appleUserId}@privaterelay.appleid.com`;
    const fullName = appleUser?.name
      ? `${appleUser.name.firstName || ''} ${appleUser.name.lastName || ''}`.trim()
      : null;
    const username = fullName || `gino_${appleUserId.slice(-6)}`;

    let user = db.prepare('SELECT * FROM users WHERE apple_id = ?').get(appleUserId);
    if (!user) {
      user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (user) {
        db.prepare('UPDATE users SET apple_id = ?, auth_provider = ? WHERE id = ?')
          .run(appleUserId, 'apple', user.id);
      } else {
        const result = db.prepare(
          'INSERT INTO users (username, email, apple_id, auth_provider, password_hash) VALUES (?, ?, ?, ?, ?)'
        ).run(username, email, appleUserId, 'apple', '');
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
      }
    }

    const { password_hash, ...safeUser } = user;
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '90d' });
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('[Apple Auth]', err.message);
    res.status(401).json({ error: 'Apple-Anmeldung fehlgeschlagen: ' + err.message });
  }
});

module.exports = router;
