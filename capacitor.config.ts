import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mediacenter.commandcenter',
  appName: 'Media Command Center',
  webDir: 'out',
  server: {
    url: 'https://media-command-center-plum.vercel.app',
    cleartext: false,
  },
};

export default config;