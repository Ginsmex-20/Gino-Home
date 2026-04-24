const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { uploadsPath } = require('../config');

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

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'Alle Felder erforderlich' });
    if (password.length < 6) return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen haben' });

    const exists = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
    if (exists) return res.status(409).json({ error: 'Email oder Benutzername bereits vergeben' });

    const hash = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)').run(username, email, hash);
    const user = db.prepare('SELECT id, username, email, avatar, bio, phone, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }
    const { password_hash, ...safeUser } = user;
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, username, email, avatar, bio, phone, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Nicht gefunden' });
  res.json(user);
});

router.put('/profile', auth, (req, res) => {
  const { username, bio, phone } = req.body;
  db.prepare('UPDATE users SET username = ?, bio = ?, phone = ? WHERE id = ?').run(username, bio, phone, req.user.id);
  const user = db.prepare('SELECT id, username, email, avatar, bio, phone, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

router.post('/avatar', auth, upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei' });
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatarUrl, req.user.id);
  res.json({ avatar: avatarUrl });
});

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

// ─── Apple Sign In ───────────────────────────────────────────────────────────
router.post('/apple', async (req, res) => {
  try {
    if (!process.env.APPLE_CLIENT_ID) {
      return res.status(501).json({ error: 'Apple Sign In nicht konfiguriert' });
    }

    const { identityToken, user: appleUser } = req.body;
    if (!identityToken) return res.status(400).json({ error: 'Apple-Token fehlt' });

    // Token mit Apple-Servern verifizieren
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

    // Benutzer suchen oder anlegen
    let user = db.prepare('SELECT * FROM users WHERE apple_id = ?').get(appleUserId);

    if (!user) {
      // Existiert schon ein Account mit gleicher E-Mail?
      user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (user) {
        // Apple ID mit bestehendem Account verknüpfen
        db.prepare('UPDATE users SET apple_id = ?, auth_provider = ? WHERE id = ?')
          .run(appleUserId, 'apple', user.id);
      } else {
        // Neuen Account erstellen
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
