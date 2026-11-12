import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'GetMyHospital Ambulance',
  slug: 'getmyhospital-ambulance',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'gmhambulance',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0B3D1A',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.getmyhospital.ambulance',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'GetMyHospital Ambulance uses your location to receive nearby SOS dispatches and report your unit position to patients.',
      UIBackgroundModes: ['location'],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0B3D1A',
    },
    package: 'com.getmyhospital.ambulance',
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Allow GetMyHospital Ambulance to access your location for SOS dispatch and live unit tracking.',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#0B3D1A',
      },
    ],
  ],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://project1-api.vercel.app/api/v1',
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || undefined,
    },
  },
});
