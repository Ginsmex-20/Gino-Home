const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadsPath } = require('../config');
const nc = require('../nextcloud');

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
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } }); // 500 MB

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

// ── Unterkategorien (pro Oberkategorie) ──────────────────────────────────────
router.get('/subcategories', auth, (req, res) => {
  const { group_id, parent_category } = req.query;
  let q, params;
  if (group_id) {
    q = 'SELECT * FROM document_subcategories WHERE group_id = ?';
    params = [group_id];
  } else {
    q = 'SELECT * FROM document_subcategories WHERE created_by = ? AND group_id IS NULL';
    params = [req.user.id];
  }
  if (parent_category) { q += ' AND parent_category = ?'; params.push(parent_category); }
  q += ' ORDER BY name';
  res.json(db.prepare(q).all(...params));
});

router.post('/subcategories', auth, (req, res) => {
  const { name, parent_category, group_id } = req.body;
  if (!name || !parent_category) return res.status(400).json({ error: 'Name und Oberkategorie erforderlich' });
  try {
    const result = db.prepare('INSERT INTO document_subcategories (name, parent_category, created_by, group_id) VALUES (?, ?, ?, ?)').run(name.trim(), parent_category, req.user.id, group_id || null);
    res.json(db.prepare('SELECT * FROM document_subcategories WHERE id = ?').get(result.lastInsertRowid));
  } catch { res.status(409).json({ error: 'Unterkategorie existiert bereits' }); }
});

router.delete('/subcategories/:id', auth, (req, res) => {
  db.prepare('DELETE FROM document_subcategories WHERE id = ? AND created_by = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

// ── Dokumente ────────────────────────────────────────────────────────────────
router.get('/', auth, (req, res) => {
  const { group_id, category } = req.query;
  let query, params;
  if (group_id) {
    // Gruppe: alle Dokumente der Gruppe
    query = `SELECT d.*, u.username as uploader_name FROM documents d LEFT JOIN users u ON d.uploaded_by = u.id WHERE d.group_id = ?`;
    params = [group_id];
  } else {
    // Persönlich: nur eigene Dokumente ohne Gruppe
    query = `SELECT d.*, u.username as uploader_name FROM documents d LEFT JOIN users u ON d.uploaded_by = u.id WHERE d.uploaded_by = ? AND d.group_id IS NULL`;
    params = [req.user.id];
  }
  if (category) { query += ' AND d.category = ?'; params.push(category); }
  const { subcategory } = req.query;
  if (subcategory) { query += ' AND d.subcategory = ?'; params.push(subcategory); }
  query += ' ORDER BY d.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/upload', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei' });
  const { title, category, description, group_id, subcategory } = req.body;
  const filepath = `/uploads/documents/${req.file.filename}`;

  // ── Nextcloud-Sync ──────────────────────────────────────────────────────────
  let nc_path = null;
  if (nc.enabled()) {
    try {
      const groupName = group_id
        ? db.prepare('SELECT name FROM groups WHERE id = ?').get(group_id)?.name
        : null;
      const dir = nc.buildDocumentDir({ category: category || 'other', subcategory, groupName });
      await nc.mkdirAll(dir);
      // Originalname in Nextcloud für Lesbarkeit, aber ohne Duplikat-Risiko
      const ncFilename = req.file.originalname;
      nc_path = dir + '/' + ncFilename;
      const localPath = path.join(uploadsPath, 'documents', req.file.filename);
      await nc.uploadFile(localPath, nc_path);
      console.log('[Nextcloud] Hochgeladen:', nc_path);
    } catch (e) {
      console.error('[Nextcloud] Upload fehlgeschlagen:', e.message);
      nc_path = null; // Nicht blockieren wenn Nextcloud nicht erreichbar
    }
  }

  const result = db.prepare(
    'INSERT INTO documents (title, filename, filepath, size, mimetype, category, subcategory, description, group_id, nc_path, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    title || req.file.originalname,
    req.file.originalname,
    filepath,
    req.file.size,
    req.file.mimetype,
    category || 'other',
    subcategory || null,
    description,
    group_id || null,
    nc_path,
    req.user.id
  );
  res.json(db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid));
});

// ── In Gruppe kopieren ────────────────────────────────────────────────────────
router.post('/copy-to-group', auth, (req, res) => {
  const { doc_ids, group_id } = req.body;
  if (!doc_ids?.length || !group_id) return res.status(400).json({ error: 'doc_ids und group_id erforderlich' });

  // Benutzer muss Mitglied der Zielgruppe sein
  const member = db.prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?').get(group_id, req.user.id);
  if (!member) return res.status(403).json({ error: 'Kein Zugriff auf diese Gruppe' });

  const copied = [];
  for (const id of doc_ids) {
    const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND uploaded_by = ? AND group_id IS NULL').get(id, req.user.id);
    if (!doc) continue;

    // Ensure subcategory exists in target group (for custom subcategories)
    if (doc.subcategory && doc.category) {
      const subExists = db.prepare('SELECT id FROM document_subcategories WHERE name = ? AND parent_category = ? AND group_id = ?')
        .get(doc.subcategory, doc.category, group_id);
      if (!subExists) {
        try {
          db.prepare('INSERT INTO document_subcategories (name, parent_category, created_by, group_id) VALUES (?, ?, ?, ?)')
            .run(doc.subcategory, doc.category, req.user.id, group_id);
        } catch {}
      }
    }

    const exists = db.prepare('SELECT id FROM documents WHERE group_id = ? AND filename = ? AND uploaded_by = ?')
      .get(group_id, doc.filename, req.user.id);
    if (exists) { copied.push({ id: exists.id, skipped: true }); continue; }

    const result = db.prepare(
      'INSERT INTO documents (title, filename, filepath, size, mimetype, category, subcategory, description, group_id, nc_path, uploaded_by, importance, starred) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(doc.title, doc.filename, doc.filepath, doc.size, doc.mimetype, doc.category, doc.subcategory, doc.description, group_id, doc.nc_path, req.user.id, doc.importance || 'normal', doc.starred || 0);
    copied.push({ id: result.lastInsertRowid, skipped: false });
  }
  res.json({ success: true, copied });
});

router.patch('/:id/star', auth, (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND uploaded_by = ?').get(req.params.id, req.user.id);
  if (!doc) return res.status(404).json({ error: 'Nicht gefunden' });
  db.prepare('UPDATE documents SET starred = ? WHERE id = ?').run(doc.starred ? 0 : 1, req.params.id);
  res.json({ starred: !doc.starred });
});

router.patch('/:id/importance', auth, (req, res) => {
  const { importance } = req.body;
  db.prepare('UPDATE documents SET importance = ? WHERE id = ?').run(importance, req.params.id);
  res.json({ success: true });
});

router.put('/:id', auth, (req, res) => {
  const { title, category, description, subcategory, importance, starred } = req.body;
  db.prepare('UPDATE documents SET title = ?, category = ?, subcategory = ?, description = ?, importance = ?, starred = ? WHERE id = ? AND uploaded_by = ?')
    .run(title, category, subcategory || null, description, importance || 'normal', starred ? 1 : 0, req.params.id, req.user.id);
  res.json(db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id));
});

router.delete('/:id', auth, async (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND uploaded_by = ?').get(req.params.id, req.user.id);
  if (!doc) return res.status(404).json({ error: 'Nicht gefunden' });

  // Lokale Datei löschen
  const filename = path.basename(doc.filepath);
  const fullPath = path.join(uploadsPath, 'documents', filename);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

  // Nextcloud-Datei löschen
  if (doc.nc_path) {
    try {
      await nc.deleteFile(doc.nc_path);
      console.log('[Nextcloud] Gelöscht:', doc.nc_path);
    } catch (e) {
      console.error('[Nextcloud] Delete fehlgeschlagen:', e.message);
    }
  }

  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
