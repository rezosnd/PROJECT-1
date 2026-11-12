import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bloodApi, BloodGroup, BloodComponent } from '../../src/lib/api/blood.api';
import { useAuthStore } from '../../src/lib/auth/auth-store';
import { typography } from '../../src/theme/tokens';
import { Droplets, MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

const GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const COMPONENTS: { code: BloodComponent; label: string }[] = [
  { code: 'PRBC', label: 'PRBC' },
  { code: 'WHOLE_BLOOD', label: 'Whole' },
  { code: 'FFP', label: 'FFP' },
  { code: 'PLATELETS', label: 'Platelets' },
  { code: 'CRYOPRECIPITATE', label: 'Cryo' },
];
const BBSR = { lat: 20.2961, lng: 85.8245 };

/** Blood bank finder — uses the former equipment tab slot. */
export default function BloodBankScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const profileBg = (user?.profile?.bloodGroup as BloodGroup) || 'O+';
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>(
    GROUPS.includes(profileBg) ? profileBg : 'O+'
  );
  const [component, setComponent] = useState<BloodComponent>('PRBC');
  const [units, setUnits] = useState('1');
  const [reason, setReason] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['mobile-blood-banks', bloodGroup, component],
    queryFn: () =>
      bloodApi.searchBanks({
        lat: BBSR.lat,
        lng: BBSR.lng,
        bloodGroup,
        component,
        radiusKm: 30,
      }),
  });

  const banks = data?.banks || [];
  const selected = useMemo(
    () => banks.find((b) => b.hospitalId === selectedId) || null,
    [banks, selectedId]
  );

  const holdMut = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('Select a blood bank');
      return bloodApi.createRequest({
        hospitalId: selected.hospitalId,
        bloodGroup,
        component,
        unitsRequested: Math.max(1, Number(units) || 1),
        urgency: 'URGENT',
        reason: reason || undefined,
      });
    },
    onSuccess: (req) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['my-blood-requests'] });
      Alert.alert(
        'Blood hold placed',
        `30-min hold at ${req.hospitalName || selected?.name}. Reception will confirm after crossmatch.`,
        [{ text: 'My requests', onPress: () => router.push('/(tabs)/requests') }, { text: 'OK' }]
      );
      setSelectedId(null);
      refetch();
    },
    onError: (err: any) => {
      Alert.alert(
        'Could not hold',
        err?.response?.data?.error?.message || err.message || 'Try again'
      );
    },
  });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Droplets size={14} color="#0B3D1A" />
            <Text style={styles.badgeText}>BLOOD BANK · 30-MIN HOLD</Text>
          </View>
          <Text style={styles.title}>Find blood</Text>
          <Text style={styles.sub}>
            See stock by group, hold units for hospital reception. Not a permanent booking.
          </Text>
        </View>

        <Text style={styles.label}>Blood group</Text>
        <View style={styles.row}>
          {GROUPS.map((g) => (
            <Pressable
              key={g}
              onPress={() => {
                Haptics.selectionAsync();
                setBloodGroup(g);
              }}
              style={[styles.chip, bloodGroup === g && styles.chipOn]}
            >
              <Text style={[styles.chipText, bloodGroup === g && styles.chipTextOn]}>{g}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Component</Text>
        <View style={styles.row}>
          {COMPONENTS.map((c) => (
            <Pressable
              key={c.code}
              onPress={() => setComponent(c.code)}
              style={[styles.chip, component === c.code && styles.chipLime]}
            >
              <Text style={[styles.chipText, component === c.code && styles.chipTextForest]}>
                {c.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.listHead}>
          <Text style={styles.listTitle}>
            {isFetching ? 'Searching…' : `${banks.length} banks nearby`}
          </Text>
          <Pressable onPress={() => refetch()}>
            <Text style={styles.refresh}>Refresh</Text>
          </Pressable>
        </View>

        {banks.map((b) => {
          const avail =
            b.stock.find((s) => s.bloodGroup === bloodGroup && s.component === component)
              ?.unitsAvailable ?? 0;
          const on = selectedId === b.hospitalId;
          return (
            <Pressable
              key={b.hospitalId}
              onPress={() => setSelectedId(b.hospitalId)}
              style={[styles.card, on && styles.cardOn]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{b.name}</Text>
                <View style={styles.metaRow}>
                  <MapPin size={12} color="#64748B" />
                  <Text style={styles.meta}>
                    {b.distanceKm} km · {avail} units {bloodGroup}
                  </Text>
                </View>
              </View>
              <Text style={styles.avail}>{avail}</Text>
            </Pressable>
          );
        })}

        {selected && (
          <View style={styles.holdBox}>
            <Text style={styles.holdTitle}>Hold at {selected.name}</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={units}
              onChangeText={setUnits}
              placeholder="Units"
              placeholderTextColor="#94A3B8"
            />
            <TextInput
              style={[styles.input, { minHeight: 72 }]}
              multiline
              value={reason}
              onChangeText={setReason}
              placeholder="Clinical reason (optional)"
              placeholderTextColor="#94A3B8"
            />
            <Pressable
              style={styles.cta}
              disabled={!isAuthenticated || holdMut.isPending}
              onPress={() => holdMut.mutate()}
            >
              {holdMut.isPending ? (
                <ActivityIndicator color="#0B3D1A" />
              ) : (
                <Text style={styles.ctaText}>
                  {isAuthenticated ? `Hold ${units || 1}× ${bloodGroup}` : 'Sign in to hold'}
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F7F2' },
  scroll: { padding: 18, paddingBottom: 40 },
  hero: {
    backgroundColor: '#0B3D1A',
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#B9F84B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#0B3D1A' },
  title: { ...typography.display, color: '#fff', fontSize: 26, marginTop: 12 },
  sub: { color: 'rgba(255,255,255,0.75)', marginTop: 6, fontSize: 13, lineHeight: 18 },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipOn: { backgroundColor: '#0B3D1A', borderColor: '#0B3D1A' },
  chipLime: { backgroundColor: '#B9F84B', borderColor: '#B9F84B' },
  chipText: { fontWeight: '700', color: '#0F172A', fontSize: 13 },
  chipTextOn: { color: '#B9F84B' },
  chipTextForest: { color: '#0B3D1A' },
  listHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  listTitle: { fontWeight: '800', fontSize: 16, color: '#0F172A' },
  refresh: { fontWeight: '700', color: '#0B3D1A', fontSize: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardOn: { borderColor: '#0B3D1A', backgroundColor: '#F0FBE4' },
  cardName: { fontWeight: '800', color: '#0F172A', fontSize: 15 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  meta: { color: '#64748B', fontSize: 12 },
  avail: { fontSize: 22, fontWeight: '800', color: '#0B3D1A' },
  holdBox: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  holdTitle: { fontWeight: '800', fontSize: 15, color: '#0F172A' },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  cta: {
    backgroundColor: '#B9F84B',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: { fontWeight: '800', color: '#0B3D1A', fontSize: 15 },
});
