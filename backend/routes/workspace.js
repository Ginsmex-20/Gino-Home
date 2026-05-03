const router = require('express').Router();
const db     = require('../db');
const auth   = require('../middleware/auth');

// ── Sections ──────────────────────────────────────────────────────────────────

// Alle Sections (für User oder Gruppe)
router.get('/sections', auth, (req, res) => {
  const { group_id } = req.query;
  const sections = group_id
    ? db.prepare('SELECT * FROM workspace_sections WHERE group_id = ? ORDER BY sort_order, id').all(group_id)
    : db.prepare('SELECT * FROM workspace_sections WHERE user_id = ? AND group_id IS NULL ORDER BY sort_order, id').all(req.user.id);
  res.json(sections);
});

// Neue Section erstellen
router.post('/sections', auth, (req, res) => {
  const { title, icon = '📂', color = '#f97316', parent_id, group_id } = req.body;
  if (!title) return res.status(400).json({ error: 'Titel erforderlich' });
  const result = db.prepare(
    'INSERT INTO workspace_sections (title, icon, color, parent_id, user_id, group_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(title, icon, color, parent_id || null, req.user.id, group_id || null);
  res.json(db.prepare('SELECT * FROM workspace_sections WHERE id = ?').get(result.lastInsertRowid));
});

// Section umbenennen / Icon ändern
router.put('/sections/:id', auth, (req, res) => {
  const { title, icon, color } = req.body;
  db.prepare('UPDATE workspace_sections SET title = ?, icon = ?, color = ? WHERE id = ?')
    .run(title, icon || '📂', color || '#f97316', req.params.id);
  res.json(db.prepare('SELECT * FROM workspace_sections WHERE id = ?').get(req.params.id));
});

// Section löschen (inkl. aller Unterordner & Items per CASCADE)
router.delete('/sections/:id', auth, (req, res) => {
  db.prepare('DELETE FROM workspace_sections WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── Items (Notizen & Links) ───────────────────────────────────────────────────

// Alle Items einer Section
router.get('/sections/:id/items', auth, (req, res) => {
  const items = db.prepare(
    'SELECT i.*, u.username as author FROM workspace_items i LEFT JOIN users u ON i.created_by = u.id WHERE i.section_id = ? ORDER BY i.created_at DESC'
  ).all(req.params.id);
  res.json(items);
});

// Neues Item (note oder link)
router.post('/sections/:id/items', auth, (req, res) => {
  const { type, title, content, url } = req.body;
  if (!title) return res.status(400).json({ error: 'Titel erforderlich' });
  const result = db.prepare(
    'INSERT INTO workspace_items (section_id, type, title, content, url, created_by) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.params.id, type || 'note', title, content || null, url || null, req.user.id);
  const item = db.prepare(
    'SELECT i.*, u.username as author FROM workspace_items i LEFT JOIN users u ON i.created_by = u.id WHERE i.id = ?'
  ).get(result.lastInsertRowid);
  res.json(item);
});

// Item bearbeiten
router.put('/items/:id', auth, (req, res) => {
  const { title, content, url } = req.body;
  db.prepare('UPDATE workspace_items SET title = ?, content = ?, url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(title, content || null, url || null, req.params.id);
  const item = db.prepare(
    'SELECT i.*, u.username as author FROM workspace_items i LEFT JOIN users u ON i.created_by = u.id WHERE i.id = ?'
  ).get(req.params.id);
  res.json(item);
});

// Item löschen
router.delete('/items/:id', auth, (req, res) => {
  db.prepare('DELETE FROM workspace_items WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
