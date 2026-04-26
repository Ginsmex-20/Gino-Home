require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { uploadsPath } = require('./config');

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    // Erlaubte Origins: lokale Dev-Server, Electron, nginx-Frontend im Docker-Netz
    const allowed = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:8080',
      'app://localhost',
    ];
    // Kein Origin = Server-zu-Server (nginx proxy) oder curl → erlauben
    if (!origin || allowed.includes(origin)) return callback(null, true);
    // Zusätzliche Origins via Env (z.B. CORS_ORIGIN=http://192.168.1.50:8080)
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
app.use('/api/vault', require('./routes/vault'));
app.use('/api/calendar', require('./routes/calendar'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Interner Serverfehler' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Gino-Home Backend läuft auf Port ${PORT}`));
