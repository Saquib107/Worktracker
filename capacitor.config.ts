import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pgepl.worktracker',
  appName: 'PGEPL Work Tracker',
  webDir: 'public',
  server: {
    url: 'https://worktracker-one-amber.vercel.app',
    cleartext: true
  }
};

export default config;
