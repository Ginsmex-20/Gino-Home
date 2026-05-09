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
  const attachCountSub = `(SELECT COUNT(*) FROM document_attachments WHERE document_id = d.id) as attachment_count`;
  if (group_id) {
    query = `SELECT d.*, u.username as uploader_name, ${attachCountSub} FROM documents d LEFT JOIN users u ON d.uploaded_by = u.id WHERE d.group_id = ?`;
    params = [group_id];
  } else {
    query = `SELECT d.*, u.username as uploader_name, ${attachCountSub} FROM documents d LEFT JOIN users u ON d.uploaded_by = u.id WHERE d.uploaded_by = ? AND d.group_id IS NULL`;
    params = [req.user.id];
  }
  if (category) { query += ' AND d.category = ?'; params.push(category); }
  const { subcategory } = req.query;
  if (subcategory) { query += ' AND d.subcategory = ?'; params.push(subcategory); }
  query += ' ORDER BY d.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

// ── Anhänge ──────────────────────────────────────────────────────────────────
router.get('/:id/attachments', auth, (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Dokument nicht gefunden' });
  const list = db.prepare('SELECT * FROM document_attachments WHERE document_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json(list);
});

router.post('/:id/attachments', auth, upload.array('files', 20), async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'Keine Dateien' });
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Dokument nicht gefunden' });

  const groupName = doc.group_id ? db.prepare('SELECT name FROM groups WHERE id = ?').get(doc.group_id)?.name : null;
  const inserted = [];

  for (const file of req.files) {
    const filepath = `/uploads/documents/${file.filename}`;
    let nc_path = null;
    if (nc.enabled()) {
      try {
        const dir = nc.buildDocumentDir({ category: doc.category || 'other', subcategory: doc.subcategory, groupName });
        await nc.mkdirAll(dir);
        nc_path = dir + '/' + file.originalname;
        const localPath = path.join(uploadsPath, 'documents', file.filename);
        await nc.uploadFile(localPath, nc_path);
      } catch (e) { console.error('[Nextcloud] Anhang fehlgeschlagen:', e.message); nc_path = null; }
    }
    const result = db.prepare(
      'INSERT INTO document_attachments (document_id, filename, filepath, size, mimetype, nc_path, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(req.params.id, file.originalname, filepath, file.size, file.mimetype, nc_path, req.user.id);
    inserted.push(db.prepare('SELECT * FROM document_attachments WHERE id = ?').get(result.lastInsertRowid));
  }
  res.json(inserted);
});

router.delete('/attachments/:attachmentId', auth, async (req, res) => {
  const att = db.prepare('SELECT a.*, d.uploaded_by as doc_owner FROM document_attachments a JOIN documents d ON a.document_id = d.id WHERE a.id = ?').get(req.params.attachmentId);
  if (!att) return res.status(404).json({ error: 'Anhang nicht gefunden' });
  if (att.doc_owner !== req.user.id) return res.status(403).json({ error: 'Kein Zugriff' });

  const filename = path.basename(att.filepath);
  const fullPath = path.join(uploadsPath, 'documents', filename);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  if (att.nc_path) { try { await nc.deleteFile(att.nc_path); } catch (e) { console.error('[Nextcloud] Anhang-Löschen fehlgeschlagen:', e.message); } }

  db.prepare('DELETE FROM document_attachments WHERE id = ?').run(req.params.attachmentId);
  res.json({ success: true });
});

router.post('/upload', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei' });
  const { title, category, description, group_id, subcategory, due_date, paid, amount } = req.body;
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
    'INSERT INTO documents (title, filename, filepath, size, mimetype, category, subcategory, description, group_id, nc_path, uploaded_by, due_date, paid, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
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
    req.user.id,
    due_date || null,
    paid ? 1 : 0,
    amount ? Number(amount) : null
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

router.patch('/:id/paid', auth, (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Nicht gefunden' });
  db.prepare('UPDATE documents SET paid = ? WHERE id = ?').run(doc.paid ? 0 : 1, req.params.id);
  res.json({ paid: !doc.paid });
});

router.put('/:id', auth, (req, res) => {
  const { title, category, description, subcategory, importance, starred, due_date, paid, amount } = req.body;
  db.prepare('UPDATE documents SET title = ?, category = ?, subcategory = ?, description = ?, importance = ?, starred = ?, due_date = ?, paid = ?, amount = ? WHERE id = ? AND uploaded_by = ?')
    .run(title, category, subcategory || null, description, importance || 'normal', starred ? 1 : 0, due_date || null, paid ? 1 : 0, amount !== undefined && amount !== '' ? Number(amount) : null, req.params.id, req.user.id);
  res.json(db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id));
});

// ── Cross-Category-Verknüpfung ────────────────────────────────────────────────
// Vertrag aus Dokument erstellen (oder verknüpfen)
router.post('/:id/link-contract', auth, (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND uploaded_by = ?').get(req.params.id, req.user.id);
  if (!doc) return res.status(404).json({ error: 'Dokument nicht gefunden' });
  if (doc.linked_type) return res.status(409).json({ error: 'Dokument ist bereits verknüpft' });

  const c = req.body || {};
  const result = db.prepare(
    'INSERT INTO contracts (title, company, contract_type, contract_number, customer_number, purpose, amount, billing_cycle, start_date, end_date, cancel_notice_months, cancel_until, auto_renew, status, notes, document_id, group_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    c.title || doc.title,
    c.company || null, c.contract_type || 'other',
    c.contract_number || null, c.customer_number || null, c.purpose || null,
    Number(c.amount || doc.amount || 0), c.billing_cycle || 'monthly',
    c.start_date || null, c.end_date || null,
    Number(c.cancel_notice_months || 1), c.cancel_until || null,
    c.auto_renew ? 1 : 0, c.status || 'active',
    c.notes || null,
    doc.id,
    doc.group_id || null,
    req.user.id
  );
  db.prepare('UPDATE documents SET linked_type = ?, linked_id = ? WHERE id = ?')
    .run('contract', result.lastInsertRowid, doc.id);
  res.json({ success: true, contract_id: result.lastInsertRowid, document: db.prepare('SELECT * FROM documents WHERE id = ?').get(doc.id) });
});

// Ratenzahlung/Schulden aus Dokument erstellen
router.post('/:id/link-loan', auth, (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND uploaded_by = ?').get(req.params.id, req.user.id);
  if (!doc) return res.status(404).json({ error: 'Dokument nicht gefunden' });
  if (doc.linked_type) return res.status(409).json({ error: 'Dokument ist bereits verknüpft' });

  const l = req.body || {};
  const result = db.prepare(
    'INSERT INTO loans (title, lender, creditor, type, total_amount, remaining_amount, monthly_rate, interest_rate, reference_number, customer_number, purpose, start_date, end_date, status, notes, document_id, group_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    l.title || doc.title,
    l.lender || null, l.creditor || null, l.type || 'loan',
    Number(l.total_amount || doc.amount || 0),
    l.remaining_amount !== undefined && l.remaining_amount !== '' ? Number(l.remaining_amount) : Number(doc.amount || 0),
    Number(l.monthly_rate || 0), Number(l.interest_rate || 0),
    l.reference_number || null, l.customer_number || null, l.purpose || null,
    l.start_date || null, l.end_date || null,
    l.status || 'active', l.notes || null,
    doc.id, doc.group_id || null, req.user.id
  );
  db.prepare('UPDATE documents SET linked_type = ?, linked_id = ? WHERE id = ?')
    .run('loan', result.lastInsertRowid, doc.id);
  res.json({ success: true, loan_id: result.lastInsertRowid, document: db.prepare('SELECT * FROM documents WHERE id = ?').get(doc.id) });
});

// Verknüpfung lösen (löscht NICHT den verknüpften Eintrag)
router.delete('/:id/link', auth, (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND uploaded_by = ?').get(req.params.id, req.user.id);
  if (!doc) return res.status(404).json({ error: 'Dokument nicht gefunden' });
  db.prepare('UPDATE documents SET linked_type = NULL, linked_id = NULL WHERE id = ?').run(doc.id);
  res.json({ success: true });
});

router.delete('/:id', auth, async (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND uploaded_by = ?').get(req.params.id, req.user.id);
  if (!doc) return res.status(404).json({ error: 'Nicht gefunden' });

  // Anhänge mitlöschen (lokal + Nextcloud)
  const attachments = db.prepare('SELECT * FROM document_attachments WHERE document_id = ?').all(req.params.id);
  for (const att of attachments) {
    const aFilename = path.basename(att.filepath);
    const aPath = path.join(uploadsPath, 'documents', aFilename);
    if (fs.existsSync(aPath)) fs.unlinkSync(aPath);
    if (att.nc_path) { try { await nc.deleteFile(att.nc_path); } catch {} }
  }

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
