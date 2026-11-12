import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { sosApi, SosRequest, SosStatus } from '../../src/lib/api/sos.api';
import { useActiveSosStore } from '../../src/store/active-sos-store';
import { colors, typography } from '../../src/theme/tokens';
import { Navigation, CheckCircle2, MapPin } from 'lucide-react-native';

const STATUS_FLOW: Array<{ status: 'EN_ROUTE' | 'ARRIVED' | 'COMPLETED'; label: string }> = [
  { status: 'EN_ROUTE', label: 'En route' },
  { status: 'ARRIVED', label: 'Arrived on scene' },
  { status: 'COMPLETED', label: 'Complete handoff' },
];

function nextActions(current: SosStatus) {
  if (current === 'ACCEPTED') return STATUS_FLOW;
  if (current === 'EN_ROUTE') return STATUS_FLOW.slice(1);
  if (current === 'ARRIVED') return STATUS_FLOW.slice(2);
  return [];
}

export default function ActiveJobScreen() {
  const sosId = useActiveSosStore((s) => s.sosId);
  const setActiveSos = useActiveSosStore((s) => s.setActiveSos);
  const queryClient = useQueryClient();

  const { data: job, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['sos', 'active', sosId],
    queryFn: () => (sosId ? sosApi.getById(sosId) : Promise.reject(new Error('no id'))),
    enabled: Boolean(sosId),
    refetchInterval: 10000,
  });

  const actions = useMemo(() => (job ? nextActions(job.status) : []), [job]);

  useEffect(() => {
    if (!job) return;
    if (job.status === 'COMPLETED' || job.status === 'CANCELLED' || job.status === 'EXPIRED') {
      void setActiveSos(null);
    }
  }, [job?.status]);

  const updateStatus = async (status: 'EN_ROUTE' | 'ARRIVED' | 'COMPLETED') => {
    if (!sosId) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await sosApi.updateStatus(sosId, status);
      if (status === 'COMPLETED') {
        await setActiveSos(null);
      }
      await queryClient.invalidateQueries({ queryKey: ['sos'] });
      await refetch();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Status update failed';
      Alert.alert('Update failed', message);
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

  if (isLoading || !job) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.forest} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Active job</Text>
        <Text style={styles.headerSub}>Update patient status as you respond</Text>
      </View>

      <View style={styles.panel}>
        <JobSummary job={job} />
        <Text style={styles.statusLabel}>Current status</Text>
        <Text style={styles.statusValue}>{job.status.replace('_', ' ')}</Text>

        {actions.map((action) => (
          <Pressable
            key={action.status}
            style={[styles.actionBtn, action.status === 'COMPLETED' && styles.actionComplete]}
            onPress={() => updateStatus(action.status)}
          >
            {action.status === 'COMPLETED' ? (
              <CheckCircle2 color={colors.forest} size={20} />
            ) : (
              <Navigation color={colors.forest} size={20} />
            )}
            <Text style={styles.actionText}>{action.label}</Text>
          </Pressable>
        ))}

        {isRefetching ? (
          <Text style={styles.syncing}>Syncing…</Text>
        ) : (
          <Pressable onPress={() => refetch()}>
            <Text style={styles.refresh}>Refresh status</Text>
          </Pressable>
        )}
      </View>
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
          {job.latitude.toFixed(5)}, {job.longitude.toFixed(5)}
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
  panel: { padding: 20 },
  summaryCard: {
    backgroundColor: colors.red,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: colors.lime,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  severity: { color: colors.lime, fontWeight: '800', fontSize: 13 },
  patient: { color: '#fff', fontWeight: '700', fontSize: 17 },
  note: { color: 'rgba(255,255,255,0.9)', marginBottom: 8, lineHeight: 20 },
  row: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  address: { flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  coords: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 8 },
  statusLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  statusValue: { ...typography.title, color: colors.ink, marginBottom: 16 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.lime,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  actionComplete: { backgroundColor: '#D9F99D' },
  actionText: { ...typography.title, color: colors.forest, fontSize: 16 },
  syncing: { color: colors.muted, textAlign: 'center', marginTop: 8 },
  refresh: { color: colors.forest, textAlign: 'center', marginTop: 12, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  emptyTitle: { ...typography.title, color: colors.ink },
  emptySub: { color: colors.muted, textAlign: 'center' },
});
