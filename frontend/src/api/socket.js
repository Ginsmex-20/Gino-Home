import { io } from 'socket.io-client';

// Socket URL: In Produktion über nginx auf gleichem Origin (kein extra Port nötig!)
// In Dev-Modus direkt auf Backend-Port 3001
const getSocketURL = () => {
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  if (apiBase) return apiBase.replace(/\/api\/?$/, '');
  if (import.meta.env.DEV) return 'http://localhost:3001';
  return window.location.origin; // Produktion: nginx leitet /socket.io/ weiter
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

  socket.on('connect', () => console.log('[Socket] ✅ Verbunden'));
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
