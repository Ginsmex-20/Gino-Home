const { app, BrowserWindow, shell, Menu, session } = require('electron');
const path = require('path');
const fs   = require('fs');

// ── Konfiguration ───────────────────────────────────────────────────────────
const APP_URL  = 'https://ginohome.de';
const APP_NAME = 'Gino-Home';
const isDev    = !app.isPackaged;

let mainWindow;

// ── Fenster erstellen ───────────────────────────────────────────────────────
function createWindow() {
  const iconPath = (() => {
    if (process.platform === 'win32')  return path.join(__dirname, 'icon.ico');
    if (process.platform === 'darwin') return path.join(__dirname, 'icon.icns');
    return path.join(__dirname, 'icon.png');
  })();

  mainWindow = new BrowserWindow({
    width:     1400,
    height:    900,
    minWidth:  400,
    minHeight: 600,
    backgroundColor: '#0f0f0f',
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    title: APP_NAME,
    ...(fs.existsSync(iconPath) ? { icon: iconPath } : {}),
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // Sicher: keine lokale Datei-Zugriffe
      webSecurity: true,
    },
  });

  // ── App-Menü ──────────────────────────────────────────────────────────────
  if (process.platform === 'darwin') {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {
        label: APP_NAME,
        submenu: [
          { label: `Über ${APP_NAME}`, role: 'about' },
          { type: 'separator' },
          { label: 'Dienste', role: 'services' },
          { type: 'separator' },
          { label: `${APP_NAME} ausblenden`, role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { label: 'Beenden', role: 'quit' },
        ],
      },
      {
        label: 'Bearbeiten',
        submenu: [
          { role: 'undo', label: 'Rückgängig' },
          { role: 'redo', label: 'Wiederholen' },
          { type: 'separator' },
          { role: 'cut',       label: 'Ausschneiden' },
          { role: 'copy',      label: 'Kopieren' },
          { role: 'paste',     label: 'Einfügen' },
          { role: 'selectAll', label: 'Alles auswählen' },
        ],
      },
      {
        label: 'Darstellung',
        submenu: [
          { role: 'reload',        label: 'Neu laden' },
          { role: 'togglefullscreen', label: 'Vollbild' },
          ...(isDev ? [{ type: 'separator' }, { role: 'toggleDevTools', label: 'DevTools' }] : []),
        ],
      },
    ]));
  } else {
    // Windows/Linux: nur DevTools im Dev-Modus
    Menu.setApplicationMenu(isDev
      ? Menu.buildFromTemplate([{ label: 'DevTools', submenu: [{ role: 'toggleDevTools' }] }])
      : null
    );
  }

  // ── Ginohome.de laden ────────────────────────────────────────────────────
  mainWindow.loadURL(APP_URL);

  // Reload-Shortcut (F5 / Cmd+R)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if ((input.key === 'F5') ||
        (input.key === 'r' && (input.meta || input.control))) {
      mainWindow.webContents.reload();
    }
  });

  // Externe Links im System-Browser öffnen
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://ginohome.de') || url.startsWith('http://ginohome.de')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Navigations-Schutz: nur ginohome.de erlaubt
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('https://ginohome.de') && !url.startsWith('http://ginohome.de')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Server nicht erreichbar → Offline-Seite zeigen
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    // Nicht bei Abbruch durch den Nutzer
    if (errorCode === -3) return;
    mainWindow.webContents.loadFile(path.join(__dirname, 'offline.html'));
  });

  // Fenster anzeigen sobald bereit
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── SSL: ginohome.de vertrauen auch bei ungültigem Zertifikat ──────────────
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (url.startsWith('https://ginohome.de') || url.startsWith('http://ginohome.de')) {
    event.preventDefault();
    callback(true); // ginohome.de als vertrauenswürdig einstufen
  } else {
    callback(false); // alle anderen Domains normal behandeln
  }
});

// ── App-Lifecycle ───────────────────────────────────────────────────────────
app.whenReady().then(() => {
  // User-Agent anpassen damit Seite weiß, dass sie in Electron läuft
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['X-Electron-App'] = '1';
    callback({ requestHeaders: details.requestHeaders });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Sicherheit: verhindert Erstellung neuer unsicherer Fenster
app.on('web-contents-created', (event, contents) => {
  contents.on('will-attach-webview', (e) => e.preventDefault());
});
