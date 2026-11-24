import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.viraj.sonsuzotoyol',
  appName: 'Viraj — Sonsuz Otoyol',
  webDir: 'dist',
  backgroundColor: '#09090b',
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#09090b',
    allowMixedContent: false,
    captureInput: false,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: false,
      backgroundColor: '#09090b',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
      backgroundColor: '#09090b',
    },
    LocalNotifications: {
      iconColor: '#f59e0b',
    },
  },
};

export default config;
