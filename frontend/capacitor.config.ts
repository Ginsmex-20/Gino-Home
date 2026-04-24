import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'de.ginsmex.ginohome',
  appName: 'Gino-Home',
  webDir: 'dist',

  // Verbindung zum gehosteten Backend (Railway-URL eintragen)
  // Wird für iOS/Android genutzt da localhost nicht erreichbar ist
  server: {
    url: process.env.CAPACITOR_SERVER_URL || 'https://DEINE-RAILWAY-URL.railway.app',
    cleartext: false,
    androidScheme: 'https',
  },

  ios: {
    contentInset: 'automatic',
    backgroundColor: '#161616',
    // App läuft im Dark Mode
    preferredContentMode: 'mobile',
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true,
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
