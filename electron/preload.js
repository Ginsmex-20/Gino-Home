const { contextBridge } = require('electron');

// Stellt der React-App sicher bereit, dass sie in Electron läuft
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform, // 'win32', 'darwin', 'linux'
  version: process.versions.electron,
});
