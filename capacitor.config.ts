import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAPACITOR_SERVER_URL || 'http://10.0.2.2:3000';

const config: CapacitorConfig = {
  appId: 'com.aspirantbook.app',
  appName: 'aspirantbook',
  webDir: 'public',
  appendUserAgent: ' AspirantBookApp/1.0',
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith('http://'),
    androidScheme: 'https',
    allowNavigation: [
      '10.0.2.2',
      '10.0.2.2:*',
      'localhost',
      'localhost:*',
      '127.0.0.1',
      '127.0.0.1:*',
      'aspirantbook.com',
      '*.aspirantbook.com',
      'trillionskill.com',
      '*.trillionskill.com',
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0F172A',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0F172A',
    },
  },
};

export default config;
