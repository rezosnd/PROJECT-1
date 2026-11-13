import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { sosApi, SosRequest, SosStatus } from '../../src/lib/api/sos.api';
import { useActiveSosStore } from '../../src/store/active-sos-store';
import { colors, typography } from '../../src/theme/tokens';
import { Navigation, CheckCircle2, MapPin, Phone, Navigation2 } from 'lucide-react-native';

const NEXT_STATUS: Partial<
  Record<SosStatus, { status: 'EN_ROUTE' | 'ARRIVED' | 'COMPLETED'; label: string }>
> = {
  ACCEPTED: { status: 'EN_ROUTE', label: 'Start — En route' },
  EN_ROUTE: { status: 'ARRIVED', label: 'Arrived on scene' },
  ARRIVED: { status: 'COMPLETED', label: 'Complete handoff' },
};

function openDrivingRoute(lat: number, lng: number, label?: string) {
  const dest = `${lat},${lng}`;
  const encodedLabel = encodeURIComponent(label || 'Patient SOS');
  const google = `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
  const native =
    Platform.OS === 'ios'
      ? `maps://?daddr=${dest}&dirflg=d&q=${encodedLabel}`
      : `google.navigation:q=${dest}`;

  Linking.openURL(native).catch(() => {
    Linking.openURL(google).catch(() => {
      Alert.alert('Maps unavailable', 'Install Google Maps or Apple Maps to navigate.');
    });
  });
}

export default function ActiveJobScreen() {
  const sosId = useActiveSosStore((s) => s.sosId);
  const setActiveSos = useActiveSosStore((s) => s.setActiveSos);
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState(false);

  const { data: job, isLoading, refetch, isRefetching, error } = useQuery({
    queryKey: ['sos', 'active', sosId],
    queryFn: () => (sosId ? sosApi.getById(sosId) : Promise.reject(new Error('no id'))),
    enabled: Boolean(sosId),
    refetchInterval: 8000,
  });

  const next = useMemo(() => (job ? NEXT_STATUS[job.status] : undefined), [job?.status]);

  useEffect(() => {
    if (!job) return;
    if (job.status === 'COMPLETED' || job.status === 'CANCELLED' || job.status === 'EXPIRED') {
      void setActiveSos(null);
    }
  }, [job?.status]);

  const updateStatus = async (status: 'EN_ROUTE' | 'ARRIVED' | 'COMPLETED') => {
    if (!sosId || updating) return;
    setUpdating(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const updated = await sosApi.updateStatus(sosId, status);
      await queryClient.invalidateQueries({ queryKey: ['sos'] });

      if (status === 'EN_ROUTE' && updated.latitude != null && updated.longitude != null) {
        // Auto-open turn-by-turn when driver starts the run
        openDrivingRoute(updated.latitude, updated.longitude, updated.patientName || 'Patient');
      }

      if (status === 'COMPLETED') {
        await setActiveSos(null);
        Alert.alert('Handoff complete', 'Unit is available for the next SOS.');
      } else if (status === 'ARRIVED') {
        Alert.alert('On scene', 'Marked arrived. Complete handoff when patient is transferred.');
      }

      await refetch();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Status update failed';
      Alert.alert('Update failed', message);
      await refetch();
    } finally {
      setUpdating(false);
    }
  };

  if (!sosId) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Active job</Text>
        </View>
        <View style={styles.empty}>
          <Navigation color={colors.muted} size={40} />
          <Text style={styles.emptyTitle}>No active dispatch</Text>
          <Text style={styles.emptySub}>Accept an SOS from the offers tab to begin a run.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading || (!job && !error)) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.forest} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Active job</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Could not load job</Text>
          <Text style={styles.emptySub}>
            {(error as Error)?.message || 'Pull to retry or accept a new SOS.'}
          </Text>
          <Pressable style={styles.actionBtn} onPress={() => refetch()}>
            <Text style={styles.actionText}>Retry</Text>
          </Pressable>
          <Pressable onPress={() => setActiveSos(null)} style={{ marginTop: 12 }}>
            <Text style={styles.refresh}>Clear stuck job</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const canNavigate = job.latitude != null && job.longitude != null;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Active job</Text>
        <Text style={styles.headerSub}>Navigate → En route → Arrived → Complete</Text>
      </View>

      <ScrollView contentContainerStyle={styles.panel}>
        <JobSummary job={job} />

        <Text style={styles.statusLabel}>Current status</Text>
        <Text style={styles.statusValue}>{job.status.replace(/_/g, ' ')}</Text>

        {canNavigate ? (
          <Pressable
            style={styles.navBtn}
            onPress={() =>
              openDrivingRoute(job.latitude!, job.longitude!, job.patientName || job.addressText || undefined)
            }
          >
            <Navigation2 color="#fff" size={22} />
            <View style={{ flex: 1 }}>
              <Text style={styles.navTitle}>Open route in Maps</Text>
              <Text style={styles.navSub}>Turn-by-turn to patient GPS</Text>
            </View>
          </Pressable>
        ) : (
          <Text style={styles.warn}>Patient location missing — ask for address / call them.</Text>
        )}

        {job.patientPhone ? (
          <Pressable
            style={styles.callBtn}
            onPress={() => Linking.openURL(`tel:${job.patientPhone}`)}
          >
            <Phone color={colors.forest} size={20} />
            <Text style={styles.callText}>Call patient · {job.patientPhone}</Text>
          </Pressable>
        ) : null}

        {next ? (
          <Pressable
            style={[styles.actionBtn, next.status === 'COMPLETED' && styles.actionComplete]}
            onPress={() => updateStatus(next.status)}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color={colors.forest} />
            ) : next.status === 'COMPLETED' ? (
              <CheckCircle2 color={colors.forest} size={22} />
            ) : (
              <Navigation color={colors.forest} size={22} />
            )}
            <Text style={styles.actionText}>{next.label}</Text>
          </Pressable>
        ) : (
          <Text style={styles.metaCenter}>No further actions for this status.</Text>
        )}

        <View style={styles.steps}>
          {['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'COMPLETED'].map((s) => {
            const done =
              ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'COMPLETED'].indexOf(job.status) >=
              ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'COMPLETED'].indexOf(s);
            return (
              <View key={s} style={[styles.stepDot, done && styles.stepDotOn]}>
                <Text style={[styles.stepText, done && styles.stepTextOn]}>
                  {s.replace('_', ' ')}
                </Text>
              </View>
            );
          })}
        </View>

        {isRefetching ? (
          <Text style={styles.syncing}>Syncing…</Text>
        ) : (
          <Pressable onPress={() => refetch()}>
            <Text style={styles.refresh}>Refresh status</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function JobSummary({ job }: { job: SosRequest }) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryRow}>
        <Text style={styles.severity}>{job.severity}</Text>
        {job.patientName ? <Text style={styles.patient}>{job.patientName}</Text> : null}
      </View>
      {job.note ? <Text style={styles.note}>{job.note}</Text> : null}
      {job.addressText ? (
        <View style={styles.row}>
          <MapPin color={colors.lime} size={16} />
          <Text style={styles.address}>{job.addressText}</Text>
        </View>
      ) : null}
      {job.latitude != null && job.longitude != null ? (
        <Text style={styles.coords}>
          GPS {job.latitude.toFixed(5)}, {job.longitude.toFixed(5)}
        </Text>
      ) : null}
    </View>
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
  headerSub: { color: 'rgba(255,255,255,0.75)', marginTop: 4, fontSize: 14 },
  panel: { padding: 20, paddingBottom: 40 },
  summaryCard: {
    backgroundColor: colors.red,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: colors.lime,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  severity: { color: colors.lime, fontWeight: '800', fontSize: 13 },
  patient: { color: '#fff', fontWeight: '700', fontSize: 17 },
  note: { color: 'rgba(255,255,255,0.9)', marginBottom: 8, lineHeight: 20 },
  row: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  address: { flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  coords: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 8 },
  statusLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  statusValue: { ...typography.title, color: colors.ink, marginBottom: 14 },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0B3D1A',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  navTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  navSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  callText: { fontWeight: '700', color: colors.forest, fontSize: 15 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.lime,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  actionComplete: { backgroundColor: '#D9F99D' },
  actionText: { ...typography.title, color: colors.forest, fontSize: 16 },
  warn: { color: '#B45309', marginBottom: 12, fontWeight: '600' },
  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, marginBottom: 8 },
  stepDot: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  stepDotOn: { backgroundColor: colors.forest },
  stepText: { fontSize: 10, fontWeight: '800', color: colors.muted, textTransform: 'uppercase' },
  stepTextOn: { color: colors.lime },
  syncing: { color: colors.muted, textAlign: 'center', marginTop: 8 },
  refresh: { color: colors.forest, textAlign: 'center', marginTop: 12, fontWeight: '700' },
  metaCenter: { color: colors.muted, textAlign: 'center', marginVertical: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  emptyTitle: { ...typography.title, color: colors.ink },
  emptySub: { color: colors.muted, textAlign: 'center' },
});
