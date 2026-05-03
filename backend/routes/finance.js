const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Finance items (income/expense)
router.get('/items', auth, (req, res) => {
  const { group_id } = req.query;
  if (group_id) {
    const member = db.prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?').get(group_id, req.user.id);
    if (!member) return res.status(403).json({ error: 'Kein Zugriff' });
    return res.json(db.prepare('SELECT f.*, u.username as creator_name FROM finance_items f LEFT JOIN users u ON f.created_by = u.id WHERE f.group_id = ? ORDER BY f.date DESC, f.created_at DESC').all(group_id));
  }
  res.json(db.prepare('SELECT f.*, u.username as creator_name FROM finance_items f LEFT JOIN users u ON f.created_by = u.id WHERE f.created_by = ? AND (f.group_id IS NULL OR f.group_id = 0) ORDER BY f.date DESC, f.created_at DESC').all(req.user.id));
});

router.post('/items', auth, (req, res) => {
  const { title, amount, type, category, date, description, group_id } = req.body;
  if (!title || !amount || !type) return res.status(400).json({ error: 'Titel, Betrag und Typ erforderlich' });
  if (group_id) {
    const member = db.prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?').get(group_id, req.user.id);
    if (!member) return res.status(403).json({ error: 'Kein Zugriff' });
  }
  const result = db.prepare('INSERT INTO finance_items (title, amount, type, category, date, description, group_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(title, amount, type, category, date, description, group_id || null, req.user.id);
  res.json(db.prepare('SELECT * FROM finance_items WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/items/:id', auth, (req, res) => {
  const { title, amount, type, category, date, description } = req.body;
  db.prepare('UPDATE finance_items SET title = ?, amount = ?, type = ?, category = ?, date = ?, description = ? WHERE id = ? AND created_by = ?').run(title, amount, type, category, date, description, req.params.id, req.user.id);
  res.json(db.prepare('SELECT * FROM finance_items WHERE id = ?').get(req.params.id));
});

router.delete('/items/:id', auth, (req, res) => {
  db.prepare('DELETE FROM finance_items WHERE id = ? AND created_by = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

// Contracts
router.get('/contracts', auth, (req, res) => {
  const { group_id } = req.query;
  let query = `SELECT c.*, u.username as creator_name FROM contracts c LEFT JOIN users u ON c.created_by = u.id WHERE c.created_by = ?`;
  const params = [req.user.id];
  if (group_id) { query += ' AND c.group_id = ?'; params.push(group_id); }
  query += ' ORDER BY c.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/contracts', auth, (req, res) => {
  const { title, company, amount, billing_cycle, start_date, end_date, category, status, notes, group_id,
          contract_type, contract_number, customer_number, purpose, cancel_notice_months, cancel_until, auto_renew, phone_number } = req.body;
  if (!title) return res.status(400).json({ error: 'Titel erforderlich' });
  const result = db.prepare(
    `INSERT INTO contracts (title, company, amount, billing_cycle, start_date, end_date, category, status, notes, group_id,
      contract_type, contract_number, customer_number, purpose, cancel_notice_months, cancel_until, auto_renew, phone_number, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(title, company, amount, billing_cycle, start_date, end_date, category, status || 'active', notes, group_id || null,
    contract_type || 'other', contract_number || null, customer_number || null, purpose || null,
    cancel_notice_months || 1, cancel_until || null, auto_renew ? 1 : 0, phone_number || null, req.user.id);
  res.json(db.prepare('SELECT * FROM contracts WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/contracts/:id', auth, (req, res) => {
  const { title, company, amount, billing_cycle, start_date, end_date, category, status, notes,
          contract_type, contract_number, customer_number, purpose, cancel_notice_months, cancel_until, auto_renew, phone_number } = req.body;
  db.prepare(
    `UPDATE contracts SET title=?, company=?, amount=?, billing_cycle=?, start_date=?, end_date=?, category=?, status=?, notes=?,
      contract_type=?, contract_number=?, customer_number=?, purpose=?, cancel_notice_months=?, cancel_until=?, auto_renew=?, phone_number=?
     WHERE id=? AND created_by=?`
  ).run(title, company, amount, billing_cycle, start_date, end_date, category, status, notes,
    contract_type || 'other', contract_number || null, customer_number || null, purpose || null,
    cancel_notice_months || 1, cancel_until || null, auto_renew ? 1 : 0, phone_number || null, req.params.id, req.user.id);
  res.json(db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id));
});

router.delete('/contracts/:id', auth, (req, res) => {
  db.prepare('DELETE FROM contracts WHERE id = ? AND created_by = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

// Loans / Kredite / Schulden / Ratenkäufe
router.get('/loans', auth, (req, res) => {
  const loans = db.prepare('SELECT * FROM loans WHERE created_by = ? ORDER BY created_at DESC').all(req.user.id);
  res.json(loans);
});

router.post('/loans', auth, (req, res) => {
  const { title, lender, creditor, reference_number, customer_number, purpose, type, total_amount, remaining_amount, monthly_rate, interest_rate, start_date, end_date, status, notes } = req.body;
  if (!title || !total_amount) return res.status(400).json({ error: 'Titel und Gesamtbetrag erforderlich' });
  const result = db.prepare(
    `INSERT INTO loans (title, lender, creditor, reference_number, customer_number, purpose, type, total_amount, remaining_amount, monthly_rate, interest_rate, start_date, end_date, status, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(title, lender || null, creditor || null, reference_number || null, customer_number || null, purpose || null,
    type || 'loan', total_amount, remaining_amount ?? total_amount, monthly_rate || 0, interest_rate || 0,
    start_date || null, end_date || null, status || 'active', notes || null, req.user.id);
  res.json(db.prepare('SELECT * FROM loans WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/loans/:id', auth, (req, res) => {
  const { title, lender, creditor, reference_number, customer_number, purpose, type, total_amount, remaining_amount, monthly_rate, interest_rate, start_date, end_date, status, notes } = req.body;
  db.prepare(
    `UPDATE loans SET title=?, lender=?, creditor=?, reference_number=?, customer_number=?, purpose=?, type=?, total_amount=?, remaining_amount=?, monthly_rate=?, interest_rate=?, start_date=?, end_date=?, status=?, notes=?
     WHERE id=? AND created_by=?`
  ).run(title, lender || null, creditor || null, reference_number || null, customer_number || null, purpose || null,
    type, total_amount, remaining_amount, monthly_rate || 0, interest_rate || 0,
    start_date || null, end_date || null, status, notes || null, req.params.id, req.user.id);
  res.json(db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id));
});

router.delete('/loans/:id', auth, (req, res) => {
  db.prepare('DELETE FROM loans WHERE id = ? AND created_by = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

// Summary stats
router.get('/summary', auth, (req, res) => {
  const { group_id } = req.query;

  if (group_id) {
    const member = db.prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?').get(group_id, req.user.id);
    if (!member) return res.status(403).json({ error: 'Kein Zugriff' });
    const income = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM finance_items WHERE group_id = ? AND type = 'income'`).get(group_id);
    const expense = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM finance_items WHERE group_id = ? AND type = 'expense'`).get(group_id);
    return res.json({ income: income.total, expense: expense.total, balance: income.total - expense.total, contracts_total: 0, active_contracts: 0, loans_remaining: 0, loans_monthly: 0, active_loans: 0 });
  }

  const income = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM finance_items WHERE created_by = ? AND (group_id IS NULL OR group_id = 0) AND type = 'income'`).get(req.user.id);
  const expense = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM finance_items WHERE created_by = ? AND (group_id IS NULL OR group_id = 0) AND type = 'expense'`).get(req.user.id);
  const contractsTotal = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM contracts WHERE created_by = ? AND status = 'active'`).get(req.user.id);
  const contractsCount = db.prepare(`SELECT COUNT(*) as count FROM contracts WHERE created_by = ? AND status = 'active'`).get(req.user.id);
  const loansTotal = db.prepare(`SELECT COALESCE(SUM(remaining_amount), 0) as total FROM loans WHERE created_by = ? AND status = 'active'`).get(req.user.id);
  const loansMonthly = db.prepare(`SELECT COALESCE(SUM(monthly_rate), 0) as total FROM loans WHERE created_by = ? AND status = 'active'`).get(req.user.id);
  const loansCount = db.prepare(`SELECT COUNT(*) as count FROM loans WHERE created_by = ? AND status = 'active'`).get(req.user.id);

  res.json({
    income: income.total,
    expense: expense.total,
    balance: income.total - expense.total,
    contracts_total: contractsTotal.total,
    active_contracts: contractsCount.count,
    loans_remaining: loansTotal.total,
    loans_monthly: loansMonthly.total,
    active_loans: loansCount.count
  });
});

module.exports = router;
