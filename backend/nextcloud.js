/**
 * Nextcloud WebDAV-Integration
 * Dateien werden automatisch in der Nextcloud-Ordnerstruktur synchronisiert.
 * Deaktiviert wenn NEXTCLOUD_URL / NEXTCLOUD_USER / NEXTCLOUD_PASS nicht gesetzt sind.
 */
'use strict';

const http  = require('http');
const https = require('https');
const fs    = require('fs');

function cfg() {
  return {
    url:  process.env.NEXTCLOUD_URL  || '',
    user: process.env.NEXTCLOUD_USER || '',
    pass: process.env.NEXTCLOUD_PASS || '',
  };
}

function enabled() {
  const { url, user, pass } = cfg();
  return !!(url && user && pass);
}

function authHeader() {
  const { user, pass } = cfg();
  return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
}

// Baut die HTTP-Request-Optionen — kodiert jeden Pfad-Abschnitt einzeln
function makeOptions(method, davPath, extraHeaders = {}) {
  const { url, user } = cfg();
  const base = new URL(url);
  const encodedPath = davPath.split('/').map(s => s ? encodeURIComponent(s) : '').join('/');
  const fullPath = `/remote.php/dav/files/${encodeURIComponent(user)}${encodedPath}`;
  return {
    protocol: base.protocol,
    hostname: base.hostname,
    port: parseInt(base.port) || (base.protocol === 'https:' ? 443 : 80),
    path: fullPath,
    method,
    headers: { Authorization: authHeader(), ...extraHeaders },
  };
}

const TIMEOUT_MS = 15000; // 15 Sekunden – dann Fehler statt hängen

function request(method, davPath, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    if (!enabled()) return resolve({ status: 0 });
    const opts = makeOptions(method, davPath, extraHeaders);
    const mod = opts.protocol === 'https:' ? https : http;
    const req = mod.request(opts, res => {
      res.resume();
      res.on('end', () => resolve({ status: res.statusCode }));
    });
    req.setTimeout(TIMEOUT_MS, () => req.destroy(new Error('Nextcloud timeout')));
    req.on('error', reject);
    req.end();
  });
}

/** Lokale Datei via PUT in Nextcloud hochladen */
function uploadFile(localPath, davPath) {
  return new Promise((resolve, reject) => {
    if (!enabled()) return resolve({ status: 0 });
    let size;
    try { size = fs.statSync(localPath).size; } catch (e) { return reject(e); }
    const opts = makeOptions('PUT', davPath, { 'Content-Length': size });
    const mod = opts.protocol === 'https:' ? https : http;
    const req = mod.request(opts, res => {
      res.resume();
      res.on('end', () => resolve({ status: res.statusCode }));
    });
    req.setTimeout(TIMEOUT_MS, () => req.destroy(new Error('Nextcloud upload timeout')));
    req.on('error', reject);
    fs.createReadStream(localPath).pipe(req);
  });
}

/** Erstellt einen Ordnerpfad rekursiv in Nextcloud (MKCOL) */
async function mkdirAll(dirPath) {
  if (!enabled()) return;
  const parts = dirPath.replace(/^\//, '').split('/').filter(Boolean);
  let current = '';
  for (const part of parts) {
    current += '/' + part;
    try {
      await request('MKCOL', current);
      // 201 = erstellt, 405 = existiert bereits — beides OK
    } catch { /* Netzwerkfehler ignorieren */ }
  }
}

/** Datei oder Ordner in Nextcloud löschen */
async function deleteFile(davPath) {
  if (!enabled() || !davPath) return;
  try {
    await request('DELETE', davPath);
  } catch { /* nicht gefunden oder Netzwerkfehler — ignorieren */ }
}

// ── Pfad-Hilfsfunktionen ────────────────────────────────────────────────────

const CAT_FOLDER = {
  contract:  'Verträge',
  invoice:   'Rechnungen',
  identity:  'Ausweise',
  insurance: 'Versicherungen',
  tax:       'Steuern',
  other:     'Sonstiges',
};

function categoryFolder(cat) {
  return CAT_FOLDER[cat] || cat || 'Sonstiges';
}

/**
 * Baut den WebDAV-Ordnerpfad für ein Dokument.
 * Persönlich:  /GinoHome/Dokumente/{Kategorie}/{Unterkategorie?}
 * Gruppe:      /GinoHome/Gruppen/{Gruppenname}/Dokumente/{Kategorie}/{Unterkategorie?}
 */
function buildDocumentDir({ category, subcategory, groupName }) {
  const cat = categoryFolder(category);
  const parts = groupName
    ? ['/GinoHome', 'Gruppen', groupName, 'Dokumente', cat]
    : ['/GinoHome', 'Dokumente', cat];
  if (subcategory?.trim()) parts.push(subcategory.trim());
  return parts.join('/');
}

function buildDocumentPath({ filename, category, subcategory, groupName }) {
  return buildDocumentDir({ category, subcategory, groupName }) + '/' + filename;
}

module.exports = { enabled, uploadFile, mkdirAll, deleteFile, buildDocumentDir, buildDocumentPath, categoryFolder };
