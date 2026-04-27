const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadsPath } = require('../config');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(uploadsPath, 'documents');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// ── Kategorien ──────────────────────────────────────────────────────────────
router.get('/categories', auth, (req, res) => {
  const { group_id } = req.query;
  const cats = group_id
    ? db.prepare('SELECT * FROM document_categories WHERE group_id = ? ORDER BY name').all(group_id)
    : db.prepare('SELECT * FROM document_categories WHERE created_by = ? AND group_id IS NULL ORDER BY name').all(req.user.id);
  res.json(cats);
});

router.post('/categories', auth, (req, res) => {
  const { name, icon, color, group_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Name erforderlich' });
  try {
    const result = db.prepare('INSERT INTO document_categories (name, icon, color, created_by, group_id) VALUES (?, ?, ?, ?, ?)').run(name, icon || '📁', color || '#f97316', req.user.id, group_id || null);
    res.json(db.prepare('SELECT * FROM document_categories WHERE id = ?').get(result.lastInsertRowid));
  } catch { res.status(409).json({ error: 'Kategorie existiert bereits' }); }
});

router.delete('/categories/:id', auth, (req, res) => {
  db.prepare('DELETE FROM document_categories WHERE id = ? AND created_by = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

// ── Dokumente ────────────────────────────────────────────────────────────────
router.get('/', auth, (req, res) => {
  const { group_id, category } = req.query;
  let query, params;
  if (group_id) {
    // Gruppe: alle Dokumente der Gruppe sehen
    query = `SELECT d.*, u.username as uploader_name FROM documents d LEFT JOIN users u ON d.uploaded_by = u.id WHERE d.group_id = ?`;
    params = [group_id];
  } else {
    // Persönlich: nur eigene Dokumente
    query = `SELECT d.*, u.username as uploader_name FROM documents d LEFT JOIN users u ON d.uploaded_by = u.id WHERE d.uploaded_by = ? AND d.group_id IS NULL`;
    params = [req.user.id];
  }
  if (category) { query += ' AND d.category = ?'; params.push(category); }
  query += ' ORDER BY d.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/upload', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei' });
  const { title, category, description, group_id } = req.body;
  const filepath = `/uploads/documents/${req.file.filename}`;
  const result = db.prepare('INSERT INTO documents (title, filename, filepath, size, mimetype, category, description, group_id, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    title || req.file.originalname, req.file.originalname, filepath, req.file.size, req.file.mimetype, category || 'other', description, group_id, req.user.id
  );
  res.json(db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', auth, (req, res) => {
  const { title, category, description } = req.body;
  db.prepare('UPDATE documents SET title = ?, category = ?, description = ? WHERE id = ? AND uploaded_by = ?').run(title, category, description, req.params.id, req.user.id);
  res.json(db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id));
});

router.delete('/:id', auth, (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND uploaded_by = ?').get(req.params.id, req.user.id);
  if (!doc) return res.status(404).json({ error: 'Nicht gefunden' });
  // Datei vom korrekten Upload-Pfad (Volume) löschen
  const filename = path.basename(doc.filepath);
  const fullPath = path.join(uploadsPath, 'documents', filename);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
