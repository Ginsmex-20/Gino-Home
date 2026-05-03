import axios from 'axios';
import { Capacitor } from '@capacitor/core';

// API-URL automatisch erkennen:
// 1. Capacitor (iOS/Android Native)  → https://ginohome.de/api
// 2. Web / Electron (lädt ginohome.de) → relativer Pfad /api (nginx-Proxy)
// 3. Dev                              → Vite-Proxy auf localhost:3001
const getBaseURL = () => {
  // Capacitor Native App (iOS / Android)
  if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()) {
    return import.meta.env.VITE_API_BASE_URL || 'https://ginohome.de/api';
  }
  // Alle anderen (Web, Electron laden ginohome.de → /api via nginx)
  return import.meta.env.VITE_API_BASE_URL || '/api';
};

const api = axios.create({ baseURL: getBaseURL() });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r.data,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err.response?.data || err);
  }
);

export default api;
