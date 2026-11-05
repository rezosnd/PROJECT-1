import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../src/components/ui/Button';
import { colors, typography } from '../src/theme/tokens';
import { useAuthStore } from '../src/lib/auth/auth-store';
import { apiClient } from '../src/lib/api/client';
import { ShieldCheck } from 'lucide-react-native';

const GENDERS = [
  { id: 'MALE', label: 'Male' },
  { id: 'FEMALE', label: 'Female' },
  { id: 'OTHER', label: 'Other' },
  { id: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
] as const;

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'UNKNOWN'] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, refreshCurrentUser } = useAuthStore();
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

  const submit = async () => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      Alert.alert('Required', 'Please enter your full legal name.');
      return;
    }
    if (!addressLine.trim() || addressLine.trim().length < 3) {
      Alert.alert('Required', 'Please enter your address for hospital admission.');
      return;
    }
    if (!emergencyContactName.trim() || !emergencyContactPhone.trim() || emergencyContactPhone.trim().length < 10) {
      Alert.alert('Required', 'Emergency contact name and 10-digit phone are required.');
      return;
    }

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
        allergies: allergies.trim() || null,
        medicalNotes: medicalNotes.trim() || null,
        preferredLanguage: 'en',
      });
      await refreshCurrentUser();
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
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.badgeRow}>
          <ShieldCheck size={16} color="#059669" />
          <Text style={styles.badgeText}>Required once — shared with hospital on bed booking</Text>
        </View>

        <Text style={styles.title}>Complete your care profile</Text>
        <Text style={styles.subtitle}>
          Hospitals need these details when you request a bed. Login stays Google-only; this is clinical intake, not OTP login.
        </Text>

        <Text style={styles.label}>Full name</Text>
        <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="As on ID / ABHA" placeholderTextColor="#94A3B8" />

        <Text style={styles.label}>Age (years)</Text>
        <TextInput style={styles.input} value={ageYears} onChangeText={setAgeYears} keyboardType="number-pad" placeholder="e.g. 34" placeholderTextColor="#94A3B8" />

        <Text style={styles.label}>Gender</Text>
        <View style={styles.chipRow}>
          {GENDERS.map((g) => (
            <Pressable
              key={g.id}
              onPress={() => setGender(g.id)}
              style={[styles.chip, gender === g.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, gender === g.id && styles.chipTextActive]}>{g.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Blood group</Text>
        <View style={styles.chipRow}>
          {BLOOD_GROUPS.map((bg) => (
            <Pressable
              key={bg}
              onPress={() => setBloodGroup(bg)}
              style={[styles.chip, bloodGroup === bg && styles.chipActive]}
            >
              <Text style={[styles.chipText, bloodGroup === bg && styles.chipTextActive]}>{bg}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Address</Text>
        <TextInput style={[styles.input, styles.multiline]} value={addressLine} onChangeText={setAddressLine} multiline placeholder="Street, area, landmark" placeholderTextColor="#94A3B8" />

        <Text style={styles.label}>City</Text>
        <TextInput style={styles.input} value={cityName} onChangeText={setCityName} placeholder="Bhubaneswar" placeholderTextColor="#94A3B8" />

        <Text style={styles.label}>PIN code</Text>
        <TextInput style={styles.input} value={pinCode} onChangeText={setPinCode} keyboardType="number-pad" placeholder="751001" placeholderTextColor="#94A3B8" />

        <Text style={styles.label}>Emergency contact name</Text>
        <TextInput style={styles.input} value={emergencyContactName} onChangeText={setEmergencyContactName} placeholder="Relative / guardian" placeholderTextColor="#94A3B8" />

        <Text style={styles.label}>Emergency contact phone</Text>
        <TextInput style={styles.input} value={emergencyContactPhone} onChangeText={setEmergencyContactPhone} keyboardType="phone-pad" placeholder="10-digit mobile" placeholderTextColor="#94A3B8" />

        <Text style={styles.label}>Allergies (optional)</Text>
        <TextInput style={styles.input} value={allergies} onChangeText={setAllergies} placeholder="e.g. Penicillin" placeholderTextColor="#94A3B8" />

        <Text style={styles.label}>Medical notes (optional)</Text>
        <TextInput style={[styles.input, styles.multiline]} value={medicalNotes} onChangeText={setMedicalNotes} multiline placeholder="Chronic conditions, current meds" placeholderTextColor="#94A3B8" />

        <Button variant="primary" onPress={submit} isLoading={isLoading} style={styles.submit}>
          Save & continue to LifeLink
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { padding: 20, paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: 40 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  badgeText: { fontSize: 11, color: '#059669', fontWeight: '700' },
  title: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  subtitle: { fontSize: 13, color: '#64748B', lineHeight: 19, marginBottom: 18 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    fontSize: 14,
  },
  multiline: { height: 88, paddingTop: 12, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  chipActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  chipTextActive: { color: '#FFFFFF' },
  submit: { marginTop: 22, height: 52, borderRadius: 16 },
});
