import React from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/lib/auth/auth-store';
import { colors, typography } from '../../src/theme/tokens';
import { QrCode, Send, ShieldCheck } from 'lucide-react-native';

export default function DoctorHome() {
  const { user } = useAuthStore();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.kicker}>GETMYHOSPITAL · DOCTOR</Text>
      <Text style={styles.hello}>Dr. {user?.name?.split(' ')[0] || 'Doctor'}</Text>
      <Text style={styles.sub}>
        {[user?.doctorSpecialty, user?.doctorQualification].filter(Boolean).join(' · ') ||
          'Complete your profile'}{' '}
        · Ask patients: “Show me your Care QR”
      </Text>

      {!user?.doctorProfileComplete ? (
        <Pressable style={styles.primary} onPress={() => router.push('/(tabs)/profile')}>
          <ShieldCheck color={colors.forest} size={28} />
          <View style={{ flex: 1 }}>
            <Text style={styles.primaryTitle}>Complete your profile</Text>
            <Text style={styles.primarySub}>Specialty, qualification, license & clinic</Text>
          </View>
        </Pressable>
      ) : null}

      <Pressable style={styles.primary} onPress={() => router.push('/(tabs)/scan')}>
        <QrCode color={colors.forest} size={28} />
        <View style={{ flex: 1 }}>
          <Text style={styles.primaryTitle}>Scan patient Care QR</Text>
          <Text style={styles.primarySub}>Green Care QR only — not ABHA card</Text>
        </View>
      </Pressable>

      <View style={styles.row}>
        <Pressable style={styles.card} onPress={() => router.push('/(tabs)/referrals')}>
          <Send color={colors.forest} size={22} />
          <Text style={styles.cardTitle}>My referrals</Text>
        </Pressable>
        <View style={[styles.card, { backgroundColor: '#E8F5E0' }]}>
          <ShieldCheck color={colors.forest} size={22} />
          <Text style={styles.cardTitle}>15-min hold</Text>
          <Text style={styles.cardHint}>Not a permanent booking</Text>
        </View>
      </View>

      <View style={styles.steps}>
        <Text style={styles.stepsTitle}>Flow</Text>
        {[
          'Patient opens Profile → Care QR',
          'You scan (or paste) the QR payload',
          'Review clinical + insurance details',
          'Refer to hospital / department → optional bed hold',
        ].map((t, i) => (
          <Text key={t} style={styles.step}>
            {i + 1}. {t}
          </Text>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: 20 },
  kicker: { ...typography.caption, color: colors.muted, marginTop: 8 },
  hello: { ...typography.display, color: colors.ink, marginTop: 6 },
  sub: { color: colors.muted, marginTop: 6, marginBottom: 24 },
  primary: {
    backgroundColor: colors.lime,
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  primaryTitle: { ...typography.title, color: colors.forest },
  primarySub: { color: colors.forest, opacity: 0.75, marginTop: 2, fontSize: 13 },
  row: { flexDirection: 'row', gap: 12, marginTop: 14 },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  cardTitle: { fontWeight: '700', color: colors.ink },
  cardHint: { fontSize: 11, color: colors.muted },
  steps: {
    marginTop: 28,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepsTitle: { ...typography.title, marginBottom: 10, color: colors.ink },
  step: { color: colors.muted, marginBottom: 8, lineHeight: 20 },
});
