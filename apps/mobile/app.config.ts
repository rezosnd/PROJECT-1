import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'LifeLink',
  slug: 'lifelink-cityhealth',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'lifelink',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.lifelink.cityhealth',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'LifeLink uses your location to discover nearest hospital beds and compute accurate transit ETA in medical emergencies.',
      NSFaceIDUsageDescription:
        'LifeLink uses biometric authentication to secure your health identity and reservation holds.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#F3F3F3',
    },
    package: 'com.lifelink.cityhealth',
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'USE_BIOMETRIC',
      'USE_FINGERPRINT',
    ],
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-localization',
    'expo-font',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'LifeLink uses your location to discover nearest hospital beds and compute accurate transit ETA in medical emergencies.',
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          // Allows cleartext HTTP traffic to local PC LAN IP during development builds
          usesCleartextTraffic: true,
        },
      },
    ],
  ],
  extra: {
    eas: {
      projectId: 'your-eas-project-id',
    },
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://10.5.114.133:5000/api/v1',
    socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL || 'http://10.5.114.133:5000',
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
    googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
    useMocks: false,
  },
});

