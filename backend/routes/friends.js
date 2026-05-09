const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

/* ════════════════════════════════════════════════════════════════════
   FRIENDS — Freundschaftssystem
   ════════════════════════════════════════════════════════════════════ */

// Liste: alle akzeptierten Freunde + ausstehende Anfragen
router.get('/', auth, (req, res) => {
  const uid = req.user.id;

  // Akzeptierte (egal wer angefragt hat)
  const accepted = db.prepare(`
    SELECT f.id, f.created_at, f.accepted_at,
           u.id as user_id, u.username, u.email, u.avatar
    FROM friendships f
    JOIN users u ON u.id = CASE WHEN f.requester_id = ? THEN f.recipient_id ELSE f.requester_id END
    WHERE (f.requester_id = ? OR f.recipient_id = ?) AND f.status = 'accepted'
    ORDER BY u.username
  `).all(uid, uid, uid);

  // Ausstehende eingehende Anfragen (jemand anderes hat angefragt)
  const incoming = db.prepare(`
    SELECT f.id, f.created_at,
           u.id as user_id, u.username, u.email, u.avatar
    FROM friendships f
    JOIN users u ON u.id = f.requester_id
    WHERE f.recipient_id = ? AND f.status = 'pending'
    ORDER BY f.created_at DESC
  `).all(uid);

  // Eigene gesendete Anfragen
  const outgoing = db.prepare(`
    SELECT f.id, f.created_at,
           u.id as user_id, u.username, u.email, u.avatar
    FROM friendships f
    JOIN users u ON u.id = f.recipient_id
    WHERE f.requester_id = ? AND f.status = 'pending'
    ORDER BY f.created_at DESC
  `).all(uid);

  res.json({ accepted, incoming, outgoing });
});

// Anfrage senden (per E-Mail oder Username)
router.post('/request', auth, (req, res) => {
  const { query } = req.body || {};
  if (!query) return res.status(400).json({ error: 'E-Mail oder Username erforderlich' });

  const target = db.prepare('SELECT id, username, email FROM users WHERE email = ? OR username = ?').get(query.trim(), query.trim());
  if (!target) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'Du kannst dir nicht selbst eine Anfrage senden' });

  const existing = db.prepare(`
    SELECT * FROM friendships
    WHERE (requester_id = ? AND recipient_id = ?) OR (requester_id = ? AND recipient_id = ?)
  `).get(req.user.id, target.id, target.id, req.user.id);

  if (existing) {
    if (existing.status === 'accepted') return res.status(409).json({ error: 'Ihr seid bereits befreundet' });
    if (existing.requester_id === req.user.id) return res.status(409).json({ error: 'Anfrage bereits gesendet' });
    // Andere Person hat MIR schon eine Anfrage gesendet → akzeptieren!
    db.prepare('UPDATE friendships SET status = ?, accepted_at = CURRENT_TIMESTAMP WHERE id = ?').run('accepted', existing.id);
    return res.json({ success: true, accepted: true });
  }

  const result = db.prepare('INSERT INTO friendships (requester_id, recipient_id, status) VALUES (?, ?, ?)').run(req.user.id, target.id, 'pending');
  res.json({ success: true, id: result.lastInsertRowid });
});

// Anfrage akzeptieren
router.post('/:id/accept', auth, (req, res) => {
  const f = db.prepare('SELECT * FROM friendships WHERE id = ? AND recipient_id = ? AND status = ?').get(req.params.id, req.user.id, 'pending');
  if (!f) return res.status(404).json({ error: 'Anfrage nicht gefunden' });
  db.prepare('UPDATE friendships SET status = ?, accepted_at = CURRENT_TIMESTAMP WHERE id = ?').run('accepted', f.id);
  res.json({ success: true });
});

// Anfrage ablehnen / Freundschaft beenden (löscht den Eintrag)
router.delete('/:id', auth, (req, res) => {
  const f = db.prepare('SELECT * FROM friendships WHERE id = ? AND (requester_id = ? OR recipient_id = ?)').get(req.params.id, req.user.id, req.user.id);
  if (!f) return res.status(404).json({ error: 'Nicht gefunden' });
  // Alle Shares mit dieser Person löschen
  const otherId = f.requester_id === req.user.id ? f.recipient_id : f.requester_id;
  db.prepare('DELETE FROM friend_shares WHERE (owner_id = ? AND friend_id = ?) OR (owner_id = ? AND friend_id = ?)')
    .run(req.user.id, otherId, otherId, req.user.id);
  db.prepare('DELETE FROM friendships WHERE id = ?').run(f.id);
  res.json({ success: true });
});

/* ════════════════════════════════════════════════════════════════════
   SHARES — Pro-Eintrag-Freigabe an Freunde
   ════════════════════════════════════════════════════════════════════ */

// Helper: prüft ob A und B befreundet sind
function areFriends(a, b) {
  return !!db.prepare(`
    SELECT 1 FROM friendships
    WHERE status = 'accepted' AND (
      (requester_id = ? AND recipient_id = ?) OR
      (requester_id = ? AND recipient_id = ?)
    )
  `).get(a, b, b, a);
}

// Eintrag mit Freund teilen
router.post('/share', auth, (req, res) => {
  const { friend_id, resource_type, resource_id } = req.body || {};
  if (!friend_id || !resource_type || !resource_id) return res.status(400).json({ error: 'friend_id, resource_type, resource_id erforderlich' });
  if (!areFriends(req.user.id, friend_id)) return res.status(403).json({ error: 'Nicht befreundet' });

  // Owner-Check je Resource-Type (vereinfachte Version)
  const ownerColumns = {
    document: 'uploaded_by', task: 'created_by', contract: 'created_by',
    loan: 'created_by', finance_item: 'created_by', calendar_event: 'created_by',
    vault_entry: 'user_id',
  };
  const tables = {
    document: 'documents', task: 'tasks', contract: 'contracts',
    loan: 'loans', finance_item: 'finance_items', calendar_event: 'calendar_events',
    vault_entry: 'vault_entries',
  };
  const table = tables[resource_type], col = ownerColumns[resource_type];
  if (!table || !col) return res.status(400).json({ error: 'Unbekannter resource_type' });

  const owned = db.prepare(`SELECT id FROM ${table} WHERE id = ? AND ${col} = ?`).get(resource_id, req.user.id);
  if (!owned) return res.status(403).json({ error: 'Nicht dein Eintrag' });

  try {
    db.prepare('INSERT INTO friend_shares (owner_id, friend_id, resource_type, resource_id) VALUES (?, ?, ?, ?)')
      .run(req.user.id, friend_id, resource_type, resource_id);
    res.json({ success: true });
  } catch {
    res.status(409).json({ error: 'Bereits geteilt' });
  }
});

// Freigabe entfernen
router.delete('/share', auth, (req, res) => {
  const { friend_id, resource_type, resource_id } = req.body || {};
  if (!friend_id || !resource_type || !resource_id) return res.status(400).json({ error: 'Parameter fehlen' });
  db.prepare('DELETE FROM friend_shares WHERE owner_id = ? AND friend_id = ? AND resource_type = ? AND resource_id = ?')
    .run(req.user.id, friend_id, resource_type, resource_id);
  res.json({ success: true });
});

// Wer hat Zugriff auf einen meiner Einträge?
router.get('/share/access/:type/:id', auth, (req, res) => {
  const list = db.prepare(`
    SELECT fs.id, u.id as user_id, u.username, u.avatar
    FROM friend_shares fs
    JOIN users u ON u.id = fs.friend_id
    WHERE fs.owner_id = ? AND fs.resource_type = ? AND fs.resource_id = ?
  `).all(req.user.id, req.params.type, req.params.id);
  res.json(list);
});

// Was wurde mit MIR geteilt? (gruppiert nach Owner)
router.get('/shared-with-me', auth, (req, res) => {
  const { type } = req.query;
  const tables = {
    document: 'documents', task: 'tasks', contract: 'contracts',
    loan: 'loans', finance_item: 'finance_items', calendar_event: 'calendar_events',
    vault_entry: 'vault_entries',
  };

  if (type) {
    const table = tables[type];
    if (!table) return res.status(400).json({ error: 'Unbekannter Typ' });
    const items = db.prepare(`
      SELECT t.*, u.username as owner_name, u.avatar as owner_avatar, fs.created_at as shared_at, ? as resource_type
      FROM friend_shares fs
      JOIN ${table} t ON t.id = fs.resource_id
      JOIN users u ON u.id = fs.owner_id
      WHERE fs.friend_id = ? AND fs.resource_type = ?
      ORDER BY fs.created_at DESC
    `).all(type, req.user.id, type);
    return res.json(items);
  }

  // Übersicht aller Typen
  const summary = db.prepare(`
    SELECT resource_type, COUNT(*) as count
    FROM friend_shares
    WHERE friend_id = ?
    GROUP BY resource_type
  `).all(req.user.id);
  res.json({ summary });
});

module.exports = router;
