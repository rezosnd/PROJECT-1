import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { sosApi, SosRequest } from '../../src/lib/api/sos.api';
import { useActiveSosStore } from '../../src/store/active-sos-store';
import { colors, typography } from '../../src/theme/tokens';
import { AlertTriangle, MapPin } from 'lucide-react-native';

function formatDistance(offer: SosRequest) {
  if (offer.distanceKm != null) return `${offer.distanceKm} km`;
  if (offer.distanceM != null) return `${(offer.distanceM / 1000).toFixed(1)} km`;
  return '—';
}

function OfferCard({
  offer,
  accepting,
  onAccept,
}: {
  offer: SosRequest;
  accepting: boolean;
  onAccept: () => void;
}) {
  const critical = offer.severity === 'CRITICAL';
  return (
    <View style={[styles.card, critical && styles.cardCritical]}>
      <View style={styles.cardHeader}>
        <View style={styles.severityPill}>
          <AlertTriangle color="#fff" size={14} />
          <Text style={styles.severityText}>{offer.severity}</Text>
        </View>
        <Text style={styles.distance}>{formatDistance(offer)}</Text>
      </View>
      {offer.patientName ? <Text style={styles.patient}>{offer.patientName}</Text> : null}
      {offer.note ? <Text style={styles.note}>{offer.note}</Text> : null}
      {offer.addressText ? (
        <View style={styles.row}>
          <MapPin color={colors.lime} size={14} />
          <Text style={styles.address} numberOfLines={2}>
            {offer.addressText}
          </Text>
        </View>
      ) : null}
      <Text style={styles.fcfs}>First ambulance to accept wins this dispatch.</Text>
      <Pressable
        style={[styles.acceptBtn, accepting && styles.acceptBtnDisabled]}
        onPress={onAccept}
        disabled={accepting}
      >
        {accepting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.acceptText}>ACCEPT SOS</Text>
        )}
      </Pressable>
    </View>
  );
}

export default function SosOffersScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setActiveSos = useActiveSosStore((s) => s.setActiveSos);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['sos', 'offers'],
    queryFn: () => sosApi.listOffers(),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const accept = async (id: string) => {
    setAcceptingId(id);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const job = await sosApi.accept(id);
      await setActiveSos(job.id);
      await queryClient.invalidateQueries({ queryKey: ['sos'] });
      router.push('/(tabs)/active');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Could not accept this SOS';
      Alert.alert('Accept failed', message);
      void refetch();
    } finally {
      setAcceptingId(null);
    }
  };

  const offers = data ?? [];

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live SOS offers</Text>
        <Text style={styles.headerSub}>
          Stay Available · allow notifications · first accept wins
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.forest} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not load offers. Pull to retry.</Text>
        </View>
      ) : (
        <FlatList
          data={offers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={offers.length === 0 ? styles.emptyWrap : styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.forest} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No open SOS requests</Text>
              <Text style={styles.emptySub}>
                Heartbeat is active. New patient emergencies will appear here automatically.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <OfferCard
              offer={item}
              accepting={acceptingId === item.id}
              onAccept={() => accept(item.id)}
            />
          )}
        />
      )}
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
  headerSub: { color: 'rgba(255,255,255,0.75)', marginTop: 4, fontSize: 14 },
  list: { padding: 16, gap: 14 },
  card: {
    backgroundColor: colors.red,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#9F1239',
  },
  cardCritical: {
    borderColor: colors.lime,
    shadowColor: colors.lime,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  severityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  severityText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  distance: { color: colors.lime, fontWeight: '800', fontSize: 18 },
  patient: { color: '#fff', fontWeight: '700', fontSize: 17, marginBottom: 6 },
  note: { color: 'rgba(255,255,255,0.92)', fontSize: 15, lineHeight: 21, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 8 },
  address: { flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  fcfs: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 14, fontStyle: 'italic' },
  acceptBtn: {
    backgroundColor: colors.lime,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  acceptBtnDisabled: { opacity: 0.7 },
  acceptText: { ...typography.title, color: colors.forest, fontSize: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: colors.muted, textAlign: 'center' },
  emptyWrap: { flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { ...typography.title, color: colors.ink, marginBottom: 8 },
  emptySub: { color: colors.muted, textAlign: 'center', lineHeight: 20 },
});
