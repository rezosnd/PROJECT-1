import React from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { referralsApi } from '../../src/lib/api/referrals.api';
import { colors, typography } from '../../src/theme/tokens';

export default function ReferralsScreen() {
  const { data = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['doctor-referrals'],
    queryFn: () => referralsApi.listMine(),
  });

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>My referrals</Text>
      <Text style={styles.sub}>Holds created from your scans stay visible here.</Text>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={
          <Text style={styles.empty}>{isLoading ? 'Loading…' : 'No referrals yet. Scan a Care QR.'}</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.name}>{item.patientName || 'Patient'}</Text>
              <Text style={styles.badge}>{item.status}</Text>
            </View>
            <Text style={styles.meta}>
              → {item.toHospitalName}
              {item.toDepartmentName ? ` · ${item.toDepartmentName}` : ''}
            </Text>
            <Text style={styles.meta}>
              {item.urgency} · {item.recommendedWard || 'ward TBD'}
              {item.bedRequestId ? ' · hold placed' : ''}
            </Text>
            {item.reason ? <Text style={styles.reason}>{item.reason}</Text> : null}
            <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 40, gap: 10 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: 20 },
  title: { ...typography.display, fontSize: 24, color: colors.ink },
  sub: { color: colors.muted, marginBottom: 16, marginTop: 4 },
  empty: { color: colors.muted, marginTop: 40, textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontWeight: '800', fontSize: 16, color: colors.ink },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.forest,
    backgroundColor: colors.lime,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  meta: { color: colors.muted, marginTop: 4, fontSize: 13 },
  reason: { marginTop: 8, color: colors.ink, fontSize: 13 },
  time: { marginTop: 8, fontSize: 11, color: colors.muted },
});
