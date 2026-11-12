import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, typography } from '../../src/theme/tokens';
import type { ScannedPatient } from '../../src/lib/api/referrals.api';
import { ArrowLeft, Send } from 'lucide-react-native';

export default function PatientDetailScreen() {
  const { data } = useLocalSearchParams<{ id: string; data?: string }>();
  const router = useRouter();

  const patient = useMemo<ScannedPatient | null>(() => {
    try {
      return data ? (JSON.parse(String(data)) as ScannedPatient) : null;
    } catch {
      return null;
    }
  }, [data]);

  if (!patient) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={styles.title}>Patient not loaded</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const p = patient.profile || {};

  return (
    <SafeAreaView style={styles.root}>
      <Pressable style={styles.back} onPress={() => router.back()}>
        <ArrowLeft color={colors.ink} size={22} />
        <Text style={styles.backText}>Scanned patient</Text>
      </Pressable>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.hero}>
          {patient.pictureUrl ? (
            <Image source={{ uri: patient.pictureUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: colors.forest }}>
                {(patient.name || 'P')[0]}
              </Text>
            </View>
          )}
          <Text style={styles.name}>{patient.name}</Text>
          <Text style={styles.meta}>
            {p.bloodGroup || 'BG n/a'} · {p.gender || '—'} · {p.ageYears ? `${p.ageYears}y` : 'age n/a'}
          </Text>
          {patient.abha?.linked ? (
            <Text style={styles.abha}>ABHA linked · {patient.abha.abhaAddress}</Text>
          ) : (
            <Text style={styles.meta}>ABHA not linked</Text>
          )}
        </View>

        <Section title="Clinical">
          <Row label="Allergies" value={p.allergies || 'None recorded'} />
          <Row label="Notes" value={p.medicalNotes || '—'} />
          <Row label="Mobile" value={p.mobilePhone || '—'} />
          <Row
            label="Emergency"
            value={
              p.emergencyContactName
                ? `${p.emergencyContactName} · ${p.emergencyContactPhone || ''}`
                : '—'
            }
          />
          <Row
            label="Address"
            value={[p.addressLine, p.cityName, p.pinCode].filter(Boolean).join(', ') || '—'}
          />
        </Section>

        <Section title="Insurance">
          {patient.insurance?.length ? (
            patient.insurance.map((ins) => (
              <View key={ins.insurerId} style={styles.insRow}>
                <Text style={styles.insName}>
                  {ins.insurerName}
                  {ins.isPrimary ? ' · PRIMARY' : ''}
                </Text>
                <Text style={styles.meta}>
                  {ins.insurerCode}
                  {ins.policyNumber ? ` · ${ins.policyNumber}` : ''}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.meta}>Self-pay / no insurer on file</Text>
          )}
        </Section>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.cta}
          onPress={() =>
            router.push({
              pathname: '/refer',
              params: {
                patientId: patient.id,
                patientName: patient.name,
                insurance: JSON.stringify(patient.insurance || []),
              },
            })
          }
        >
          <Send color={colors.forest} size={20} />
          <Text style={styles.ctaText}>Refer to hospital / department</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16 },
  backText: { fontWeight: '700', color: colors.ink },
  hero: {
    marginHorizontal: 16,
    backgroundColor: colors.lime,
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
  },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 10 },
  avatarFallback: {
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...typography.title, fontSize: 22, color: colors.forest },
  meta: { color: colors.forest, opacity: 0.8, marginTop: 4, fontSize: 13 },
  abha: { marginTop: 8, fontWeight: '700', color: colors.forest, fontSize: 12 },
  section: {
    marginTop: 14,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { ...typography.title, marginBottom: 12, color: colors.ink },
  label: { fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' },
  value: { color: colors.ink, marginTop: 2, fontSize: 15 },
  insRow: { marginBottom: 10 },
  insName: { fontWeight: '700', color: colors.ink },
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  ctaText: { fontWeight: '800', color: colors.forest, fontSize: 16 },
  title: { ...typography.title, padding: 20 },
  link: { color: colors.forest, fontWeight: '700', paddingHorizontal: 20 },
});
