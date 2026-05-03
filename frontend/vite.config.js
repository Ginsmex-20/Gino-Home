import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  // electron-Mode → relative Pfade (file://) | mobile/web → absolut
  base: mode === 'electron' ? './' : '/',

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },

  server: {
    port: 5173,
    proxy: {
      '/api':       { target: 'http://localhost:3001', changeOrigin: true },
      '/uploads':   { target: 'http://localhost:3001', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3001', changeOrigin: true, ws: true },
    },
  },
}));
