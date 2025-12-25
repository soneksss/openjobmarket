import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'OpenJobMarket',
  slug: 'openjobmarket',
  version: '1.0.0',

  android: {
    package: 'com.anonymous.openjobmarket',
  },

  extra: {
    eas: {
      projectId: undefined, // Expo will fill this after eas init
    },
  },
};

export default config;
