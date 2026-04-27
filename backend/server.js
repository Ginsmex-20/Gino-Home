require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { uploadsPath } = require('./config');

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    // Kein Origin = Server-zu-Server (nginx proxy, curl) → immer erlauben
    if (!origin) return callback(null, true);
    // Localhost (Dev)
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
    // Electron
    if (origin === 'app://localhost') return callback(null, true);
    // Private Netzwerk-IPs (192.168.x.x / 10.x.x.x / 172.16-31.x.x) → Home-Server / TrueNAS
    if (/^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)\d+/.test(origin)) return callback(null, true);
    // Zusätzliche Origins via Env (z.B. CORS_ORIGIN=https://meinedomain.de)
    const extra = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [];
    if (extra.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: ${origin} nicht erlaubt`));
  },
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(uploadsPath));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/document-categories', require('./routes/documents')); // alias
app.use('/api/vault', require('./routes/vault'));
app.use('/api/calendar', require('./routes/calendar'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Interner Serverfehler' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Gino-Home Backend läuft auf Port ${PORT}`));
