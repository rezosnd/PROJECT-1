import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, shadows, spacing } from '../../theme/tokens';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'surface' | 'soft';
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  style,
}) => {
  const getVariantStyle = () => {
    switch (variant) {
      case 'surface':
        return styles.surface;
      case 'soft':
        return styles.soft;
      case 'default':
      default:
        return styles.default;
    }
  };

  return (
    <View style={[styles.base, getVariantStyle(), style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  default: {
    backgroundColor: colors.card,
    ...shadows.card,
  },
  surface: {
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  soft: {
    backgroundColor: colors.cardSoft,
    borderColor: 'transparent',
  },
});

