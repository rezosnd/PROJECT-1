import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../src/lib/auth/auth-store';
import { sosApi } from '../../src/lib/api/sos.api';
import { useLocation } from '../../src/hooks/useLocation';
import { colors, typography } from '../../src/theme/tokens';
import { HeartPulse } from 'lucide-react-native';

export default function UnitProfileScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const { location, requestLocation } = useLocation();
  const [goingAvailable, setGoingAvailable] = useState(false);

  const { data: unit, isLoading, refetch } = useQuery({
    queryKey: ['sos', 'ambulance', 'me'],
    queryFn: () => sosApi.myAmbulance(),
  });

  const goAvailable = async () => {
    setGoingAvailable(true);
    try {
      const loc = await requestLocation();
      await sosApi.heartbeat({
        latitude: loc.latitude,
        longitude: loc.longitude,
        status: 'AVAILABLE',
      });
      // Re-register push so SOS alerts work on this device
      try {
        const Notifications = await import('expo-notifications');
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('sos', {
            name: 'Emergency SOS',
            importance: Notifications.AndroidImportance.MAX,
            sound: 'default',
          });
        }
        const perm = await Notifications.requestPermissionsAsync();
        if (perm.status === 'granted') {
          const Constants = (await import('expo-constants')).default;
          const projectId = Constants.expoConfig?.extra?.eas?.projectId;
          const token = await Notifications.getExpoPushTokenAsync(
            projectId ? { projectId: String(projectId) } : undefined
          );
          if (token?.data) await sosApi.registerPushToken(token.data);
        }
      } catch {
        /* push optional */
      }
      await refetch();
      Alert.alert(
        'On duty',
        'Unit AVAILABLE. Keep the app open (or backgrounded with notifications allowed) to receive SOS.'
      );
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Heartbeat failed';
      Alert.alert('Could not go available', message);
    } finally {
      setGoingAvailable(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Unit profile</Text>
      </View>

      <View style={styles.card}>
        {user?.pictureUrl ? (
          <Image source={{ uri: user.pictureUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={{ fontWeight: '800', color: colors.forest }}>{(user?.name || 'A')[0]}</Text>
          </View>
        )}
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.meta}>{user?.email}</Text>

        {isLoading ? (
          <ActivityIndicator color={colors.forest} style={{ marginTop: 16 }} />
        ) : unit ? (
          <View style={styles.unitBlock}>
            <Text style={styles.unitTitle}>{unit.callSign}</Text>
            <Text style={styles.meta}>
              {unit.vehicleNo} · {unit.type}
            </Text>
            {unit.hospitalName ? <Text style={styles.meta}>{unit.hospitalName}</Text> : null}
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Fleet status</Text>
              <Text style={styles.statusBadge}>{unit.status}</Text>
            </View>
          </View>
        ) : (
          <Text style={[styles.meta, { marginTop: 12 }]}>
            Ambulance record not linked yet. Ask Hospital Admin to re-add your Gmail under Ambulance
            Access, then sign out and sign in again.
          </Text>
        )}
      </View>

      <Pressable style={styles.availableBtn} onPress={goAvailable} disabled={goingAvailable}>
        {goingAvailable ? (
          <ActivityIndicator color={colors.forest} />
        ) : (
          <>
            <HeartPulse color={colors.forest} size={20} />
            <Text style={styles.availableText}>Go available (heartbeat)</Text>
          </>
        )}
      </Pressable>
      <Text style={styles.coordsHint}>
        Last ping coords: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
      </Text>

      <Pressable
        style={styles.logout}
        onPress={async () => {
          await logout();
          router.replace('/login');
        }}
      >
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.forest,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  headerTitle: { ...typography.display, fontSize: 24, color: '#fff' },
  card: {
    margin: 20,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: { width: 72, height: 72, borderRadius: 36, marginBottom: 12 },
  avatarFallback: {
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...typography.title, color: colors.ink },
  meta: { color: colors.muted, marginTop: 4, textAlign: 'center' },
  unitBlock: { marginTop: 16, alignItems: 'center', width: '100%' },
  unitTitle: { ...typography.title, color: colors.forest },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  statusLabel: { color: colors.muted, fontSize: 13 },
  statusBadge: {
    backgroundColor: colors.lime,
    color: colors.forest,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  availableBtn: {
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.lime,
    borderRadius: 16,
    paddingVertical: 14,
  },
  availableText: { ...typography.title, color: colors.forest, fontSize: 16 },
  coordsHint: { textAlign: 'center', color: colors.muted, fontSize: 11, marginTop: 8 },
  logout: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: colors.forest,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: colors.lime, fontWeight: '800' },
});
