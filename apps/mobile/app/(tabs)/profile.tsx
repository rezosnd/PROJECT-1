import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Switch,
  Pressable,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { useAuthStore } from '../../src/lib/auth/auth-store';
import { abhaApi } from '../../src/lib/api/abha.api';
import { apiClient } from '../../src/lib/api/client';
import { AbhaCardView } from '../../src/features/patient/AbhaCardView';
import { Button } from '../../src/components/ui/Button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { typography } from '../../src/theme/tokens';
import {
  ShieldCheck,
  User,
  Fingerprint,
  Languages,
  LogOut,
  Mail,
  Save,
  ChevronRight,
  CreditCard,
  Sparkles,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { setAppLanguage } from '../../src/i18n';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useFlashStore } from '../../src/lib/ui/flash-store';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'UNKNOWN'] as const;
const LANGUAGES = [
  { code: 'en', label: 'EN', native: 'English' },
  { code: 'hi', label: 'HI', native: 'हिन्दी' },
  { code: 'or', label: 'OR', native: 'ଓଡ଼ିଆ' },
] as const;

export default function ProfileScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { user, logout, biometricLockEnabled, setBiometricLock, refreshCurrentUser } = useAuthStore();
  const pushFlash = useFlashStore((s) => s.push);

  const [activeAbhaTab, setActiveAbhaTab] = useState<'create' | 'link'>('link');
  const [showClinical, setShowClinical] = useState(false);
  const [consentOk, setConsentOk] = useState(false);
  const [aadhaarInput, setAadhaarInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [mobileInput, setMobileInput] = useState('');
  const [txnId, setTxnId] = useState<string | null>(null);
  const [testOtpHint, setTestOtpHint] = useState<string | null>(null);
  const [linkAddressInput, setLinkAddressInput] = useState('');
  const [linkTxnId, setLinkTxnId] = useState<string | null>(null);
  const [linkOtp, setLinkOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [fullName, setFullName] = useState(user?.profile?.fullName || user?.name || '');
  const [gender, setGender] = useState(user?.profile?.gender || 'PREFER_NOT_TO_SAY');
  const [bloodGroup, setBloodGroup] = useState(user?.profile?.bloodGroup || 'UNKNOWN');
  const [dob, setDob] = useState(
    user?.profile?.dateOfBirth ? String(user.profile.dateOfBirth).slice(0, 10) : ''
  );
  const [addressLine, setAddressLine] = useState(user?.profile?.addressLine || '');
  const [cityName, setCityName] = useState(user?.profile?.cityName || 'Bhubaneswar');
  const [pinCode, setPinCode] = useState(user?.profile?.pinCode || '');
  const [emergencyName, setEmergencyName] = useState(user?.profile?.emergencyContactName || '');
  const [emergencyPhone, setEmergencyPhone] = useState(user?.profile?.emergencyContactPhone || '');
  const [allergies, setAllergies] = useState(user?.profile?.allergies || '');

  const { data: abhaProfile } = useQuery({
    queryKey: ['abha-profile'],
    queryFn: () => abhaApi.getProfile(),
  });

  React.useEffect(() => {
    if (!abhaProfile) return;
    if (abhaProfile.name) setFullName(abhaProfile.name);
    if (abhaProfile.gender) setGender(String(abhaProfile.gender).toUpperCase());
    if (abhaProfile.dob) setDob(String(abhaProfile.dob).slice(0, 10));
    if (abhaProfile.mobile) setEmergencyPhone(abhaProfile.mobile);
    if (abhaProfile.addressLine) setAddressLine(abhaProfile.addressLine);
    if (abhaProfile.cityName) setCityName(abhaProfile.cityName);
    if (abhaProfile.pinCode) setPinCode(abhaProfile.pinCode);
    if (abhaProfile.bloodGroup) setBloodGroup(abhaProfile.bloodGroup);
  }, [abhaProfile?.abhaAddress, abhaProfile?.verifiedAt]);

  const avatarUri = abhaProfile?.photoUrl || user?.abhaPhotoUrl || user?.pictureUrl || null;
  const displayName = abhaProfile?.name || user?.name || 'Patient';

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      await apiClient.put('/auth/users/me/profile', {
        fullName: fullName || user?.name || 'Patient',
        dateOfBirth: dob || null,
        gender: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'].includes(gender)
          ? gender
          : 'PREFER_NOT_TO_SAY',
        bloodGroup: BLOOD_GROUPS.includes(bloodGroup as any) ? bloodGroup : 'UNKNOWN',
        addressLine: addressLine || 'Bhubaneswar, Odisha',
        cityName: cityName || 'Bhubaneswar',
        pinCode: pinCode || null,
        emergencyContactName: emergencyName || fullName || 'Emergency contact',
        emergencyContactPhone: emergencyPhone || '0000000000',
        mobilePhone: emergencyPhone || null,
        allergies: allergies || null,
        preferredLanguage: (i18n.language || 'en').slice(0, 2),
      });
      await refreshCurrentUser();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      pushFlash({
        title: 'Profile saved',
        body: 'Clinical details ready for faster bed intake.',
        tone: 'success',
      });
      Alert.alert('Saved', 'Profile details updated.');
    } catch (err: any) {
      Alert.alert('Save failed', err.response?.data?.error?.message || err.message || 'Could not save');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const ensureConsent = async () => {
    if (consentOk) return true;
    await abhaApi.grantConsent();
    setConsentOk(true);
    return true;
  };

  const handleRequestOtp = async () => {
    if (aadhaarInput.length !== 12) {
      Alert.alert('Invalid Aadhaar', 'Enter a 12-digit Aadhaar number.');
      return;
    }
    setIsSubmitting(true);
    try {
      await ensureConsent();
      const res = await abhaApi.requestCreateOtp(aadhaarInput);
      setTxnId(res.txnId);
      setTestOtpHint(res.testOtp || null);
      setAadhaarInput('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'OTP sent by UIDAI',
        (res.message || 'Check Aadhaar-linked phone SMS.') +
          (res.testOtp ? `\n\nSandbox OTP: ${res.testOtp}` : '')
      );
    } catch (err: any) {
      setAadhaarInput('');
      Alert.alert('OTP failed', err.response?.data?.error?.message || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpInput.length < 6 || !txnId) {
      Alert.alert('Invalid OTP', 'Enter the 6-digit OTP.');
      return;
    }
    if (!/^\d{10}$/.test(mobileInput)) {
      Alert.alert('Mobile required', 'Enter 10-digit mobile for ABHA.');
      return;
    }
    setIsSubmitting(true);
    try {
      await abhaApi.verifyCreateOtp(txnId, otpInput, mobileInput);
      const suggestions = await abhaApi.getAddressSuggestions(txnId);
      const address =
        suggestions?.suggestions?.[0] ||
        `${(user?.email || 'patient').split('@')[0].replace(/[^a-z0-9.]/gi, '')}@abdm`;
      await abhaApi.confirmAddress(txnId, address);
      setOtpInput('');
      setMobileInput('');
      setTxnId(null);
      setTestOtpHint(null);
      queryClient.invalidateQueries({ queryKey: ['abha-profile'] });
      await refreshCurrentUser();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      pushFlash({ title: 'ABHA created', body: `${address} linked.`, tone: 'success' });
      Alert.alert('ABHA Linked', `Address ${address} created.`);
    } catch (err: any) {
      Alert.alert('Verification failed', err.response?.data?.error?.message || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkAddress = async () => {
    if (!linkAddressInput) return;
    setIsSubmitting(true);
    try {
      await ensureConsent();
      const res = await abhaApi.linkInit(linkAddressInput);
      setLinkTxnId(res.txnId);
      Alert.alert(
        'OTP sent',
        (res.message || 'OTP sent to ABHA-linked phone.') +
          (res.testOtp ? `\n\nSandbox OTP: ${res.testOtp}` : '')
      );
    } catch (err: any) {
      Alert.alert('Link failed', err.response?.data?.error?.message || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkVerify = async () => {
    if (!linkTxnId || linkOtp.length < 6) {
      Alert.alert('OTP required', 'Enter the 6-digit ABHA OTP.');
      return;
    }
    setIsSubmitting(true);
    try {
      await abhaApi.linkVerify(linkTxnId, linkOtp);
      setLinkTxnId(null);
      setLinkOtp('');
      setLinkAddressInput('');
      queryClient.invalidateQueries({ queryKey: ['abha-profile'] });
      await refreshCurrentUser();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      pushFlash({ title: 'ABHA linked', body: 'Photo & QR saved to profile.', tone: 'success' });
      Alert.alert('ABHA Linked', 'Details saved on your profile.');
    } catch (err: any) {
      Alert.alert('Verify failed', err.response?.data?.error?.message || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlink = async () => {
    await abhaApi.unlinkAbha();
    queryClient.invalidateQueries({ queryKey: ['abha-profile'] });
    await refreshCurrentUser();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    pushFlash({ title: 'ABHA unlinked', body: 'Health ID removed.', tone: 'warn' });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero identity */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Text style={styles.kicker}>Your account</Text>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>{user?.role || 'PATIENT'}</Text>
            </View>
          </View>

          <View style={styles.identityRow}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{displayName.slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {displayName}
              </Text>
              <View style={styles.emailRow}>
                <Mail size={12} color="#94A3B8" />
                <Text style={styles.email} numberOfLines={1}>
                  {user?.email || '—'}
                </Text>
              </View>
              <View style={styles.statusRow}>
                <ShieldCheck size={12} color={abhaProfile ? '#059669' : '#D97706'} />
                <Text style={[styles.statusText, { color: abhaProfile ? '#059669' : '#D97706' }]}>
                  {abhaProfile ? `ABHA · ${abhaProfile.abhaAddress || 'linked'}` : 'ABHA not linked'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ABHA */}
        <Text style={styles.sectionLabel}>Ayushman Bharat · ABHA</Text>
        {abhaProfile ? (
          <AbhaCardView profile={abhaProfile} onUnlink={handleUnlink} />
        ) : (
          <View style={styles.panel}>
            <View style={styles.abhaPromo}>
              <Sparkles size={16} color="#FBBF24" />
              <Text style={styles.abhaPromoText}>
                Link once — photo, QR & details stay on your profile for triage.
              </Text>
            </View>

            <View style={styles.tabs}>
              {(['link', 'create'] as const).map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setActiveAbhaTab(tab)}
                  style={[styles.tab, activeAbhaTab === tab && styles.tabActive]}
                >
                  <Text style={[styles.tabText, activeAbhaTab === tab && styles.tabTextActive]}>
                    {tab === 'link' ? 'Link existing' : 'Create new'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {activeAbhaTab === 'link' ? (
              !linkTxnId ? (
                <>
                  <Text style={styles.fieldLabel}>ABHA number or address</Text>
                  <TextInput
                    value={linkAddressInput}
                    onChangeText={setLinkAddressInput}
                    placeholder="91-3256-0414-4759 or name@abdm"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    style={styles.input}
                  />
                  <Button onPress={handleLinkAddress} isLoading={isSubmitting} style={styles.primaryBtn}>
                    Send OTP to phone
                  </Button>
                </>
              ) : (
                <>
                  <Text style={styles.fieldLabel}>6-digit SMS OTP</Text>
                  <TextInput
                    value={linkOtp}
                    onChangeText={(t) => setLinkOtp(t.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    maxLength={6}
                    style={[styles.input, styles.otpInput]}
                  />
                  <Pressable onPress={() => setLinkOtp('123456')} style={styles.sandboxChip}>
                    <Text style={styles.sandboxChipText}>Use sandbox 123456</Text>
                  </Pressable>
                  <Button onPress={handleLinkVerify} isLoading={isSubmitting} style={styles.primaryBtn}>
                    Verify & link
                  </Button>
                </>
              )
            ) : !txnId ? (
              <>
                <Text style={styles.fieldLabel}>12-digit Aadhaar</Text>
                <TextInput
                  value={aadhaarInput}
                  onChangeText={(t) => setAadhaarInput(t.replace(/\D/g, '').slice(0, 12))}
                  placeholder="Aadhaar number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  maxLength={12}
                  secureTextEntry
                  style={styles.input}
                />
                <Button onPress={handleRequestOtp} isLoading={isSubmitting} style={styles.primaryBtn}>
                  Request Aadhaar OTP
                </Button>
              </>
            ) : (
              <>
                <Text style={styles.fieldLabel}>UIDAI OTP</Text>
                <TextInput
                  value={otpInput}
                  onChangeText={(t) => setOtpInput(t.replace(/\D/g, '').slice(0, 6))}
                  placeholder={testOtpHint ? `Sandbox ${testOtpHint}` : '6-digit OTP'}
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  maxLength={6}
                  style={styles.input}
                />
                <Text style={styles.fieldLabel}>Mobile for ABHA</Text>
                <TextInput
                  value={mobileInput}
                  onChangeText={(t) => setMobileInput(t.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={10}
                  style={styles.input}
                />
                <Button onPress={handleVerifyOtp} isLoading={isSubmitting} style={styles.primaryBtn}>
                  Verify & create ABHA
                </Button>
              </>
            )}
          </View>
        )}

        {/* Clinical — collapsible */}
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setShowClinical((v) => !v);
          }}
          style={styles.sectionToggle}
        >
          <View style={styles.sectionToggleLeft}>
            <CreditCard size={18} color="#0F172A" />
            <Text style={styles.sectionToggleTitle}>Clinical profile</Text>
          </View>
          <ChevronRight
            size={18}
            color="#94A3B8"
            style={{ transform: [{ rotate: showClinical ? '90deg' : '0deg' }] }}
          />
        </Pressable>

        {showClinical && (
          <View style={styles.panel}>
            <Text style={styles.fieldLabel}>Full name</Text>
            <TextInput value={fullName} onChangeText={setFullName} style={styles.input} placeholderTextColor="#94A3B8" />
            <Text style={styles.fieldLabel}>DOB (YYYY-MM-DD)</Text>
            <TextInput value={dob} onChangeText={setDob} style={styles.input} placeholder="1995-08-15" placeholderTextColor="#94A3B8" />
            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.chips}>
              {(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] as const).map((g) => (
                <Pressable
                  key={g}
                  onPress={() => setGender(g)}
                  style={[styles.chip, gender === g && styles.chipOn]}
                >
                  <Text style={[styles.chipText, gender === g && styles.chipTextOn]}>
                    {g === 'PREFER_NOT_TO_SAY' ? 'N/A' : g}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Blood group</Text>
            <View style={styles.chips}>
              {BLOOD_GROUPS.map((bg) => (
                <Pressable
                  key={bg}
                  onPress={() => setBloodGroup(bg)}
                  style={[styles.chip, bloodGroup === bg && styles.chipOn]}
                >
                  <Text style={[styles.chipText, bloodGroup === bg && styles.chipTextOn]}>{bg}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Address</Text>
            <TextInput value={addressLine} onChangeText={setAddressLine} style={styles.input} placeholderTextColor="#94A3B8" />
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>City</Text>
                <TextInput value={cityName} onChangeText={setCityName} style={styles.input} placeholderTextColor="#94A3B8" />
              </View>
              <View style={{ width: 100 }}>
                <Text style={styles.fieldLabel}>PIN</Text>
                <TextInput value={pinCode} onChangeText={setPinCode} style={styles.input} keyboardType="number-pad" placeholderTextColor="#94A3B8" />
              </View>
            </View>
            <Text style={styles.fieldLabel}>Emergency contact</Text>
            <TextInput value={emergencyName} onChangeText={setEmergencyName} style={styles.input} placeholderTextColor="#94A3B8" />
            <Text style={styles.fieldLabel}>Mobile</Text>
            <TextInput value={emergencyPhone} onChangeText={setEmergencyPhone} style={styles.input} keyboardType="phone-pad" placeholderTextColor="#94A3B8" />
            <Text style={styles.fieldLabel}>Allergies</Text>
            <TextInput value={allergies} onChangeText={setAllergies} style={styles.input} placeholder="Optional" placeholderTextColor="#94A3B8" />
            <Button
              onPress={handleSaveProfile}
              isLoading={isSavingProfile}
              icon={<Save size={16} color="#FFFFFF" />}
              style={styles.primaryBtn}
            >
              Save profile
            </Button>
          </View>
        )}

        {/* Preferences */}
        <Text style={styles.sectionLabel}>Preferences</Text>
        <View style={styles.panel}>
          <View style={styles.prefRow}>
            <View style={styles.prefLeft}>
              <Fingerprint size={18} color="#0F172A" />
              <View>
                <Text style={styles.prefTitle}>Biometric lock</Text>
                <Text style={styles.prefSub}>Secure resume after background</Text>
              </View>
            </View>
            <Switch
              value={biometricLockEnabled}
              onValueChange={setBiometricLock}
              trackColor={{ false: '#E2E8F0', true: '#0F172A' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.prefRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.prefLeft, { alignItems: 'flex-start' }]}>
              <Languages size={18} color="#0F172A" style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.prefTitle}>{t('settings.language', 'Language')}</Text>
                <View style={styles.langRow}>
                  {LANGUAGES.map((lang) => {
                    const active = (i18n.language || 'en').startsWith(lang.code);
                    return (
                      <Pressable
                        key={lang.code}
                        onPress={async () => {
                          Haptics.selectionAsync();
                          await setAppLanguage(lang.code);
                        }}
                        style={[styles.langChip, active && styles.langChipOn]}
                      >
                        <Text style={[styles.langChipText, active && styles.langChipTextOn]}>
                          {lang.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>
        </View>

        <Pressable
          onPress={async () => {
            await logout();
            router.replace('/splash');
          }}
          style={styles.logoutBtn}
        >
          <LogOut size={16} color="#DC2626" />
          <Text style={styles.logoutText}>{t('profile.signOut', 'Sign out')}</Text>
        </Pressable>

        <View style={styles.footerNote}>
          <ShieldCheck size={12} color="#059669" />
          <Text style={styles.footerNoteText}>ABDM-ready · encrypted profile · Google secure login</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 40,
  },
  hero: {
    backgroundColor: '#0F172A',
    borderRadius: 28,
    padding: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#94A3B8',
  },
  rolePill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  rolePillText: { color: '#E2E8F0', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 22, backgroundColor: '#1E293B' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#FFF', fontSize: 24, fontWeight: '800', fontFamily: typography.fontFamilies.display },
  name: {
    fontFamily: typography.fontFamilies.display,
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  email: { color: '#94A3B8', fontSize: 12, flex: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: '#94A3B8',
    marginBottom: 10,
    marginTop: 8,
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
  },
  abhaPromo: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    alignItems: 'center',
  },
  abhaPromoText: { flex: 1, color: '#E2E8F0', fontSize: 12, fontWeight: '600', lineHeight: 17 },
  tabs: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 14, padding: 4, marginBottom: 14 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  tabActive: { backgroundColor: '#FFFFFF', shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  tabText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  tabTextActive: { color: '#0F172A' },
  fieldLabel: { fontSize: 11, fontWeight: '800', color: '#64748B', marginBottom: 6, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
  input: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 10,
  },
  otpInput: { textAlign: 'center', fontSize: 22, fontWeight: '800', letterSpacing: 8 },
  sandboxChip: { alignSelf: 'center', marginBottom: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#FEF3C7' },
  sandboxChipText: { fontSize: 11, fontWeight: '800', color: '#92400E' },
  primaryBtn: { marginTop: 4, borderRadius: 16 },
  sectionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  sectionToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionToggleTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#F1F5F9' },
  chipOn: { backgroundColor: '#0F172A' },
  chipText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  chipTextOn: { color: '#FFFFFF' },
  row2: { flexDirection: 'row', gap: 10 },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  prefLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 12 },
  prefTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  prefSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  langRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  langChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#F1F5F9' },
  langChipOn: { backgroundColor: '#0F172A' },
  langChipText: { fontSize: 12, fontWeight: '800', color: '#64748B' },
  langChipTextOn: { color: '#FFFFFF' },
  logoutBtn: {
    marginTop: 8,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: { color: '#DC2626', fontWeight: '800', fontSize: 14 },
  footerNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 18 },
  footerNoteText: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
});
