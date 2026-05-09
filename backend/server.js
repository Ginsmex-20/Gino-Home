require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const http       = require('http');
const { Server } = require('socket.io');
const jwt        = require('jsonwebtoken');
const db         = require('./db');
const { setIO }  = require('./socket');
const { uploadsPath } = require('./config');

const app        = express();
const httpServer = http.createServer(app);

// ── CORS-Logik (Express + Socket.io teilen dieselbe Funktion) ────────────────
const allowOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin))    return callback(null, true);
  if (origin === 'app://localhost')                     return callback(null, true);
  if (/^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)\d+/.test(origin))
    return callback(null, true);
  const extra = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [];
  if (extra.includes(origin)) return callback(null, true);
  callback(new Error(`CORS: ${origin} nicht erlaubt`));
};

app.use(cors({ origin: allowOrigin, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(uploadsPath));

// ── Socket.io Setup ───────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: { origin: allowOrigin, credentials: true },
  transports: ['websocket', 'polling'],
});
setIO(io);

// Auth-Middleware für Socket
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Nicht authentifiziert'));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Ungültiger Token'));
  }
});

// Ausstehende Benachrichtigungen berechnen
function getPendingNotifications(userId) {
  const notifs = [];
  try {
    // Kalender-Termine heute und morgen
    const events = db.prepare(`
      SELECT ce.title, ce.start_date, COALESCE(g.name, 'Persönlich') as group_name
      FROM calendar_events ce
      LEFT JOIN groups g ON ce.group_id = g.id
      WHERE (
        ce.created_by = ? OR
        ce.group_id IN (SELECT group_id FROM group_members WHERE user_id = ?)
      )
      AND date(ce.start_date) >= date('now')
      AND date(ce.start_date) <= date('now', '+1 day')
      ORDER BY ce.start_date ASC LIMIT 10
    `).all(userId, userId);

    events.forEach(e => notifs.push({
      type: 'calendar',
      icon: '📅',
      title: 'Termin heute/morgen',
      body: `${e.title} — ${e.group_name}`,
      time: e.start_date,
    }));

    // Verträge die in 7 Tagen ablaufen
    const contracts = db.prepare(`
      SELECT title, end_date FROM contracts
      WHERE created_by = ? AND status = 'active'
      AND end_date IS NOT NULL
      AND date(end_date) BETWEEN date('now') AND date('now', '+7 days')
      ORDER BY end_date ASC LIMIT 5
    `).all(userId);

    contracts.forEach(c => notifs.push({
      type: 'contract',
      icon: '📄',
      title: 'Vertrag läuft bald ab',
      body: `${c.title} — endet am ${c.end_date}`,
      time: c.end_date,
    }));
  } catch (err) {
    console.error('[Socket] Benachrichtigungs-Fehler:', err.message);
  }
  return notifs;
}

// Socket-Verbindungs-Handler
io.on('connection', (socket) => {
  const userId = socket.user.id;
  console.log(`[Socket] User ${userId} verbunden (${socket.id})`);

  // Alle Gruppen des Users beitreten
  try {
    const userGroups = db.prepare('SELECT group_id FROM group_members WHERE user_id = ?').all(userId);
    userGroups.forEach(({ group_id }) => socket.join(`group:${group_id}`));
  } catch {}

  // Ausstehende Benachrichtigungen senden
  const notifs = getPendingNotifications(userId);
  if (notifs.length > 0) socket.emit('notifications:init', notifs);

  socket.on('disconnect', () => {
    console.log(`[Socket] User ${userId} getrennt`);
  });
});

// ── API-Routen ────────────────────────────────────────────────────────────────
app.use('/api/auth',               require('./routes/auth'));
app.use('/api/groups',             require('./routes/groups'));
app.use('/api/tasks',              require('./routes/tasks'));
app.use('/api/finance',            require('./routes/finance'));
app.use('/api/documents',          require('./routes/documents'));
app.use('/api/document-categories',require('./routes/documents'));
app.use('/api/vault',              require('./routes/vault'));
app.use('/api/calendar',           require('./routes/calendar'));
app.use('/api/grocery',            require('./routes/grocery'));
app.use('/api/workspace',          require('./routes/workspace'));
app.use('/api/friends',            require('./routes/friends'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── Version / Update-Info ─────────────────────────────────────────────────────
const VERSION_INFO = require('./version.json');
const SERVER_START = new Date().toISOString();
app.get('/api/version', (req, res) => {
  res.json({ ...VERSION_INFO, deployedAt: SERVER_START });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Interner Serverfehler' });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () =>
  console.log(`Gino-Home Backend + Socket.io auf Port ${PORT}`)
);
