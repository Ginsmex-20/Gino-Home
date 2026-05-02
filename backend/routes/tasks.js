const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, (req, res) => {
  const { group_id, type, status } = req.query;
  let query = `
    SELECT t.*,
      u.username as assignee_name, u.avatar as assignee_avatar,
      c.username as creator_name, g.name as group_name
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    LEFT JOIN users c ON t.created_by = c.id
    LEFT JOIN groups g ON t.group_id = g.id
    WHERE (t.created_by = ? OR t.group_id IN (
      SELECT group_id FROM group_members WHERE user_id = ?
    ))
  `;
  const params = [req.user.id, req.user.id];
  if (group_id) { query += ' AND t.group_id = ?'; params.push(group_id); }
  if (type) { query += ' AND t.type = ?'; params.push(type); }
  if (status) { query += ' AND t.status = ?'; params.push(status); }
  query += ' ORDER BY t.created_at DESC';
  // Auto-archive: tasks marked done for more than 24 hours
  db.prepare(`UPDATE tasks SET status = 'archiv' WHERE status = 'done' AND done_at IS NOT NULL AND done_at < datetime('now', '-24 hours')`).run();
  res.json(db.prepare(query).all(...params));
});

router.post('/', auth, (req, res) => {
  const { title, description, status, priority, type, due_date, assignee_id, group_id, budget, notes } = req.body;
  if (!title) return res.status(400).json({ error: 'Titel erforderlich' });
  const result = db.prepare(`
    INSERT INTO tasks (title, description, status, priority, type, due_date, assignee_id, group_id, budget, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, description || null, status || 'todo', priority || 'medium', type || 'general',
    due_date || null, assignee_id || null, group_id || null, budget || 0, notes || null, req.user.id);
  const task = db.prepare(`
    SELECT t.*, u.username as assignee_name, u.avatar as assignee_avatar, c.username as creator_name, g.name as group_name
    FROM tasks t LEFT JOIN users u ON t.assignee_id = u.id LEFT JOIN users c ON t.created_by = c.id LEFT JOIN groups g ON t.group_id = g.id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);
  res.json(task);
});

router.put('/:id', auth, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Nicht gefunden' });
  const { title, description, status, priority, type, due_date, assignee_id, group_id, budget, notes } = req.body;
  db.prepare(`
    UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, type = ?, due_date = ?,
    assignee_id = ?, group_id = ?, budget = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(title, description || null, status, priority, type, due_date || null,
    assignee_id || null, group_id || null, budget || 0, notes || null, req.params.id);
  const updated = db.prepare(`
    SELECT t.*, u.username as assignee_name, u.avatar as assignee_avatar, c.username as creator_name, g.name as group_name
    FROM tasks t LEFT JOIN users u ON t.assignee_id = u.id LEFT JOIN users c ON t.created_by = c.id LEFT JOIN groups g ON t.group_id = g.id
    WHERE t.id = ?
  `).get(req.params.id);
  res.json(updated);
});

router.patch('/:id/status', auth, (req, res) => {
  const { status } = req.body;
  if (status === 'done') {
    db.prepare('UPDATE tasks SET status = ?, done_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
  } else {
    db.prepare('UPDATE tasks SET status = ?, done_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
  }
  res.json({ success: true });
});

router.delete('/:id', auth, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Nicht gefunden' });
  if (task.created_by !== req.user.id) return res.status(403).json({ error: 'Kein Recht' });
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
