import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Linking,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Siren, Phone, MapPin, Truck, X } from 'lucide-react-native';
import { colors, radius } from '../src/theme/tokens';
import { useLocation } from '../src/hooks/useLocation';
import { useAuthStore } from '../src/lib/auth/auth-store';
import { sosApi } from '../src/lib/api/sos.api';

export default function SosScreen() {
  const router = useRouter();
  const { location } = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [note, setNote] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: history = [] } = useQuery({
    queryKey: ['sos-mine'],
    queryFn: () => sosApi.listMine(),
    enabled: isAuthenticated,
    refetchInterval: 4000,
  });

  const active =
    history.find((s) => ['OPEN', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED'].includes(s.status)) ||
    history.find((s) => s.id === activeId);

  const { data: live } = useQuery({
    queryKey: ['sos-live', active?.id || activeId],
    queryFn: () => sosApi.getById((active?.id || activeId)!),
    enabled: Boolean(active?.id || activeId),
    refetchInterval: 3000,
  });

  const current = live || active;

  const createMut = useMutation({
    mutationFn: () =>
      sosApi.create({
        latitude: location.latitude,
        longitude: location.longitude,
        note: note.trim() || undefined,
        severity: 'CRITICAL',
      }),
    onSuccess: (data) => {
      setActiveId(data.id);
      qc.invalidateQueries({ queryKey: ['sos-mine'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => sosApi.cancel(id),
    onSuccess: () => {
      setActiveId(null);
      qc.invalidateQueries({ queryKey: ['sos-mine'] });
    },
  });

  if (!isAuthenticated) {
    return (
      <View style={styles.center}>
        <Siren color="#B91C1C" size={40} />
        <Text style={styles.title}>SOS Ambulance</Text>
        <Pressable style={styles.primary} onPress={() => router.push('/login')}>
          <Text style={styles.primaryText}>Sign in</Text>
        </Pressable>
      </View>
    );
  }

  const accepted = Boolean(current?.ambulance?.callSign);
  const inFlight = current && ['OPEN', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED'].includes(current.status);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>EMERGENCY · BHUBANESWAR</Text>
        <Text style={styles.heroTitle}>SOS</Text>
        <Text style={styles.heroSub}>Nearby ambulances notified. First to accept wins. Call 112.</Text>
      </View>

      <View style={styles.locRow}>
        <MapPin color="#B91C1C" size={18} />
        <Text style={styles.locText}>
          {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          {location.isDefault ? ' · default BBSR' : ''}
        </Text>
      </View>

      {!inFlight ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="What happened? (optional)"
            placeholderTextColor="#94A3B8"
            value={note}
            onChangeText={setNote}
            multiline
          />
          <Pressable
            style={[styles.sosBtn, createMut.isPending && { opacity: 0.6 }]}
            disabled={createMut.isPending}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              createMut.mutate();
            }}
          >
            {createMut.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.sosBtnText}>SEND SOS</Text>
            )}
          </Pressable>
        </>
      ) : (
        <View style={styles.liveCard}>
          <Text style={styles.liveStatus}>LIVE · {current!.status}</Text>
          <Text style={styles.liveGuide}>{current!.guidance || 'Waiting for ambulance…'}</Text>
          {accepted ? (
            <View style={styles.acceptBox}>
              <Truck color={colors.forest} size={20} />
              <View style={{ flex: 1 }}>
                <Text style={styles.acceptTitle}>{current!.ambulance?.callSign}</Text>
                <Text style={styles.acceptMeta}>
                  {current!.ambulance?.vehicleNo} · {current!.ambulance?.type}
                </Text>
                {!!current!.ambulance?.driverName && (
                  <Text style={styles.acceptMeta}>Driver: {current!.ambulance?.driverName}</Text>
                )}
              </View>
              {!!current!.ambulance?.phone && (
                <Pressable onPress={() => Linking.openURL(`tel:${current!.ambulance!.phone}`)}>
                  <Phone color={colors.forest} size={22} />
                </Pressable>
              )}
            </View>
          ) : (
            <Text style={styles.wait}>Broadcasting (first-come-first-serve)…</Text>
          )}
          <Pressable style={styles.cancel} onPress={() => cancelMut.mutate(current!.id)}>
            <X color="#64748B" size={14} />
            <Text style={styles.cancelText}>Cancel SOS</Text>
          </Pressable>
        </View>
      )}

      <Pressable style={styles.call112} onPress={() => Linking.openURL('tel:112')}>
        <Phone color={colors.forest} size={18} />
        <Text style={styles.call112Text}>Call 112 now</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF8F8' },
  content: { padding: 20, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  primary: { backgroundColor: colors.forest, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16 },
  primaryText: { color: colors.lime, fontWeight: '700' },
  hero: {
    backgroundColor: '#B91C1C',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
  },
  eyebrow: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  heroTitle: { color: '#fff', fontSize: 40, fontWeight: '900', marginTop: 6 },
  heroSub: { color: 'rgba(255,255,255,0.85)', marginTop: 8, fontSize: 14, lineHeight: 20 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  locText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: radius.lg,
    padding: 14,
    minHeight: 72,
    textAlignVertical: 'top',
    marginBottom: 12,
    color: colors.ink,
  },
  sosBtn: {
    backgroundColor: '#B91C1C',
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  sosBtnText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  liveCard: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  liveStatus: { color: '#B91C1C', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  liveGuide: { color: colors.ink, fontSize: 14 },
  acceptBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  acceptTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  acceptMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  wait: { color: '#EA580C', fontWeight: '700' },
  cancel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  cancelText: { color: '#64748B', fontWeight: '700', fontSize: 12 },
  call112: {
    height: 48,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.forest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  call112Text: { color: colors.forest, fontWeight: '800' },
});
