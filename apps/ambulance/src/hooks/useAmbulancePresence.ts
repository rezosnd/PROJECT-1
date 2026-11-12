import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useAuthStore } from '../lib/auth/auth-store';
import { useLocation } from './useLocation';
import { sosApi } from '../lib/api/sos.api';
import { useActiveSosStore } from '../store/active-sos-store';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const HEARTBEAT_MS = 20_000;

async function registerExpoPushToken() {
  if (Platform.OS === 'web') return;
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants.expoConfig as { extra?: { eas?: { projectId?: string } } })?.extra?.eas?.projectId;

  try {
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId: String(projectId) } : undefined
    );
    if (token.data) await sosApi.registerPushToken(token.data);
  } catch {
    // Push may be unavailable in Expo Go without EAS project id
  }
}

export function useAmbulancePresence() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { location, requestLocation } = useLocation();
  const sosId = useActiveSosStore((s) => s.sosId);
  const liveLocation = useRef(location);
  liveLocation.current = location;

  useEffect(() => {
    if (!isAuthenticated) return;
    void (async () => {
      await requestLocation();
      await registerExpoPushToken();
    })();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const sendHeartbeat = async () => {
      const loc = liveLocation.current;
      const unitStatus = sosId ? 'EN_ROUTE' : 'AVAILABLE';
      try {
        await sosApi.heartbeat({
          latitude: loc.latitude,
          longitude: loc.longitude,
          status: unitStatus,
        });
      } catch {
        // Offline or permission — retry on next tick
      }
    };

    sendHeartbeat();
    const interval = setInterval(() => {
      void requestLocation().then(() => sendHeartbeat());
    }, HEARTBEAT_MS);

    return () => clearInterval(interval);
  }, [isAuthenticated, sosId]);
}
