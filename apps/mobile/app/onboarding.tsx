import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/lib/auth/auth-store';
import { apiClient } from '../src/lib/api/client';
import { BRAND } from '../src/lib/brand';
import { typography } from '../src/theme/tokens';
import {
  ShieldCheck,
  User,
  Droplets,
  MapPin,
  Phone,
  HeartPulse,
  Check,
  ChevronRight,
  BadgePercent,
} from 'lucide-react-native';
import { InsurancePolicyEditor } from '../src/features/patient/InsurancePolicyEditor';
import type { InsurancePolicyInput } from '../src/lib/api/insurance.api';
import * as Haptics from 'expo-haptics';

const GENDERS = [
  { id: 'MALE', label: 'Male' },
  { id: 'FEMALE', label: 'Female' },
  { id: 'OTHER', label: 'Other' },
  { id: 'PREFER_NOT_TO_SAY', label: 'Skip' },
] as const;

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'UNKNOWN'] as const;

const STEPS = [
  { id: 'identity', title: 'Identity', icon: User },
  { id: 'clinical', title: 'Clinical', icon: Droplets },
  { id: 'address', title: 'Address', icon: MapPin },
  { id: 'emergency', title: 'Emergency', icon: Phone },
  { id: 'insurance', title: 'Insurance', icon: BadgePercent },
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshCurrentUser } = useAuthStore();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [fullName, setFullName] = useState(user?.name || '');
  const [ageYears, setAgeYears] = useState('');
  const [gender, setGender] = useState<(typeof GENDERS)[number]['id']>('MALE');
  const [bloodGroup, setBloodGroup] = useState<(typeof BLOOD_GROUPS)[number]>('O+');
  const [addressLine, setAddressLine] = useState('');
  const [cityName, setCityName] = useState('Bhubaneswar');
  const [pinCode, setPinCode] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [insurancePolicies, setInsurancePolicies] = useState<InsurancePolicyInput[]>([]);
  const [insuranceSelfPay, setInsuranceSelfPay] = useState(true);

  const handleInsuranceChange = useCallback((policies: InsurancePolicyInput[], selfPay: boolean) => {
    setInsurancePolicies(policies);
    setInsuranceSelfPay(selfPay);
  }, []);

  const progress = useMemo(() => ((step + 1) / STEPS.length) * 100, [step]);

  const validateStep = () => {
    if (step === 0) {
      if (!fullName.trim() || fullName.trim().length < 2) {
        Alert.alert('Required', 'Enter your full name as on ID / ABHA.');
        return false;
      }
    }
    if (step === 2) {
      if (!addressLine.trim() || addressLine.trim().length < 3) {
        Alert.alert('Required', 'Enter your address for hospital admission.');
        return false;
      }
    }
    if (step === 3) {
      if (!emergencyContactName.trim()) {
        Alert.alert('Required', 'Emergency contact name is required.');
        return false;
      }
      if (!emergencyContactPhone.trim() || emergencyContactPhone.replace(/\D/g, '').length < 10) {
        Alert.alert('Required', 'Enter a valid 10-digit emergency phone.');
        return false;
      }
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep()) return;
    Haptics.selectionAsync();
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else void submit();
  };

  const goBack = () => {
    Haptics.selectionAsync();
    if (step > 0) setStep((s) => s - 1);
  };

  const submit = async () => {
    if (!validateStep()) return;
    setIsLoading(true);
    try {
      await apiClient.put('/auth/users/me/profile', {
        fullName: fullName.trim(),
        ageYears: ageYears ? Number(ageYears) : null,
        gender,
        bloodGroup,
        addressLine: addressLine.trim(),
        cityName: cityName.trim() || 'Bhubaneswar',
        pinCode: pinCode.trim() || null,
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactPhone: emergencyContactPhone.trim(),
        mobilePhone: emergencyContactPhone.trim() || null,
        allergies: allergies.trim() || null,
        medicalNotes: medicalNotes.trim() || null,
        preferredLanguage: 'en',
        insurancePolicies: insuranceSelfPay ? [] : insurancePolicies,
      });
      await refreshCurrentUser();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert(
        'Could not save profile',
        err.response?.data?.error?.message || err.message || 'Please try again'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.topLogo}
          resizeMode="contain"
          accessibilityLabel={BRAND.name}
        />
        <Text style={styles.stepCount}>
          {step + 1}/{STEPS.length}
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.badgeRow}>
            <ShieldCheck size={14} color="#0B3D1A" />
            <Text style={styles.badgeText}>Shared with hospital on bed hold</Text>
          </View>
          <Text style={styles.title}>Your care profile</Text>
          <Text style={styles.subtitle}>
            One-time clinical intake so admitting staff know who you are. Google login stays separate.
          </Text>

          <View style={styles.stepPills}>
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = i === step;
              const done = i < step;
              return (
                <View
                  key={s.id}
                  style={[styles.stepPill, active && styles.stepPillActive, done && styles.stepPillDone]}
                >
                  {done ? (
                    <Check size={12} color="#FFFFFF" strokeWidth={3} />
                  ) : (
                    <Icon size={12} color={active ? '#FFFFFF' : '#3F3F46'} strokeWidth={2.4} />
                  )}
                  <Text
                    style={[
                      styles.stepPillText,
                      (active || done) && styles.stepPillTextActive,
                    ]}
                  >
                    {s.title}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.formCard}>
          {step === 0 && (
            <>
              <Text style={styles.sectionTitle}>Who are you?</Text>
              <Text style={styles.label}>Full name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="As on ID / ABHA"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
              />

              <Text style={styles.label}>Age (years)</Text>
              <TextInput
                style={styles.input}
                value={ageYears}
                onChangeText={setAgeYears}
                keyboardType="number-pad"
                placeholder="e.g. 34"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.label}>Gender</Text>
              <View style={styles.chipRow}>
                {GENDERS.map((g) => (
                  <Pressable
                    key={g.id}
                    onPress={() => setGender(g.id)}
                    style={[styles.chip, gender === g.id && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, gender === g.id && styles.chipTextActive]}>
                      {g.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {step === 1 && (
            <>
              <Text style={styles.sectionTitle}>Clinical basics</Text>
              <Text style={styles.label}>Blood group</Text>
              <View style={styles.chipRow}>
                {BLOOD_GROUPS.map((bg) => (
                  <Pressable
                    key={bg}
                    onPress={() => setBloodGroup(bg)}
                    style={[styles.chip, bloodGroup === bg && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, bloodGroup === bg && styles.chipTextActive]}>
                      {bg === 'UNKNOWN' ? 'Unknown' : bg}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Allergies (optional)</Text>
              <TextInput
                style={styles.input}
                value={allergies}
                onChangeText={setAllergies}
                placeholder="e.g. Penicillin, peanuts"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.label}>Medical notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={medicalNotes}
                onChangeText={setMedicalNotes}
                multiline
                placeholder="Chronic conditions, current medicines…"
                placeholderTextColor="#94A3B8"
              />

              <View style={styles.tipCard}>
                <HeartPulse size={16} color="#0B3D1A" />
                <Text style={styles.tipText}>
                  These details travel with every bed request so ICU staff can act faster.
                </Text>
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.sectionTitle}>Where can we find you?</Text>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={addressLine}
                onChangeText={setAddressLine}
                multiline
                placeholder="Street, area, landmark"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={cityName}
                onChangeText={setCityName}
                placeholder="Bhubaneswar"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.label}>PIN code</Text>
              <TextInput
                style={styles.input}
                value={pinCode}
                onChangeText={setPinCode}
                keyboardType="number-pad"
                placeholder="751001"
                placeholderTextColor="#94A3B8"
                maxLength={6}
              />
            </>
          )}

          {step === 3 && (
            <>
              <Text style={styles.sectionTitle}>Emergency contact</Text>
              <Text style={styles.label}>Contact name</Text>
              <TextInput
                style={styles.input}
                value={emergencyContactName}
                onChangeText={setEmergencyContactName}
                placeholder="Relative / guardian"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.label}>Contact phone</Text>
              <TextInput
                style={styles.input}
                value={emergencyContactPhone}
                onChangeText={setEmergencyContactPhone}
                keyboardType="phone-pad"
                placeholder="10-digit mobile"
                placeholderTextColor="#94A3B8"
                maxLength={15}
              />

            </>
          )}

          {step === 4 && (
            <>
              <Text style={styles.sectionTitle}>Insurance (optional)</Text>
              <Text style={styles.insuranceLead}>
                Helps rank hospitals that accept your plan. You can skip with self-pay — still shown on bed hold if
                added later.
              </Text>
              <InsurancePolicyEditor selfPayInitially onChange={handleInsuranceChange} />
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Ready to save</Text>
                <Text style={styles.summaryLine}>{fullName || '—'}</Text>
                <Text style={styles.summaryMeta}>
                  {bloodGroup === 'UNKNOWN' ? 'Blood unknown' : bloodGroup}
                  {ageYears ? ` · ${ageYears} yrs` : ''}
                  {cityName ? ` · ${cityName}` : ''}
                </Text>
                <Text style={styles.summaryMeta}>
                  Emergency: {emergencyContactName || '—'} · {emergencyContactPhone || '—'}
                </Text>
                <Text style={styles.summaryMeta}>
                  Insurance:{' '}
                  {insuranceSelfPay
                    ? 'Self-pay'
                    : insurancePolicies.length
                      ? `${insurancePolicies.length} plan(s)`
                      : 'None selected'}
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {step > 0 ? (
          <Pressable onPress={goBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
        ) : (
          <View style={{ width: 88 }} />
        )}

        <Pressable
          onPress={goNext}
          disabled={isLoading}
          style={({ pressed }) => [styles.nextBtn, (pressed || isLoading) && { opacity: 0.9 }]}
        >
          <Text style={styles.nextBtnText}>
            {isLoading ? 'Saving…' : step === STEPS.length - 1 ? 'Save profile' : 'Continue'}
          </Text>
          {!isLoading && <ChevronRight size={18} color="#A8E017" strokeWidth={2.5} />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7F2',
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 4 : 10,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topLogo: {
    width: 150,
    height: 36,
  },
  stepCount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#D8E0D4',
    marginHorizontal: 20,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0B3D1A',
    borderRadius: 999,
  },
  scroll: {
    padding: 20,
    paddingBottom: 24,
  },
  heroCard: {
    backgroundColor: '#B9F84B',
    borderRadius: 28,
    padding: 18,
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0B3D1A',
  },
  title: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: 26,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: '#3F3F46',
    fontWeight: '500',
  },
  stepPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  stepPillActive: {
    backgroundColor: '#111111',
  },
  stepPillDone: {
    backgroundColor: '#0B3D1A',
  },
  stepPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3F3F46',
  },
  stepPillTextActive: {
    color: '#FFFFFF',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    height: 50,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
  },
  multiline: {
    height: 92,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#111111',
    borderColor: '#111111',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  tipCard: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#065F46',
    fontWeight: '600',
  },
  summaryCard: {
    marginTop: 16,
    backgroundColor: '#F4F7F2',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D8E0D4',
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0B3D1A',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  summaryLine: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  summaryMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  insuranceLead: {
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F4F7F2',
    gap: 12,
  },
  backBtn: {
    height: 52,
    minWidth: 88,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  nextBtn: {
    flex: 1,
    height: 52,
    borderRadius: 999,
    backgroundColor: '#0B3D1A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#A8E017',
  },
});
