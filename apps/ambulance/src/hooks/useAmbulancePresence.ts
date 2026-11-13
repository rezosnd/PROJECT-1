import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../lib/auth/auth-store';
import { useLocation } from './useLocation';
import { sosApi } from '../lib/api/sos.api';
import { useActiveSosStore } from '../store/active-sos-store';

const SOS_CHANNEL = 'sos';
const HEARTBEAT_MS = 20_000;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(SOS_CHANNEL, {
    name: 'Emergency SOS',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#A8E017',
    sound: 'default',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
  });
}

async function registerExpoPushToken() {
  if (Platform.OS === 'web') return null;
  await ensureAndroidChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.warn('[Ambulance] Notification permission not granted');
    return null;
  }

  if (Platform.OS === 'android' && Platform.Version >= 33) {
    // POST_NOTIFICATIONS is requested via PermissionsAndroid by expo-notifications
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId ||
    undefined;

  try {
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId: String(projectId) } : undefined
    );
    if (token?.data) {
      await sosApi.registerPushToken(token.data);
      return token.data;
    }
  } catch (err) {
    console.warn('[Ambulance] Push token registration failed', err);
  }
  return null;
}

export function useAmbulancePresence() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { location, requestLocation } = useLocation();
  const sosId = useActiveSosStore((s) => s.sosId);
  const setActiveSos = useActiveSosStore((s) => s.setActiveSos);
  const liveLocation = useRef(location);
  liveLocation.current = location;
  const router = useRouter();
  const queryClient = useQueryClient();

  // Push permission + token + tap-to-open
  useEffect(() => {
    if (!isAuthenticated) return;
    let subReceived: Notifications.Subscription | null = null;
    let subResponse: Notifications.Subscription | null = null;

    void (async () => {
      await requestLocation();
      await registerExpoPushToken();

      subReceived = Notifications.addNotificationReceivedListener(() => {
        void queryClient.invalidateQueries({ queryKey: ['sos'] });
      });

      subResponse = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as {
          type?: string;
          sosId?: string;
        };
        void queryClient.invalidateQueries({ queryKey: ['sos'] });
        if (data?.sosId && (data.type === 'SOS' || data.type === 'SOS_OFFER')) {
          router.push('/(tabs)');
        }
        if (data?.sosId && data.type === 'SOS_CANCELLED') {
          void setActiveSos(null);
        }
      });

      const last = await Notifications.getLastNotificationResponseAsync();
      const data = last?.notification.request.content.data as { sosId?: string; type?: string } | undefined;
      if (data?.sosId && data.type === 'SOS') {
        router.push('/(tabs)');
      }
    })();

    // Re-register token periodically (and after returning to foreground)
    const tokenRefresh = setInterval(() => {
      void registerExpoPushToken();
    }, 15 * 60_000);

    return () => {
      subReceived?.remove();
      subResponse?.remove();
      clearInterval(tokenRefresh);
    };
  }, [isAuthenticated]);

  // Location heartbeat — keep unit AVAILABLE when idle so new SOS can be accepted
  useEffect(() => {
    if (!isAuthenticated) return;

    const sendHeartbeat = async () => {
      const loc = liveLocation.current;
      // Idle → AVAILABLE (recovers stuck EN_ROUTE/BUSY). Active job → EN_ROUTE.
      const unitStatus = sosId ? 'EN_ROUTE' : 'AVAILABLE';
      try {
        await sosApi.heartbeat({
          latitude: loc.latitude,
          longitude: loc.longitude,
          status: unitStatus,
        });
      } catch {
        /* retry next tick */
      }
    };

    void sendHeartbeat();
    const interval = setInterval(() => {
      void requestLocation().then(() => sendHeartbeat());
    }, HEARTBEAT_MS);

    return () => clearInterval(interval);
  }, [isAuthenticated, sosId]);
}
