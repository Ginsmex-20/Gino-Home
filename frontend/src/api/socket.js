import { io } from 'socket.io-client';

// Socket URL automatisch erkennen
const getSocketURL = () => {
  // Capacitor Native App (iOS / Android)
  if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()) {
    const base = import.meta.env.VITE_API_BASE_URL || 'https://ginohome.de/api';
    return base.replace(/\/api\/?$/, '');
  }
  // Dev-Modus (Vite-Proxy)
  if (import.meta.env.DEV) return 'http://localhost:3001';
  // Produktion (Web + Electron): nginx leitet /socket.io/ weiter
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  if (apiBase) return apiBase.replace(/\/api\/?$/, '');
  return window.location.origin;
};

let socket = null;

export function connectSocket(token) {
  if (socket?.connected) return socket;
  if (socket) { socket.disconnect(); socket = null; }

  socket = io(getSocketURL(), {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 10,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('[Socket] ✅ Verbunden');
    window.dispatchEvent(new Event('socket:reconnect'));
  });
  socket.on('connect_error', err => console.warn('[Socket] Verbindungsfehler:', err.message));
  socket.on('disconnect', reason => console.log('[Socket] Getrennt:', reason));

  return socket;
}

export function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}

export function getSocket() {
  return socket;
}
