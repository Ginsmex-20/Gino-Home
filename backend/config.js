const path = require('path');

module.exports = {
  // DB-Pfad: In Electron → userData, sonst neben server.js
  dbPath: process.env.DB_PATH || path.join(__dirname, 'haushaltshub.db'),
  // Upload-Pfad: In Electron → userData/uploads, sonst backend/uploads
  uploadsPath: process.env.UPLOADS_PATH || path.join(__dirname, 'uploads'),
};
