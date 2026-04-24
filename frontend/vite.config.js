import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Für Electron: relative Pfade (kein '/')
  base: process.env.VITE_ELECTRON ? './' : '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Für Electron wichtig: keine source maps in Production
    sourcemap: false,
  },
  server: {
    port: 5173,
    proxy: {
      '/api':     { target: 'http://localhost:3001', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3001', changeOrigin: true }
    }
  }
});
