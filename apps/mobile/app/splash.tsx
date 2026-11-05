import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../src/components/ui/Button';
import { colors, radius, typography, spacing } from '../src/theme/tokens';
import { ShieldCheck, ArrowRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { setAppLanguage } from '../src/i18n';
import * as Haptics from 'expo-haptics';
import { BRAND } from '../src/lib/brand';

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
        <View style={styles.logoWrap}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logoFull}
            resizeMode="contain"
            accessibilityLabel={BRAND.name}
          />
        </View>

        <Text style={styles.tagline}>{BRAND.tagline}</Text>
        <Text style={styles.subtitle}>
          Real-time bed availability & care matching across hospitals near you.
        </Text>

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
                  {isSelected && <ShieldCheck size={16} color={BRAND.colors.forest} />}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          variant="primary"
          onPress={handleContinue}
          icon={<ArrowRight size={18} color="#FFFFFF" />}
        >
          Continue
        </Button>
        <Text style={styles.prototypeNotice}>
          {BRAND.name} · National Health Authority & ABDM Compliant
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 72,
    paddingBottom: 40,
  },
  content: {
    alignItems: 'center',
  },
  logoWrap: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 18,
  },
  logoFull: {
    width: '92%',
    height: 88,
  },
  tagline: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: 11,
    color: BRAND.colors.lime,
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: typography.fontFamilies.body,
    fontSize: typography.sizes.bodySmall,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 12,
    maxWidth: 300,
  },
  languageSection: {
    width: '100%',
    marginTop: 40,
  },
  sectionHeader: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.caption,
    color: '#94A3B8',
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
    backgroundColor: '#111827',
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  langPillActive: {
    borderColor: BRAND.colors.lime,
    backgroundColor: '#0B3D1A',
  },
  langText: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.body,
    color: '#E2E8F0',
  },
  langTextActive: {
    color: BRAND.colors.lime,
  },
  footer: {
    width: '100%',
  },
  prototypeNotice: {
    fontFamily: typography.fontFamilies.body,
    fontSize: typography.sizes.badge,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 14,
  },
});
