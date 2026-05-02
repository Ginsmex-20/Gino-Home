const router = require('express').Router();
const db     = require('../db');
const auth   = require('../middleware/auth');

/* ── Alle Einkäufe ── */
router.get('/', auth, (req, res) => {
  const receipts = db.prepare(`
    SELECT r.*,
      (SELECT COUNT(*) FROM grocery_items WHERE receipt_id = r.id) as item_count
    FROM grocery_receipts r
    WHERE r.created_by = ?
    ORDER BY r.date DESC, r.created_at DESC
  `).all(req.user.id);
  res.json(receipts);
});

/* ── Positionen eines Belegs ── */
router.get('/:id/items', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM grocery_items WHERE receipt_id = ?').all(req.params.id));
});

/* ── Neuer Einkauf ── */
router.post('/', auth, (req, res) => {
  const { merchant, date, total_amount, notes, items } = req.body;
  if (!merchant || !date || total_amount === undefined)
    return res.status(400).json({ error: 'Händler, Datum und Betrag erforderlich' });

  const result = db.prepare(
    'INSERT INTO grocery_receipts (merchant, date, total_amount, notes, created_by) VALUES (?, ?, ?, ?, ?)'
  ).run(merchant, date, parseFloat(total_amount), notes || null, req.user.id);

  const receiptId = result.lastInsertRowid;

  // Einzelposten speichern
  if (Array.isArray(items) && items.length > 0) {
    const ins = db.prepare('INSERT INTO grocery_items (receipt_id, name, price, quantity) VALUES (?, ?, ?, ?)');
    for (const it of items) {
      if (it.name) ins.run(receiptId, it.name, parseFloat(it.price) || 0, parseFloat(it.quantity) || 1);
    }
  }

  // Automatisch als Finanz-Ausgabe (Lebensmittel) buchen
  db.prepare(
    `INSERT INTO finance_items (title, amount, type, category, date, description, created_by, grocery_receipt_id)
     VALUES (?, ?, 'expense', 'Lebensmittel', ?, ?, ?, ?)`
  ).run(`Einkauf: ${merchant}`, parseFloat(total_amount || sumItems), date, notes || null, req.user.id, receiptId);

  res.json(db.prepare('SELECT * FROM grocery_receipts WHERE id = ?').get(receiptId));
});

/* ── Einkauf bearbeiten ── */
router.put('/:id', auth, (req, res) => {
  const { merchant, date, total_amount, notes } = req.body;
  db.prepare(
    'UPDATE grocery_receipts SET merchant=?, date=?, total_amount=?, notes=? WHERE id=? AND created_by=?'
  ).run(merchant, date, parseFloat(total_amount), notes || null, req.params.id, req.user.id);
  // Verknüpften Finanzeintrag aktualisieren
  db.prepare(`UPDATE finance_items SET title = ?, amount = ?, date = ?, description = ? WHERE grocery_receipt_id = ?`)
    .run(`Einkauf: ${merchant}`, parseFloat(total_amount), date, notes || null, req.params.id);
  res.json(db.prepare('SELECT * FROM grocery_receipts WHERE id = ?').get(req.params.id));
});

/* ── Einkauf löschen ── */
router.delete('/:id', auth, (req, res) => {
  // Verknüpften Finanzeintrag löschen
  db.prepare('DELETE FROM finance_items WHERE grocery_receipt_id = ?').run(req.params.id);
  db.prepare('DELETE FROM grocery_receipts WHERE id = ? AND created_by = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

/* ── Einzelposition löschen ── */
router.delete('/items/:itemId', auth, (req, res) => {
  db.prepare('DELETE FROM grocery_items WHERE id = ?').run(req.params.itemId);
  res.json({ success: true });
});

/* ── Monats-Übersicht ── */
router.get('/stats/monthly', auth, (req, res) => {
  const rows = db.prepare(`
    SELECT
      strftime('%Y-%m', date) as month,
      SUM(total_amount) as total,
      COUNT(*) as count
    FROM grocery_receipts
    WHERE created_by = ?
    GROUP BY strftime('%Y-%m', date)
    ORDER BY month DESC
    LIMIT 12
  `).all(req.user.id);
  res.json(rows);
});

module.exports = router;
