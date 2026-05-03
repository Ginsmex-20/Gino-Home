import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'de.ginsmex.ginohome',
  appName: 'Gino-Home',
  webDir: 'dist',

  // Kein server.url → App lädt die lokal gebundelte React-App (dist/)
  // API-Calls gehen an https://ginohome.de (gesetzt via VITE_API_BASE_URL beim Build)
  android: {
    backgroundColor: '#0f0f0f',
    allowMixedContent: false,
  },

  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0f0f0f',
    preferredContentMode: 'mobile',
    scrollEnabled: true,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#161616',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#161616',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
