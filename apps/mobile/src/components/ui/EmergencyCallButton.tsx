import React from 'react';
import { StyleSheet, Linking, ViewStyle, StyleProp } from 'react-native';
import { Button } from './Button';
import { PhoneCall } from 'lucide-react-native';
import { colors } from '../../theme/tokens';
import { useTranslation } from 'react-i18next';

export interface EmergencyCallButtonProps {
  style?: StyleProp<ViewStyle>;
  size?: 'sm' | 'md';
}

export const EmergencyCallButton: React.FC<EmergencyCallButtonProps> = ({
  style,
  size = 'md',
}) => {
  const { t } = useTranslation();

  const handleCall = () => {
    Linking.openURL('tel:112');
  };

  return (
    <Button
      variant="danger"
      size={size}
      onPress={handleCall}
      icon={<PhoneCall size={size === 'sm' ? 14 : 18} color="#FFFFFF" />}
      style={[styles.button, style]}
      accessibilityLabel="Emergency call 112"
    >
      {t('common.emergencyCall', 'Call 112')}
    </Button>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.red,
  },
});

