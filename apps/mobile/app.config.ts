import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'GetMyHospital',
  slug: 'getmyhospital',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'lifelink',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#F4F7F2',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.getmyhospital.app',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'GetMyHospital uses your location to discover nearest hospital beds and compute accurate transit ETA in medical emergencies.',
      NSFaceIDUsageDescription:
        'GetMyHospital uses biometric authentication to secure your health identity and reservation holds.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0B3D1A',
    },
    package: 'com.getmyhospital.app',
    versionCode: 1,
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
          'GetMyHospital uses your location to discover nearest hospital beds and compute accurate transit ETA in medical emergencies.',
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          usesCleartextTraffic: true,
        },
      },
    ],
  ],
  extra: {
    eas: {
      projectId: 'your-eas-project-id',
    },
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://project1-api.vercel.app/api/v1',
    socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL || 'https://project1-api.vercel.app',
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
    googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
    useMocks: false,
  },
});
