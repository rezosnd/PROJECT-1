import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  referralsApi,
  hospitalsApi,
  conditionsApi,
  type Department,
} from '../src/lib/api/referrals.api';
import { colors, typography } from '../src/theme/tokens';
import { ArrowLeft } from 'lucide-react-native';

const URGENCIES = ['NORMAL', 'URGENT', 'CRITICAL'] as const;

export default function ReferScreen() {
  const { patientId, patientName } = useLocalSearchParams<{
    patientId: string;
    patientName?: string;
  }>();
  const router = useRouter();

  const [hospitals, setHospitals] = useState<any[]>([]);
  const [hospitalQ, setHospitalQ] = useState('');
  const [selectedHospital, setSelectedHospital] = useState<any | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [urgency, setUrgency] = useState<(typeof URGENCIES)[number]>('URGENT');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [conditions, setConditions] = useState<any[]>([]);
  const [conditionId, setConditionId] = useState<string | null>(null);
  const [createHold, setCreateHold] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void hospitalsApi.search({ q: hospitalQ || undefined, limit: 15 }).then(setHospitals).catch(() => {});
  }, [hospitalQ]);

  useEffect(() => {
    if (!selectedHospital?.id) {
      setDepartments([]);
      setDepartmentId(null);
      return;
    }
    void referralsApi
      .departments(selectedHospital.id)
      .then(setDepartments)
      .catch(() => setDepartments([]));
  }, [selectedHospital?.id]);

  useEffect(() => {
    void conditionsApi.search('').then(setConditions).catch(() => {});
  }, []);

  const submit = async () => {
    if (!patientId || !selectedHospital?.id) {
      Alert.alert('Required', 'Select a destination hospital');
      return;
    }
    setBusy(true);
    try {
      const dept = departments.find((d) => d.id === departmentId);
      const referral = await referralsApi.create({
        patientId: String(patientId),
        toHospitalId: selectedHospital.id,
        toDepartmentId: departmentId,
        conditionId,
        urgency,
        reason: reason || `Referral for ${patientName || 'patient'}`,
        clinicalNotes: notes || undefined,
        recommendedWard: dept?.wardHint || undefined,
        createHold,
      });
      Alert.alert(
        'Referral sent',
        referral.bedRequestId
          ? `15-minute bed hold placed at ${referral.toHospitalName}.`
          : `Referral recorded at ${referral.toHospitalName}. Hold skipped or no free beds.`,
        [
          {
            text: 'Done',
            onPress: () => router.replace('/(tabs)/referrals'),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert(
        'Could not refer',
        err?.response?.data?.error?.message || err.message || 'Try again'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <Pressable style={styles.back} onPress={() => router.back()}>
        <ArrowLeft color={colors.ink} size={22} />
        <Text style={styles.backText}>Refer {patientName || 'patient'}</Text>
      </Pressable>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 14 }}>
        <Text style={styles.label}>Destination hospital</Text>
        <TextInput
          style={styles.input}
          placeholder="Search hospitals"
          placeholderTextColor={colors.muted}
          value={hospitalQ}
          onChangeText={setHospitalQ}
        />
        <View style={styles.list}>
          {hospitals.slice(0, 8).map((h) => {
            const id = h.id || h.hospitalId;
            const on = selectedHospital?.id === id;
            return (
              <Pressable
                key={id}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => setSelectedHospital({ id, name: h.name || h.hospitalName })}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>
                  {h.name || h.hospitalName}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {departments.length > 0 && (
          <>
            <Text style={styles.label}>Department</Text>
            <View style={styles.list}>
              {departments.map((d) => {
                const on = departmentId === d.id;
                return (
                  <Pressable
                    key={d.id}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => setDepartmentId(on ? null : d.id)}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{d.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        <Text style={styles.label}>Urgency</Text>
        <View style={styles.list}>
          {URGENCIES.map((u) => (
            <Pressable
              key={u}
              style={[styles.chip, urgency === u && styles.chipOn]}
              onPress={() => setUrgency(u)}
            >
              <Text style={[styles.chipText, urgency === u && styles.chipTextOn]}>{u}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Condition (optional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
          {conditions.slice(0, 10).map((c: any) => {
            const on = conditionId === c.id;
            return (
              <Pressable
                key={c.id}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => setConditionId(on ? null : c.id)}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.name || c.code}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.label}>Reason</Text>
        <TextInput
          style={styles.input}
          placeholder="Why transfer?"
          placeholderTextColor={colors.muted}
          value={reason}
          onChangeText={setReason}
        />

        <Text style={styles.label}>Clinical notes</Text>
        <TextInput
          style={[styles.input, { minHeight: 90 }]}
          multiline
          placeholder="Brief clinical summary for receiving team"
          placeholderTextColor={colors.muted}
          value={notes}
          onChangeText={setNotes}
        />

        <Pressable
          style={[styles.holdToggle, createHold && styles.holdOn]}
          onPress={() => setCreateHold((v) => !v)}
        >
          <Text style={[styles.holdText, createHold && { color: colors.forest }]}>
            {createHold ? '✓ Also place 15-min bed hold' : '○ Referral only (no hold)'}
          </Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.cta} onPress={submit} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={colors.forest} />
          ) : (
            <Text style={styles.ctaText}>Send referral{createHold ? ' + hold' : ''}</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16 },
  backText: { fontWeight: '700', color: colors.ink, fontSize: 16 },
  label: { ...typography.caption, color: colors.muted, textTransform: 'uppercase' },
  input: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.ink,
  },
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: '100%',
  },
  chipOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.ink },
  chipTextOn: { color: colors.lime },
  holdToggle: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  holdOn: { backgroundColor: colors.lime, borderColor: colors.lime },
  holdText: { fontWeight: '700', color: colors.muted },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: 'rgba(244,247,242,0.96)',
  },
  cta: {
    backgroundColor: colors.lime,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: { fontWeight: '800', color: colors.forest, fontSize: 16 },
});
