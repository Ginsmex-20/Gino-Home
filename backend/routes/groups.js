const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const crypto = require('crypto');

function generateCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

router.get('/', auth, (req, res) => {
  const groups = db.prepare(`
    SELECT g.*, u.username as creator_name,
      (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
    FROM groups g
    LEFT JOIN users u ON g.created_by = u.id
    WHERE g.id IN (SELECT group_id FROM group_members WHERE user_id = ?)
    ORDER BY g.created_at DESC
  `).all(req.user.id);
  res.json(groups);
});

router.post('/', auth, (req, res) => {
  const { name, description, type } = req.body;
  if (!name) return res.status(400).json({ error: 'Name erforderlich' });
  const code = generateCode();
  const result = db.prepare('INSERT INTO groups (name, description, type, created_by, invite_code) VALUES (?, ?, ?, ?, ?)').run(name, description, type || 'general', req.user.id, code);
  db.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').run(result.lastInsertRowid, req.user.id, 'admin');
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(result.lastInsertRowid);
  res.json(group);
});

// Join by invite code — must be before /:id routes
router.post('/join', auth, (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code erforderlich' });
  const group = db.prepare('SELECT * FROM groups WHERE invite_code = ?').get(code.toUpperCase().trim());
  if (!group) return res.status(404).json({ error: 'Ungültiger Einladungscode' });
  const exists = db.prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?').get(group.id, req.user.id);
  if (exists) return res.status(409).json({ error: 'Du bist bereits Mitglied dieser Gruppe' });
  db.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').run(group.id, req.user.id, 'member');
  res.json({ success: true, group });
});

router.get('/:id', auth, (req, res) => {
  const member = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!member) return res.status(403).json({ error: 'Kein Zugriff' });
  const group = db.prepare('SELECT g.*, u.username as creator_name FROM groups g LEFT JOIN users u ON g.created_by = u.id WHERE g.id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Nicht gefunden' });
  res.json(group);
});

router.put('/:id', auth, (req, res) => {
  const member = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ? AND role = ?').get(req.params.id, req.user.id, 'admin');
  if (!member) return res.status(403).json({ error: 'Nur Admins können bearbeiten' });
  const { name, description, type } = req.body;
  db.prepare('UPDATE groups SET name = ?, description = ?, type = ? WHERE id = ?').run(name, description, type, req.params.id);
  res.json(db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id));
});

router.delete('/:id', auth, (req, res) => {
  const member = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ? AND role = ?').get(req.params.id, req.user.id, 'admin');
  if (!member) return res.status(403).json({ error: 'Nur Admins können löschen' });
  db.prepare('DELETE FROM groups WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Regenerate invite code
router.post('/:id/regenerate-code', auth, (req, res) => {
  const admin = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ? AND role = ?').get(req.params.id, req.user.id, 'admin');
  if (!admin) return res.status(403).json({ error: 'Nur Admins können den Code erneuern' });
  const newCode = generateCode();
  db.prepare('UPDATE groups SET invite_code = ? WHERE id = ?').run(newCode, req.params.id);
  res.json({ invite_code: newCode });
});

router.get('/:id/members', auth, (req, res) => {
  const member = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!member) return res.status(403).json({ error: 'Kein Zugriff' });
  const members = db.prepare(`
    SELECT u.id, u.username, u.email, u.avatar, gm.role, gm.joined_at
    FROM group_members gm JOIN users u ON gm.user_id = u.id
    WHERE gm.group_id = ? ORDER BY gm.role DESC, u.username ASC
  `).all(req.params.id);
  res.json(members);
});

router.post('/:id/members', auth, (req, res) => {
  const admin = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ? AND role = ?').get(req.params.id, req.user.id, 'admin');
  if (!admin) return res.status(403).json({ error: 'Nur Admins können einladen' });
  const { email } = req.body;
  const targetUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (!targetUser) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
  const exists = db.prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?').get(req.params.id, targetUser.id);
  if (exists) return res.status(409).json({ error: 'Bereits Mitglied' });
  db.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').run(req.params.id, targetUser.id, 'member');
  res.json({ success: true });
});

router.delete('/:id/members/:userId', auth, (req, res) => {
  const admin = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ? AND role = ?').get(req.params.id, req.user.id, 'admin');
  const isSelf = parseInt(req.params.userId) === req.user.id;
  if (!admin && !isSelf) return res.status(403).json({ error: 'Kein Recht' });
  db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(req.params.id, req.params.userId);
  res.json({ success: true });
});

// ── ROLLE ÄNDERN (nur Admin) ──────────────────────────────────────────────────
router.patch('/:id/members/:userId/role', auth, (req, res) => {
  const admin = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ? AND role = ?').get(req.params.id, req.user.id, 'admin');
  if (!admin) return res.status(403).json({ error: 'Nur Admins können Rollen ändern' });
  if (parseInt(req.params.userId) === req.user.id) return res.status(400).json({ error: 'Eigene Rolle kann nicht geändert werden' });
  const { role } = req.body;
  if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Ungültige Rolle' });
  db.prepare('UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?').run(role, req.params.id, req.params.userId);
  res.json({ success: true });
});

// ── CHAT: Nachrichten laden ───────────────────────────────────────────────────
router.get('/:id/chat', auth, (req, res) => {
  const member = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!member) return res.status(403).json({ error: 'Kein Zugriff' });
  const messages = db.prepare(`
    SELECT gm.*, u.username, u.avatar
    FROM group_messages gm JOIN users u ON gm.user_id = u.id
    WHERE gm.group_id = ?
    ORDER BY gm.created_at ASC LIMIT 200
  `).all(req.params.id);
  res.json(messages);
});

// ── CHAT: Nachricht senden ────────────────────────────────────────────────────
router.post('/:id/chat', auth, (req, res) => {
  const member = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!member) return res.status(403).json({ error: 'Kein Zugriff' });
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Nachricht erforderlich' });
  const result = db.prepare('INSERT INTO group_messages (group_id, user_id, content) VALUES (?, ?, ?)').run(req.params.id, req.user.id, content.trim());
  const message = db.prepare('SELECT gm.*, u.username, u.avatar FROM group_messages gm JOIN users u ON gm.user_id = u.id WHERE gm.id = ?').get(result.lastInsertRowid);
  res.json(message);
});

module.exports = router;
