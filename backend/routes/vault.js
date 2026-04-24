const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const crypto = require('crypto');

const KEY = Buffer.from((process.env.VAULT_KEY || 'haushaltshub-vault-32char-key!!').padEnd(32).slice(0, 32));
const IV_LEN = 16;

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  if (!text) return null;
  try {
    const [ivHex, encHex] = text.split(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, Buffer.from(ivHex, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]).toString();
  } catch { return null; }
}

router.get('/', auth, (req, res) => {
  const { category } = req.query;
  let query = 'SELECT * FROM vault_entries WHERE user_id = ?';
  const params = [req.user.id];
  if (category) { query += ' AND category = ?'; params.push(category); }
  query += ' ORDER BY title ASC';
  const entries = db.prepare(query).all(...params).map(e => ({
    ...e, password: decrypt(e.password_encrypted), password_encrypted: undefined
  }));
  res.json(entries);
});

router.post('/', auth, (req, res) => {
  const { title, email, username, password, website, category, notes } = req.body;
  if (!title) return res.status(400).json({ error: 'Titel erforderlich' });
  const result = db.prepare('INSERT INTO vault_entries (title, email, username, password_encrypted, website, category, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(title, email, username, encrypt(password), website, category || 'other', notes, req.user.id);
  const entry = db.prepare('SELECT * FROM vault_entries WHERE id = ?').get(result.lastInsertRowid);
  res.json({ ...entry, password: decrypt(entry.password_encrypted), password_encrypted: undefined });
});

router.put('/:id', auth, (req, res) => {
  const { title, email, username, password, website, category, notes } = req.body;
  db.prepare('UPDATE vault_entries SET title = ?, email = ?, username = ?, password_encrypted = ?, website = ?, category = ?, notes = ? WHERE id = ? AND user_id = ?').run(title, email, username, encrypt(password), website, category, notes, req.params.id, req.user.id);
  const entry = db.prepare('SELECT * FROM vault_entries WHERE id = ?').get(req.params.id);
  res.json({ ...entry, password: decrypt(entry.password_encrypted), password_encrypted: undefined });
});

router.delete('/:id', auth, (req, res) => {
  db.prepare('DELETE FROM vault_entries WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

module.exports = router;
