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
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: false,
        category: ['BROWSABLE', 'DEFAULT'],
        data: [{ scheme: 'gmhdoctor' }],
      },
    ],
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
    eas: {
      projectId: '9517043f-119d-4e4c-b9ed-3951a6b81fe5',
    },
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://project1-api.vercel.app/api/v1',
    googleWebClientId:
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
      '1050173417910-28c0irqqh1nhaurmognqn01c9ocvo6pb.apps.googleusercontent.com',
  },
});
