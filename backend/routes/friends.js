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

/* ════════════════════════════════════════════════════════════════════
   CATEGORY-ACCESS — Freund sieht ALLE Einträge dieser Kategorie
   ════════════════════════════════════════════════════════════════════ */

// Aktueller Status: für einen bestimmten Freund welche Kategorien sind freigegeben?
router.get('/category-access/:friendId', auth, (req, res) => {
  if (!areFriends(req.user.id, req.params.friendId)) return res.status(403).json({ error: 'Nicht befreundet' });
  const list = db.prepare('SELECT resource_type FROM friend_category_access WHERE owner_id = ? AND friend_id = ?')
    .all(req.user.id, req.params.friendId);
  res.json(list.map(r => r.resource_type));
});

// Toggle: Kategorie für Freund freigeben/entziehen
router.post('/category-access', auth, (req, res) => {
  const { friend_id, resource_type, allowed } = req.body || {};
  if (!friend_id || !resource_type) return res.status(400).json({ error: 'Parameter fehlen' });
  if (!areFriends(req.user.id, friend_id)) return res.status(403).json({ error: 'Nicht befreundet' });

  const validTypes = ['document','task','contract','loan','finance_item','calendar_event','vault_entry'];
  if (!validTypes.includes(resource_type)) return res.status(400).json({ error: 'Unbekannter Typ' });

  if (allowed) {
    try {
      db.prepare('INSERT INTO friend_category_access (owner_id, friend_id, resource_type) VALUES (?, ?, ?)')
        .run(req.user.id, friend_id, resource_type);
    } catch {} // Bereits gesetzt
  } else {
    db.prepare('DELETE FROM friend_category_access WHERE owner_id = ? AND friend_id = ? AND resource_type = ?')
      .run(req.user.id, friend_id, resource_type);
  }
  res.json({ success: true });
});

/* ════════════════════════════════════════════════════════════════════
   SHARER-VIEW — Liste der Freunde die mit mir teilen + Items von einem
   ════════════════════════════════════════════════════════════════════ */

const RESOURCE_TABLES = {
  document: { table: 'documents', owner: 'uploaded_by', personalOnly: true },
  task: { table: 'tasks', owner: 'created_by', personalOnly: true },
  contract: { table: 'contracts', owner: 'created_by', personalOnly: true },
  loan: { table: 'loans', owner: 'created_by', personalOnly: true },
  finance_item: { table: 'finance_items', owner: 'created_by', personalOnly: true },
  calendar_event: { table: 'calendar_events', owner: 'created_by', personalOnly: true },
  vault_entry: { table: 'vault_entries', owner: 'user_id', personalOnly: false },
};

// Liste aller Freunde die mit mir was teilen (Kategorie-Zugriff oder Einzel-Items)
router.get('/sharers', auth, (req, res) => {
  // Owner-IDs sammeln (zwei separate Queries, dann zusammenführen)
  const fromCat = db.prepare('SELECT DISTINCT owner_id FROM friend_category_access WHERE friend_id = ?').all(req.user.id).map(r => r.owner_id);
  const fromShares = db.prepare('SELECT DISTINCT owner_id FROM friend_shares WHERE friend_id = ?').all(req.user.id).map(r => r.owner_id);
  const allOwnerIds = [...new Set([...fromCat, ...fromShares])];

  console.log('[friends/sharers]', { user: req.user.id, fromCat, fromShares, allOwnerIds });

  if (allOwnerIds.length === 0) return res.json([]);

  // User-Daten einzeln abfragen (vermeidet IN-Liste-Probleme)
  const result = allOwnerIds.map(ownerId => {
    const u = db.prepare('SELECT id as user_id, username, email, avatar FROM users WHERE id = ?').get(ownerId);
    if (!u) return null;
    const catAccess = db.prepare('SELECT resource_type FROM friend_category_access WHERE owner_id = ? AND friend_id = ?')
      .all(ownerId, req.user.id).map(r => r.resource_type);
    const itemTypes = db.prepare('SELECT DISTINCT resource_type FROM friend_shares WHERE owner_id = ? AND friend_id = ?')
      .all(ownerId, req.user.id).map(r => r.resource_type);
    const all = [...new Set([...catAccess, ...itemTypes])];
    return { ...u, categories: all, full_access: catAccess };
  }).filter(Boolean);

  // Sortieren
  result.sort((a, b) => (a.username || '').localeCompare(b.username || ''));
  res.json(result);
});

// Items von einem bestimmten Freund (Owner) für eine bestimmte Kategorie
router.get('/from/:ownerId/:type', auth, (req, res) => {
  const { ownerId, type } = req.params;
  const cfg = RESOURCE_TABLES[type];
  if (!cfg) return res.status(400).json({ error: 'Unbekannter Typ' });

  const hasFullAccess = !!db.prepare('SELECT 1 FROM friend_category_access WHERE owner_id = ? AND friend_id = ? AND resource_type = ?')
    .get(ownerId, req.user.id, type);

  const personalFilter = cfg.personalOnly ? ' AND (t.group_id IS NULL)' : '';

  let items;
  if (hasFullAccess) {
    items = db.prepare(
      `SELECT t.*, 'category' as access_via FROM ${cfg.table} t
       WHERE t.${cfg.owner} = ?${personalFilter}
       ORDER BY t.created_at DESC`
    ).all(ownerId);
  } else {
    items = db.prepare(
      `SELECT t.*, 'item' as access_via FROM ${cfg.table} t
       JOIN friend_shares fs ON fs.resource_id = t.id AND fs.resource_type = ?
       WHERE fs.owner_id = ? AND fs.friend_id = ? AND t.${cfg.owner} = ?${personalFilter}
       ORDER BY t.created_at DESC`
    ).all(type, ownerId, req.user.id, ownerId);
  }

  // Anhang-Counts für Dokumente
  if (type === 'document') {
    items = items.map(it => ({
      ...it,
      attachment_count: db.prepare('SELECT COUNT(*) as n FROM document_attachments WHERE document_id = ?').get(it.id)?.n || 0
    }));
  }

  res.json(items);
});

// Was wurde mit MIR geteilt? (Einzel-Shares + Kategorie-Zugriff)
router.get('/shared-with-me', auth, (req, res) => {
  const { type } = req.query;
  const tables = {
    document: { table: 'documents', owner: 'uploaded_by' },
    task: { table: 'tasks', owner: 'created_by' },
    contract: { table: 'contracts', owner: 'created_by' },
    loan: { table: 'loans', owner: 'created_by' },
    finance_item: { table: 'finance_items', owner: 'created_by' },
    calendar_event: { table: 'calendar_events', owner: 'created_by' },
    vault_entry: { table: 'vault_entries', owner: 'user_id' },
  };

  if (type) {
    const cfg = tables[type];
    if (!cfg) return res.status(400).json({ error: 'Unbekannter Typ' });
    // 1) Einzel-Shares
    // 2) Kategorie-Zugriff: alle Items von Ownern die mir Kategorie-Zugriff gegeben haben
    const items = db.prepare(`
      SELECT t.*, u.username as owner_name, u.avatar as owner_avatar, fs.created_at as shared_at, ? as resource_type, 'item' as access_via
      FROM friend_shares fs
      JOIN ${cfg.table} t ON t.id = fs.resource_id
      JOIN users u ON u.id = fs.owner_id
      WHERE fs.friend_id = ? AND fs.resource_type = ?
      UNION
      SELECT t.*, u.username as owner_name, u.avatar as owner_avatar, fca.created_at as shared_at, ? as resource_type, 'category' as access_via
      FROM friend_category_access fca
      JOIN ${cfg.table} t ON t.${cfg.owner} = fca.owner_id
      JOIN users u ON u.id = fca.owner_id
      WHERE fca.friend_id = ? AND fca.resource_type = ?
      ORDER BY shared_at DESC
    `).all(type, req.user.id, type, type, req.user.id, type);
    return res.json(items);
  }

  // Übersicht aller Typen — Counts aus beiden Quellen
  const itemCounts = db.prepare(`SELECT resource_type, COUNT(*) as count FROM friend_shares WHERE friend_id = ? GROUP BY resource_type`).all(req.user.id);
  const catAccess = db.prepare(`SELECT owner_id, resource_type FROM friend_category_access WHERE friend_id = ?`).all(req.user.id);

  const counts = {};
  for (const row of itemCounts) counts[row.resource_type] = (counts[row.resource_type] || 0) + row.count;
  for (const ca of catAccess) {
    const cfg = tables[ca.resource_type];
    if (!cfg) continue;
    const c = db.prepare(`SELECT COUNT(*) as n FROM ${cfg.table} WHERE ${cfg.owner} = ?`).get(ca.owner_id);
    counts[ca.resource_type] = (counts[ca.resource_type] || 0) + (c?.n || 0);
  }
  const summary = Object.entries(counts).map(([resource_type, count]) => ({ resource_type, count }));
  res.json({ summary });
});

module.exports = router;
