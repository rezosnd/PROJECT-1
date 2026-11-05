import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../src/components/ui/Button';
import { colors, radius, typography, spacing } from '../src/theme/tokens';
import { Activity, ShieldCheck, ArrowRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { setAppLanguage } from '../src/i18n';
import * as Haptics from 'expo-haptics';

export default function SplashScreen() {
  const router = useRouter();
  const { i18n } = useTranslation();
  const [selectedLang, setSelectedLang] = useState(i18n.language || 'en');

  const languages = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'or', label: 'Odia', native: 'ଓଡ଼ିଆ' },
  ];

  const handleLanguageChange = async (code: string) => {
    Haptics.selectionAsync();
    setSelectedLang(code);
    await setAppLanguage(code);
  };

  const handleContinue = () => {
    router.push('/login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo Badge */}
        <View style={styles.logoBadge}>
          <Activity size={36} color={colors.navy} />
        </View>

        <Text style={styles.appName}>LifeLink</Text>
        <Text style={styles.tagline}>CityHealth Emergency Grid</Text>
        <Text style={styles.subtitle}>
          Real-time bed availability & diagnostic telemetry across Bhubaneswar hospitals.
        </Text>

        {/* Language Selection Card */}
        <View style={styles.languageSection}>
          <Text style={styles.sectionHeader}>Select Your Language / ଭାଷା ଚୟନ</Text>
          <View style={styles.langList}>
            {languages.map((lang) => {
              const isSelected = selectedLang.startsWith(lang.code);
              return (
                <Pressable
                  key={lang.code}
                  onPress={() => handleLanguageChange(lang.code)}
                  style={[styles.langPill, isSelected && styles.langPillActive]}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${lang.label}`}
                >
                  <Text style={[styles.langText, isSelected && styles.langTextActive]}>
                    {lang.native}
                  </Text>
                  {isSelected && <ShieldCheck size={16} color={colors.navy} />}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {/* Bottom CTA */}
      <View style={styles.footer}>
        <Button
          variant="primary"
          onPress={handleContinue}
          icon={<ArrowRight size={18} color="#FFFFFF" />}
        >
          Continue
        </Button>
        <Text style={styles.prototypeNotice}>
          LifeLink Emergency Health Grid • National Health Authority & ABDM Compliant
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 80,
    paddingBottom: 40,
  },
  content: {
    alignItems: 'center',
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.hairline,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  appName: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: 34,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.body,
    color: colors.navy,
    marginTop: 4,
  },
  subtitle: {
    fontFamily: typography.fontFamilies.body,
    fontSize: typography.sizes.bodySmall,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 12,
    maxWidth: 290,
  },
  languageSection: {
    width: '100%',
    marginTop: 44,
  },
  sectionHeader: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.caption,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  langList: {
    gap: 10,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  langPillActive: {
    borderColor: colors.navy,
    backgroundColor: colors.blueLight,
  },
  langText: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.body,
    color: colors.ink,
  },
  langTextActive: {
    color: colors.navy,
  },
  footer: {
    width: '100%',
  },
  prototypeNotice: {
    fontFamily: typography.fontFamilies.body,
    fontSize: typography.sizes.badge,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 14,
  },
});

