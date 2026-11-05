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
} from 'react-native';
import { useAuthStore } from '../../src/lib/auth/auth-store';
import { abhaApi } from '../../src/lib/api/abha.api';
import { apiClient } from '../../src/lib/api/client';
import { AbhaCardView } from '../../src/features/patient/AbhaCardView';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { EmergencyFooter } from '../../src/components/ui/EmergencyFooter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { colors, radius, typography, spacing } from '../../src/theme/tokens';
import {
  ShieldCheck,
  User,
  Fingerprint,
  Languages,
  LogOut,
  Mail,
  Save,
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
  const [consentOk, setConsentOk] = useState(false);
  const scrollRef = React.useRef<ScrollView>(null);
  const abhaSectionY = React.useRef(0);
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

  // ABHA Profile Query
  const { data: abhaProfile, isLoading: abhaLoading } = useQuery({
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
        body: 'Your clinical details are stored securely for faster bed intake.',
        tone: 'success',
      });
      Alert.alert('Saved', 'Profile details updated.');
      router.replace('/(tabs)');
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

  // OTP goes to the mobile number already linked with Aadhaar (UIDAI / Eka) — not LifeLink SMS
  const handleRequestOtp = async () => {
    if (aadhaarInput.length !== 12) {
      Alert.alert('Invalid Aadhaar', 'Please enter a 12-digit Aadhaar number.');
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
        'OTP sent by ABDM / UIDAI',
        (res.message || res.hint || 'OTP was sent to the mobile number registered with your Aadhaar.') +
          (res.testOtp ? `\n\nSandbox test OTP: ${res.testOtp}` : '\n\nLifeLink cannot resend this SMS — check the Aadhaar-linked phone.')
      );
    } catch (err: any) {
      setAadhaarInput('');
      Alert.alert('OTP Request Failed', err.response?.data?.error?.message || err.message || 'Could not dispatch Aadhaar OTP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpInput.length < 6 || !txnId) {
      Alert.alert('Invalid OTP', 'Enter the 6-digit OTP from your Aadhaar-linked phone.');
      return;
    }
    if (!/^\d{10}$/.test(mobileInput)) {
      Alert.alert('Mobile required', 'Enter the 10-digit mobile number to link with your new ABHA (Eka requirement).');
      return;
    }

    setIsSubmitting(true);
    try {
      const verified = await abhaApi.verifyCreateOtp(txnId, otpInput, mobileInput);
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
      pushFlash({
        title: 'ABHA created & linked',
        body: `Address ${address} is on your profile with KYC details.`,
        tone: 'success',
      });
      Alert.alert('ABHA Linked', `Address ${address} created.`);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Verification Failed', err.response?.data?.error?.message || err.message || 'Invalid OTP code.');
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
        (res.message || 'OTP sent to mobile linked with this ABHA.') +
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
      const linked = await abhaApi.linkVerify(linkTxnId, linkOtp);
      setLinkTxnId(null);
      setLinkOtp('');
      setLinkAddressInput('');
      queryClient.invalidateQueries({ queryKey: ['abha-profile'] });
      await refreshCurrentUser();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      pushFlash({
        title: 'ABHA linked',
        body: linked?.photoUrl
          ? 'Photo & demographics saved to your profile.'
          : `${linked?.name || 'ABHA'} connected. Complete any missing clinical details below.`,
        tone: 'success',
      });
      Alert.alert('ABHA Linked', 'Photo and details are saved. Check Home for confirmation.');
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Verify failed', err.response?.data?.error?.message || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Unlink ABHA
  const handleUnlink = async () => {
    await abhaApi.unlinkAbha();
    queryClient.invalidateQueries({ queryKey: ['abha-profile'] });
    await refreshCurrentUser();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    pushFlash({
      title: 'ABHA unlinked',
      body: 'Health ID removed from this LifeLink profile.',
      tone: 'warn',
    });
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Identity Card */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('profile.title', 'Account & Profile')}</Text>
          <Text style={styles.subtitle}>
            {t('profile.subtitle', 'Verified Google Identity and Health Integration')}
          </Text>
        </View>

        <Card variant="surface" style={styles.userCard}>
          <Pressable
            onPress={() => {
              if (!abhaProfile) setActiveAbhaTab('link');
              scrollRef.current?.scrollTo({ y: Math.max(0, abhaSectionY.current - 12), animated: true });
              Haptics.selectionAsync();
            }}
            style={styles.userRow}
            accessibilityRole="button"
            accessibilityLabel={
              abhaProfile ? 'View linked ABHA card' : 'Link your ABHA account'
            }
          >
            <View style={styles.avatarWrap}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <User size={26} color={colors.navy} />
                </View>
              )}
              <View style={[styles.abhaAvatarBadge, !abhaProfile && styles.abhaAvatarBadgeWarn]}>
                <ShieldCheck size={12} color={abhaProfile ? '#166534' : '#9A3412'} />
              </View>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {abhaProfile?.name || user?.name || 'Citizen Patient'}
              </Text>
              <View style={styles.emailRow}>
                <Mail size={12} color={colors.muted} />
                <Text style={styles.userEmail} numberOfLines={1}>
                  {user?.email || 'patient@example.com'}
                </Text>
              </View>
              {abhaProfile?.abhaAddress ? (
                <Text style={styles.abhaLinkLine} numberOfLines={1}>
                  {t('profile.abhaLinked', 'ABHA linked')} · {abhaProfile.abhaAddress}
                </Text>
              ) : (
                <Text style={styles.abhaMissingLine}>
                  {t('profile.abhaMissing', 'Tap photo → Link ABHA + QR')}
                </Text>
              )}
            </View>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user?.role || 'PATIENT'}</Text>
            </View>
          </Pressable>
        </Card>

        {/* ABHA Integration Section */}
        <View
          style={styles.sectionHeaderRow}
          onLayout={(e) => {
            abhaSectionY.current = e.nativeEvent.layout.y;
          }}
        >
          <ShieldCheck size={18} color={colors.navy} />
          <Text style={styles.sectionTitle}>
            {t('profile.abhaSection', 'Ayushman Bharat Health Account (ABHA)')}
          </Text>
        </View>

        {abhaProfile ? (
          <AbhaCardView profile={abhaProfile} onUnlink={handleUnlink} />
        ) : (
          <Card variant="surface" style={styles.abhaSetupCard}>
            {/* Create vs Link Tabs */}
            <View style={styles.tabToggleRow}>
              <Pressable
                onPress={() => setActiveAbhaTab('create')}
                style={[styles.abhaTab, activeAbhaTab === 'create' && styles.abhaTabActive]}
              >
                <Text style={[styles.abhaTabText, activeAbhaTab === 'create' && styles.abhaTabTextActive]}>
                  Create New ABHA
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveAbhaTab('link')}
                style={[styles.abhaTab, activeAbhaTab === 'link' && styles.abhaTabActive]}
              >
                <Text style={[styles.abhaTabText, activeAbhaTab === 'link' && styles.abhaTabTextActive]}>
                  Link Existing
                </Text>
              </Pressable>
            </View>

            {activeAbhaTab === 'create' ? (
              <View style={styles.formContainer}>
                {!txnId ? (
                  <>
                    <Text style={styles.inputLabel}>12-digit Aadhaar</Text>
                    <TextInput
                      value={aadhaarInput}
                      onChangeText={setAadhaarInput}
                      placeholder="Aadhaar number"
                      placeholderTextColor={colors.muted}
                      keyboardType="numeric"
                      maxLength={12}
                      secureTextEntry
                      autoComplete="off"
                      autoCorrect={false}
                      style={styles.textInput}
                    />
                    <Text style={styles.disclaimerText}>
                      OTP is sent by ABDM/UIDAI to the phone already linked with Aadhaar — not by LifeLink SMS. Consent is recorded before the call.
                    </Text>
                    <Button onPress={handleRequestOtp} isLoading={isSubmitting} style={styles.submitBtn}>
                      Request Aadhaar OTP
                    </Button>
                  </>
                ) : (
                  <>
                    <Text style={styles.inputLabel}>OTP from Aadhaar-linked phone</Text>
                    <TextInput
                      value={otpInput}
                      onChangeText={setOtpInput}
                      placeholder={testOtpHint ? `Sandbox OTP ${testOtpHint}` : '6-digit OTP'}
                      placeholderTextColor={colors.muted}
                      keyboardType="numeric"
                      maxLength={6}
                      secureTextEntry
                      autoComplete="off"
                      style={styles.textInput}
                    />
                    <Text style={styles.inputLabel}>Mobile to link with ABHA</Text>
                    <TextInput
                      value={mobileInput}
                      onChangeText={setMobileInput}
                      placeholder="10-digit mobile"
                      placeholderTextColor={colors.muted}
                      keyboardType="phone-pad"
                      maxLength={10}
                      style={styles.textInput}
                    />
                    <Button onPress={handleVerifyOtp} isLoading={isSubmitting} style={styles.submitBtn}>
                      Verify & create ABHA
                    </Button>
                  </>
                )}
              </View>
            ) : (
              <View style={styles.formContainer}>
                {!linkTxnId ? (
                  <>
                    <Text style={styles.inputLabel}>Existing ABHA number or address</Text>
                    <TextInput
                      value={linkAddressInput}
                      onChangeText={setLinkAddressInput}
                      placeholder="91-3256-0414-4759 or name@abdm"
                      placeholderTextColor={colors.muted}
                      autoCapitalize="none"
                      style={styles.textInput}
                    />
                    <Text style={styles.disclaimerText}>
                      OTP is sent by ABDM to your ABHA-linked phone SMS — not email. After linking, your card & QR appear here.
                    </Text>
                    <Button onPress={handleLinkAddress} isLoading={isSubmitting} style={styles.submitBtn}>
                      Send OTP to phone
                    </Button>
                  </>
                ) : (
                  <>
                    <Text style={styles.inputLabel}>OTP from ABHA-linked phone</Text>
                    <TextInput
                      value={linkOtp}
                      onChangeText={setLinkOtp}
                      placeholder="6-digit SMS OTP"
                      placeholderTextColor={colors.muted}
                      keyboardType="numeric"
                      maxLength={6}
                      style={styles.textInput}
                    />
                    <Button onPress={handleLinkVerify} isLoading={isSubmitting} style={styles.submitBtn}>
                      Verify & link ABHA
                    </Button>
                  </>
                )}
              </View>
            )}
          </Card>
        )}

        {/* Clinical profile — saved for intake */}
        <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>
          {t('profile.clinicalTitle', 'Clinical profile details')}
        </Text>
        <Card variant="surface" style={styles.abhaSetupCard}>
          <Text style={styles.disclaimerText}>
            Saved from ABHA when linked. Edit blood group, address & emergency contact, then Save.
          </Text>

          <Text style={styles.inputLabel}>Full name</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Full legal name"
            placeholderTextColor={colors.muted}
            style={styles.textInput}
          />

          <Text style={styles.inputLabel}>Date of birth (YYYY-MM-DD)</Text>
          <TextInput
            value={dob}
            onChangeText={setDob}
            placeholder="1995-08-15"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            style={styles.textInput}
          />

          <Text style={styles.inputLabel}>Gender</Text>
          <View style={styles.chipWrap}>
            {(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] as const).map((g) => (
              <Pressable
                key={g}
                onPress={() => setGender(g)}
                style={[styles.miniChip, gender === g && styles.miniChipActive]}
              >
                <Text style={[styles.miniChipText, gender === g && styles.miniChipTextActive]}>
                  {g === 'PREFER_NOT_TO_SAY' ? 'N/A' : g}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.inputLabel}>Blood group</Text>
          <View style={styles.chipWrap}>
            {BLOOD_GROUPS.map((bg) => (
              <Pressable
                key={bg}
                onPress={() => setBloodGroup(bg)}
                style={[styles.miniChip, bloodGroup === bg && styles.miniChipActive]}
              >
                <Text style={[styles.miniChipText, bloodGroup === bg && styles.miniChipTextActive]}>
                  {bg}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.inputLabel}>Address</Text>
          <TextInput
            value={addressLine}
            onChangeText={setAddressLine}
            placeholder="Street / locality"
            placeholderTextColor={colors.muted}
            style={styles.textInput}
          />

          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>City</Text>
              <TextInput
                value={cityName}
                onChangeText={setCityName}
                placeholder="Bhubaneswar"
                placeholderTextColor={colors.muted}
                style={styles.textInput}
              />
            </View>
            <View style={{ width: 110 }}>
              <Text style={styles.inputLabel}>PIN</Text>
              <TextInput
                value={pinCode}
                onChangeText={setPinCode}
                placeholder="751024"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                style={styles.textInput}
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Emergency contact name</Text>
          <TextInput
            value={emergencyName}
            onChangeText={setEmergencyName}
            placeholder="Family contact"
            placeholderTextColor={colors.muted}
            style={styles.textInput}
          />

          <Text style={styles.inputLabel}>Mobile / emergency phone</Text>
          <TextInput
            value={emergencyPhone}
            onChangeText={setEmergencyPhone}
            placeholder="10-digit mobile"
            placeholderTextColor={colors.muted}
            keyboardType="phone-pad"
            style={styles.textInput}
          />

          <Text style={styles.inputLabel}>Allergies (optional)</Text>
          <TextInput
            value={allergies}
            onChangeText={setAllergies}
            placeholder="e.g. Penicillin"
            placeholderTextColor={colors.muted}
            style={styles.textInput}
          />

          <Button
            onPress={handleSaveProfile}
            isLoading={isSavingProfile}
            icon={<Save size={16} color="#FFFFFF" />}
            style={styles.submitBtn}
          >
            Save profile details
          </Button>
        </Card>

        {/* Security & Settings Section */}
        <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>Preferences & Security</Text>
        <Card variant="surface" style={styles.settingsCard}>
          {/* Biometrics */}
          <View style={styles.settingRow}>
            <View style={styles.settingLabelRow}>
              <Fingerprint size={18} color={colors.navy} />
              <View>
                <Text style={styles.settingTitle}>Biometric App Lock</Text>
                <Text style={styles.settingSub}>Prompt on resume after 60s in background</Text>
              </View>
            </View>
            <Switch
              value={biometricLockEnabled}
              onValueChange={setBiometricLock}
              trackColor={{ false: colors.cardSoft, true: colors.navy }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Language Switch */}
          <View style={[styles.settingRow, styles.langSettingRow]}>
            <View style={styles.settingLabelRow}>
              <Languages size={18} color={colors.navy} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>{t('settings.language', 'App Language')}</Text>
                <Text style={styles.settingSub}>English • हिन्दी • ଓଡ଼ିଆ</Text>
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
                        style={[styles.langChip, active && styles.langChipActive]}
                      >
                        <Text style={[styles.langChipText, active && styles.langChipTextActive]}>
                          {lang.label}
                        </Text>
                        <Text style={[styles.langChipNative, active && styles.langChipTextActive]}>
                          {lang.native}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          {/* ABDM Ecosystem Security */}
          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={styles.settingLabelRow}>
              <ShieldCheck size={18} color="#22C55E" />
              <View>
                <Text style={styles.settingTitle}>ABDM Ecosystem Security</Text>
                <Text style={styles.settingSub}>End-to-End Encrypted • NHA Compliant</Text>
              </View>
            </View>
            <View style={[styles.langPillBtn, { backgroundColor: '#DCFCE7' }]}>
              <Text style={[styles.langPillText, { color: '#166534', fontWeight: '700' }]}>VERIFIED</Text>
            </View>
          </View>
        </Card>

        {/* Sign Out CTA */}
        <Button
          variant="outline"
          onPress={async () => {
            await logout();
            router.replace('/splash');
          }}
          icon={<LogOut size={16} color={colors.red} />}
          style={styles.logoutBtn}
          textStyle={{ color: colors.red }}
        >
          {t('profile.signOut', 'Sign Out of LifeLink')}
        </Button>
      </ScrollView>

      {/* Emergency Footer */}
      <EmergencyFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 54,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: typography.sizes.h2,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: typography.fontFamilies.body,
    fontSize: typography.sizes.bodySmall,
    color: colors.muted,
    marginTop: 2,
  },
  userCard: {
    marginBottom: 20,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 52,
    height: 52,
    marginRight: 12,
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.cardSoft,
  },
  abhaAvatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abhaAvatarBadgeWarn: {
    backgroundColor: '#FFEDD5',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: typography.sizes.body,
    color: colors.ink,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  userEmail: {
    fontFamily: typography.fontFamilies.body,
    fontSize: typography.sizes.caption,
    color: colors.muted,
    flex: 1,
  },
  abhaLinkLine: {
    fontFamily: typography.fontFamilies.bodySemiBold,
    fontSize: 11,
    color: '#166534',
    marginTop: 4,
  },
  abhaMissingLine: {
    fontFamily: typography.fontFamilies.body,
    fontSize: 11,
    color: colors.muted,
    marginTop: 4,
  },
  langSettingRow: {
    alignItems: 'flex-start',
  },
  langRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  langChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.cardSoft,
    minWidth: 72,
    alignItems: 'center',
  },
  langChipActive: {
    backgroundColor: colors.navy,
  },
  langChipText: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: 12,
    color: colors.ink,
  },
  langChipNative: {
    fontFamily: typography.fontFamilies.body,
    fontSize: 10,
    color: colors.muted,
    marginTop: 2,
  },
  langChipTextActive: {
    color: '#FFFFFF',
  },
  roleBadge: {
    backgroundColor: colors.blueLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  roleText: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.badge,
    color: colors.navy,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: typography.sizes.body,
    color: colors.ink,
  },
  abhaSetupCard: {
    padding: 16,
  },
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.cardSoft,
    borderRadius: radius.pill,
    padding: 3,
    marginBottom: 16,
  },
  abhaTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  abhaTabActive: {
    backgroundColor: colors.surface,
  },
  abhaTabText: {
    fontFamily: typography.fontFamilies.bodyMedium,
    fontSize: typography.sizes.caption,
    color: colors.muted,
  },
  abhaTabTextActive: {
    fontFamily: typography.fontFamilies.bodyBold,
    color: colors.ink,
  },
  formContainer: {},
  inputLabel: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.bodySmall,
    color: colors.ink,
    marginBottom: 8,
  },
  textInput: {
    height: 50,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: 18,
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.body,
    color: colors.ink,
    marginBottom: 10,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  miniChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.cardSoft,
  },
  miniChipActive: {
    backgroundColor: colors.navy,
  },
  miniChipText: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: 11,
    color: colors.ink,
  },
  miniChipTextActive: {
    color: '#FFFFFF',
  },
  twoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  disclaimerText: {
    fontFamily: typography.fontFamilies.body,
    fontSize: 10,
    color: colors.muted,
    lineHeight: 14,
    marginBottom: 16,
  },
  submitBtn: {
    marginTop: 4,
  },
  settingsCard: {
    paddingVertical: 4,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  settingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingTitle: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.bodySmall,
    color: colors.ink,
  },
  settingSub: {
    fontFamily: typography.fontFamilies.body,
    fontSize: typography.sizes.caption,
    color: colors.muted,
    marginTop: 1,
  },
  langPillBtn: {
    backgroundColor: colors.cardSoft,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  langPillText: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.caption,
    color: colors.ink,
  },
  logoutBtn: {
    borderColor: colors.redLight,
    backgroundColor: colors.surface,
    marginBottom: 20,
  },
});

