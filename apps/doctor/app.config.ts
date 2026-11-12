import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'GetMyHospital Doctor',
  slug: 'getmyhospital-doctor',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'gmhdoctor',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0B3D1A',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.getmyhospital.doctor',
    infoPlist: {
      NSCameraUsageDescription:
        'Scan the patient Care QR on their GetMyHospital profile to open their clinical details and refer them.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0B3D1A',
    },
    package: 'com.getmyhospital.doctor',
    permissions: ['CAMERA'],
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-camera',
      {
        cameraPermission:
          'Allow GetMyHospital Doctor to scan patient Care QR codes for referral.',
      },
    ],
  ],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://project1-api.vercel.app/api/v1',
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
  },
});
