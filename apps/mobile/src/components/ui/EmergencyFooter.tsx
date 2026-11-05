import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { colors, typography, spacing } from '../../theme/tokens';
import { useTranslation } from 'react-i18next';

export const EmergencyFooter: React.FC = () => {
  const { t } = useTranslation();

  const handleCall = () => {
    Linking.openURL('tel:112');
  };

  return (
    <Pressable
      onPress={handleCall}
      style={styles.container}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel="In an emergency call 112"
    >
      <AlertCircle size={14} color={colors.red} style={styles.icon} />
      <Text style={styles.text}>
        {t('common.emergencyNotice', 'In an emergency call 112')}
      </Text>
      <Text style={styles.action}>• Tap to call</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.screenPadding,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.caption,
    color: colors.red,
    letterSpacing: -0.2,
  },
  action: {
    fontFamily: typography.fontFamilies.bodyMedium,
    fontSize: typography.sizes.caption,
    color: colors.muted,
    marginLeft: 6,
  },
});

