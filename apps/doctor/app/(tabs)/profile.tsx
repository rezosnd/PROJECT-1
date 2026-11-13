import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  Image,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/lib/auth/auth-store';
import { colors, typography } from '../../src/theme/tokens';

export default function DoctorProfile() {
  const { user, logout, updateDoctorProfile } = useAuthStore();
  const router = useRouter();
  const [editing, setEditing] = useState(!user?.doctorProfileComplete);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: user?.name || '',
    doctorSpecialty: user?.doctorSpecialty || '',
    doctorQualification: user?.doctorQualification || '',
    doctorDegrees: user?.doctorDegrees || '',
    doctorLicenseNo: user?.doctorLicenseNo || '',
    doctorExperienceYears:
      user?.doctorExperienceYears != null ? String(user.doctorExperienceYears) : '',
    doctorBio: user?.doctorBio || '',
    doctorPhone: user?.doctorPhone || '',
    doctorClinicName: user?.doctorClinicName || '',
    doctorConsultationFee:
      user?.doctorConsultationFee != null ? String(user.doctorConsultationFee) : '',
  });

  useEffect(() => {
    if (!user) return;
    setForm({
      fullName: user.name || '',
      doctorSpecialty: user.doctorSpecialty || '',
      doctorQualification: user.doctorQualification || '',
      doctorDegrees: user.doctorDegrees || '',
      doctorLicenseNo: user.doctorLicenseNo || '',
      doctorExperienceYears:
        user.doctorExperienceYears != null ? String(user.doctorExperienceYears) : '',
      doctorBio: user.doctorBio || '',
      doctorPhone: user.doctorPhone || '',
      doctorClinicName: user.doctorClinicName || '',
      doctorConsultationFee:
        user.doctorConsultationFee != null ? String(user.doctorConsultationFee) : '',
    });
    if (!user.doctorProfileComplete) setEditing(true);
  }, [user?.id, user?.doctorProfileComplete]);

  const setField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = async () => {
    if (!form.doctorSpecialty.trim() || !form.doctorQualification.trim()) {
      Alert.alert('Missing details', 'Specialty and qualification are required.');
      return;
    }
    setSaving(true);
    try {
      await updateDoctorProfile({
        fullName: form.fullName.trim() || undefined,
        doctorSpecialty: form.doctorSpecialty.trim(),
        doctorQualification: form.doctorQualification.trim(),
        doctorDegrees: form.doctorDegrees.trim() || null,
        doctorLicenseNo: form.doctorLicenseNo.trim() || null,
        doctorExperienceYears: form.doctorExperienceYears
          ? Number(form.doctorExperienceYears)
          : null,
        doctorBio: form.doctorBio.trim() || null,
        doctorPhone: form.doctorPhone.trim() || null,
        doctorClinicName: form.doctorClinicName.trim() || null,
        doctorConsultationFee: form.doctorConsultationFee
          ? Number(form.doctorConsultationFee)
          : null,
      });
      setEditing(false);
      Alert.alert('Saved', 'Your doctor profile is updated.');
    } catch (err: any) {
      Alert.alert(
        'Could not save',
        err?.response?.data?.error?.message || err.message || 'Try again'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <Text style={styles.title}>Doctor profile</Text>
          <Text style={styles.hint}>
            Add your specialty, qualification, and clinic details so patients and hospitals see the
            right clinician.
          </Text>

          <View style={styles.card}>
            {user?.pictureUrl ? (
              <Image source={{ uri: user.pictureUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={{ fontWeight: '800', color: colors.forest }}>
                  {(user?.name || 'D')[0]}
                </Text>
              </View>
            )}
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.meta}>{user?.email}</Text>
            {!user?.doctorProfileComplete ? (
              <Text style={styles.badge}>Complete your clinical profile</Text>
            ) : (
              <Text style={styles.meta}>
                {[user.doctorSpecialty, user.doctorQualification].filter(Boolean).join(' · ')}
              </Text>
            )}
          </View>

          {editing ? (
            <View style={styles.form}>
              <Field
                label="Full name"
                value={form.fullName}
                onChange={(v) => setField('fullName', v)}
                placeholder="Dr. …"
              />
              <Field
                label="Specialty *"
                value={form.doctorSpecialty}
                onChange={(v) => setField('doctorSpecialty', v)}
                placeholder="e.g. Cardiology / Emergency Medicine"
              />
              <Field
                label="Qualification *"
                value={form.doctorQualification}
                onChange={(v) => setField('doctorQualification', v)}
                placeholder="e.g. MBBS, MD"
              />
              <Field
                label="Degrees / certifications"
                value={form.doctorDegrees}
                onChange={(v) => setField('doctorDegrees', v)}
                placeholder="e.g. MD (Medicine), DM (Cardio)"
              />
              <Field
                label="Medical license no."
                value={form.doctorLicenseNo}
                onChange={(v) => setField('doctorLicenseNo', v)}
                placeholder="e.g. OD-EM-1001"
              />
              <Field
                label="Years of experience"
                value={form.doctorExperienceYears}
                onChange={(v) => setField('doctorExperienceYears', v.replace(/[^0-9]/g, ''))}
                placeholder="e.g. 8"
                keyboardType="number-pad"
              />
              <Field
                label="Clinic / hospital name"
                value={form.doctorClinicName}
                onChange={(v) => setField('doctorClinicName', v)}
                placeholder="Where you primarily practice"
              />
              <Field
                label="Consultation fee (₹)"
                value={form.doctorConsultationFee}
                onChange={(v) => setField('doctorConsultationFee', v.replace(/[^0-9.]/g, ''))}
                placeholder="e.g. 500"
                keyboardType="decimal-pad"
              />
              <Field
                label="Phone"
                value={form.doctorPhone}
                onChange={(v) => setField('doctorPhone', v)}
                placeholder="+91…"
                keyboardType="phone-pad"
              />
              <Field
                label="About / bio"
                value={form.doctorBio}
                onChange={(v) => setField('doctorBio', v)}
                placeholder="Short clinical bio for patients"
                multiline
              />

              <Pressable style={styles.save} onPress={onSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={colors.forest} />
                ) : (
                  <Text style={styles.saveText}>Save profile</Text>
                )}
              </Pressable>
              {user?.doctorProfileComplete ? (
                <Pressable onPress={() => setEditing(false)} style={{ marginTop: 12 }}>
                  <Text style={styles.cancel}>Cancel</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View style={styles.details}>
              <Detail label="Specialty" value={user?.doctorSpecialty} />
              <Detail label="Qualification" value={user?.doctorQualification} />
              <Detail label="Degrees" value={user?.doctorDegrees} />
              <Detail label="License" value={user?.doctorLicenseNo} />
              <Detail
                label="Experience"
                value={
                  user?.doctorExperienceYears != null
                    ? `${user.doctorExperienceYears} years`
                    : null
                }
              />
              <Detail label="Clinic" value={user?.doctorClinicName} />
              <Detail
                label="Fee"
                value={
                  user?.doctorConsultationFee != null
                    ? `₹ ${user.doctorConsultationFee}`
                    : null
                }
              />
              <Detail label="Phone" value={user?.doctorPhone} />
              <Detail label="About" value={user?.doctorBio} />
              <Pressable style={styles.editBtn} onPress={() => setEditing(true)}>
                <Text style={styles.editText}>Edit details</Text>
              </Pressable>
            </View>
          )}

          <Pressable
            style={styles.logout}
            onPress={async () => {
              await logout();
              router.replace('/login');
            }}
          >
            <Text style={styles.logoutText}>Sign out</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'phone-pad' | 'decimal-pad';
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMulti]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        keyboardType={keyboardType || 'default'}
      />
    </View>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.display, fontSize: 24, color: colors.ink },
  hint: { color: colors.muted, marginTop: 6, marginBottom: 16, lineHeight: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  avatar: { width: 72, height: 72, borderRadius: 36, marginBottom: 12 },
  avatarFallback: {
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...typography.title, color: colors.ink },
  meta: { color: colors.muted, marginTop: 4, textAlign: 'center' },
  badge: {
    marginTop: 10,
    backgroundColor: colors.lime,
    color: colors.forest,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  details: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.ink,
    fontSize: 15,
  },
  inputMulti: { minHeight: 90, textAlignVertical: 'top' },
  value: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  save: {
    marginTop: 8,
    backgroundColor: colors.lime,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: { fontWeight: '800', color: colors.forest, fontSize: 16 },
  cancel: { textAlign: 'center', color: colors.muted, fontWeight: '700' },
  editBtn: {
    marginTop: 8,
    backgroundColor: colors.forest,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  editText: { color: colors.lime, fontWeight: '800' },
  logout: {
    marginTop: 24,
    backgroundColor: colors.forest,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: colors.lime, fontWeight: '800' },
});
