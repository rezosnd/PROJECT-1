import React from 'react';
import { View, Text, StyleSheet, Pressable, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '../src/components/ui/Card';
import { colors, radius, typography, spacing } from '../src/theme/tokens';
import { ArrowLeft, Shield, Bell, Languages, Info } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../src/lib/auth/auth-store';

export default function SettingsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { biometricLockEnabled, setBiometricLock } = useAuthStore();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.ink} />
        </Pressable>
        <Text style={styles.title}>{t('settings.title', 'Settings')}</Text>
      </View>

      <View style={styles.content}>
        <Card variant="surface" style={styles.card}>
          <View style={styles.row}>
            <View style={styles.labelRow}>
              <Shield size={18} color={colors.navy} />
              <Text style={styles.rowLabel}>{t('settings.biometrics', 'Biometric App Lock')}</Text>
            </View>
            <Switch
              value={biometricLockEnabled}
              onValueChange={setBiometricLock}
              trackColor={{ false: colors.cardSoft, true: colors.navy }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.row}>
            <View style={styles.labelRow}>
              <Languages size={18} color={colors.navy} />
              <Text style={styles.rowLabel}>{t('settings.language', 'App Language')}</Text>
            </View>
            <Pressable
              onPress={() => {
                const next = i18n.language === 'en' ? 'hi' : i18n.language === 'hi' ? 'or' : 'en';
                i18n.changeLanguage(next);
              }}
              style={styles.pill}
            >
              <Text style={styles.pillText}>{i18n.language.toUpperCase()}</Text>
            </Pressable>
          </View>

          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <View style={styles.labelRow}>
              <Info size={18} color={colors.navy} />
              <Text style={styles.rowLabel}>{t('settings.version', 'Version')}</Text>
            </View>
            <Text style={styles.versionText}>GetMyHospital 1.0.0</Text>
          </View>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 54,
    paddingBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: typography.sizes.h3,
    color: colors.ink,
  },
  content: {
    paddingHorizontal: spacing.screenPadding,
  },
  card: {
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowLabel: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.bodySmall,
    color: colors.ink,
  },
  pill: {
    backgroundColor: colors.cardSoft,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  pillText: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.caption,
    color: colors.ink,
  },
  versionText: {
    fontFamily: typography.fontFamilies.body,
    fontSize: typography.sizes.caption,
    color: colors.muted,
  },
});

