const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, (req, res) => {
  const { group_id, from, to } = req.query;
  let query = `
    SELECT e.*, u.username as creator_name, g.name as group_name
    FROM calendar_events e
    LEFT JOIN users u ON e.created_by = u.id
    LEFT JOIN groups g ON e.group_id = g.id
    WHERE (e.created_by = ? OR e.group_id IN (SELECT group_id FROM group_members WHERE user_id = ?))
  `;
  const params = [req.user.id, req.user.id];
  if (group_id) { query += ' AND e.group_id = ?'; params.push(group_id); }
  if (from) { query += ' AND e.start_date >= ?'; params.push(from); }
  if (to) { query += ' AND e.start_date <= ?'; params.push(to); }
  query += ' ORDER BY e.start_date ASC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', auth, (req, res) => {
  const { title, description, start_date, end_date, all_day, color, group_id, task_id } = req.body;
  if (!title || !start_date) return res.status(400).json({ error: 'Titel und Startdatum erforderlich' });
  const result = db.prepare('INSERT INTO calendar_events (title, description, start_date, end_date, all_day, color, group_id, created_by, task_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(title, description, start_date, end_date, all_day ? 1 : 0, color || '#7c3aed', group_id, req.user.id, task_id);
  res.json(db.prepare('SELECT e.*, u.username as creator_name FROM calendar_events e LEFT JOIN users u ON e.created_by = u.id WHERE e.id = ?').get(result.lastInsertRowid));
});

router.put('/:id', auth, (req, res) => {
  const { title, description, start_date, end_date, all_day, color, group_id } = req.body;
  db.prepare('UPDATE calendar_events SET title = ?, description = ?, start_date = ?, end_date = ?, all_day = ?, color = ?, group_id = ? WHERE id = ? AND created_by = ?').run(title, description, start_date, end_date, all_day ? 1 : 0, color, group_id, req.params.id, req.user.id);
  res.json(db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(req.params.id));
});

router.delete('/:id', auth, (req, res) => {
  db.prepare('DELETE FROM calendar_events WHERE id = ? AND created_by = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

module.exports = router;
