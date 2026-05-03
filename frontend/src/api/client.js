import axios from 'axios';
import { Capacitor } from '@capacitor/core';

// API-URL automatisch erkennen:
// 1. Capacitor (iOS/Android) → ginohome.de (oder VITE_API_BASE_URL)
// 2. Electron (file://)      → lokales Backend localhost:3001
// 3. Web                     → relativer Pfad /api (nginx-Proxy)
const getBaseURL = () => {
  // Capacitor Native App (iOS / Android)
  if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()) {
    return import.meta.env.VITE_API_BASE_URL || 'https://ginohome.de/api';
  }
  // Electron Desktop App (file:// Protokoll)
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    return 'http://localhost:3001/api';
  }
  // Web / Dev (nginx-Proxy oder VITE_API_BASE_URL)
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
