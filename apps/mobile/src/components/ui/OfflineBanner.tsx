import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { colors, typography } from '../../theme/tokens';
import { useTranslation } from 'react-i18next';

export interface OfflineBannerProps {
  message?: string;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ message }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.banner}>
      <WifiOff size={14} color={colors.orange} style={styles.icon} />
      <Text style={styles.text}>
        {message || t('common.offlineNotice', 'Offline — showing cached telemetry')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.orangeLight,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.caption,
    color: colors.orange,
  },
});

