const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

const isDev = !app.isPackaged;
let mainWindow;
let backendProcess;

// ─── Pfade & Umgebung konfigurieren ────────────────────────────────────────
function setupPaths() {
  const userData = app.getPath('userData');
  const uploadsPath = path.join(userData, 'uploads');

  ['', 'documents', 'avatars'].forEach(sub => {
    const dir = path.join(uploadsPath, sub);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  return {
    DB_PATH: path.join(userData, 'haushaltshub.db'),
    UPLOADS_PATH: uploadsPath,
  };
}

// ─── Node.js-Pfad ermitteln (System-Node, nicht Electrons internes Node) ──
function findNodePath() {
  // Mögliche Node-Pfade auf Windows
  const candidates = [
    process.env.NODE_PATH,
    'node', // wenn im PATH
  ];

  // Versuche node aus dem PATH
  return 'node';
}

// ─── Backend als separaten Node.js-Prozess starten ─────────────────────────
function startBackend(env) {
  const backendDir = isDev
    ? path.join(__dirname, '../backend')
    : path.join(process.resourcesPath, 'backend');

  const serverPath = path.join(backendDir, 'server.js');

  backendProcess = spawn('node', [serverPath], {
    env: {
      ...process.env,
      PORT: '3001',
      NODE_ENV: 'production',
      DB_PATH: env.DB_PATH,
      UPLOADS_PATH: env.UPLOADS_PATH,
      JWT_SECRET: process.env.JWT_SECRET || 'HaushaltsHub-Electron-JWT-2024-Secret!!',
      VAULT_KEY:  process.env.VAULT_KEY  || 'HaushaltsHub-Vault-32CharsKey-2024',
    },
    cwd: backendDir,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  backendProcess.stdout.on('data', d => console.log('[Backend]', d.toString().trim()));
  backendProcess.stderr.on('data', d => console.error('[Backend]', d.toString().trim()));
  backendProcess.on('error', err => console.error('[Backend Fehler]', err.message));
  backendProcess.on('exit', code => {
    if (code !== 0 && code !== null) console.warn('[Backend] Beendet mit Code', code);
  });
}

// ─── Warten bis Backend antwortet ──────────────────────────────────────────
function waitForBackend(callback, tries = 0) {
  if (tries > 50) { console.warn('[Electron] Backend nicht erreichbar'); return callback(); }
  http.get('http://localhost:3001/api/health', () => callback())
      .on('error', () => setTimeout(() => waitForBackend(callback, tries + 1), 300));
}

// ─── Fenster erstellen ──────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 820,
    minWidth: 940,
    minHeight: 580,
    backgroundColor: '#161616',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    title: 'Gino-Home',
    // Icon nur wenn vorhanden (damit Build ohne Icons nicht abstürzt)
    ...(fs.existsSync(path.join(__dirname, 'icon.ico')) && process.platform === 'win32'
      ? { icon: path.join(__dirname, 'icon.ico') } : {}),
    ...(fs.existsSync(path.join(__dirname, 'icon.icns')) && process.platform === 'darwin'
      ? { icon: path.join(__dirname, 'icon.icns') } : {}),
  });

  // Menüleiste komplett entfernen (Windows/Linux)
  // Auf macOS minimales Menü behalten (Apple-Richtlinie)
  if (process.platform === 'darwin') {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {
        label: 'Gino-Home',
        submenu: [
          { label: 'Über Gino-Home', role: 'about' },
          { type: 'separator' },
          { label: 'Beenden', role: 'quit' }
        ]
      },
      {
        label: 'Bearbeiten',
        submenu: [
          { role: 'undo', label: 'Rückgängig' },
          { role: 'redo', label: 'Wiederholen' },
          { type: 'separator' },
          { role: 'cut', label: 'Ausschneiden' },
          { role: 'copy', label: 'Kopieren' },
          { role: 'paste', label: 'Einfügen' },
          { role: 'selectAll', label: 'Alles auswählen' },
        ]
      },
      ...(isDev ? [{ label: 'DevTools', submenu: [{ role: 'toggleDevTools' }] }] : [])
    ]));
  } else {
    // Windows/Linux: keine Menüleiste
    Menu.setApplicationMenu(null);
  }

  // Externe Links im Browser öffnen
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── App-Lifecycle ──────────────────────────────────────────────────────────
app.whenReady().then(() => {
  const env = setupPaths();
  if (isDev) {
    // Im Dev-Modus läuft das Backend bereits via "npm run dev"
    console.log('[Electron] Dev-Modus: Nutze laufendes Backend auf :3001');
    waitForBackend(createWindow);
  } else {
    // Im Production-Modus Backend selbst starten
    startBackend(env);
    waitForBackend(createWindow);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill('SIGTERM');
    setTimeout(() => backendProcess && backendProcess.kill('SIGKILL'), 3000);
  }
  if (process.platform !== 'darwin') app.quit();
});
