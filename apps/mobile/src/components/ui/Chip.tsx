import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, radius, typography } from '../../theme/tokens';
import { StatusDot } from './StatusDot';

export interface ChipProps {
  children: React.ReactNode;
  variant?: 'green' | 'orange' | 'red' | 'blue' | 'teal' | 'neutral';
  dot?: boolean;
  pulse?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Chip: React.FC<ChipProps> = ({
  children,
  variant = 'neutral',
  dot = false,
  pulse = false,
  icon,
  style,
  textStyle,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'green':
        return { bg: colors.greenLight, text: colors.green, dotColor: 'green' as const };
      case 'orange':
        return { bg: colors.orangeLight, text: colors.orange, dotColor: 'orange' as const };
      case 'red':
        return { bg: colors.redLight, text: colors.red, dotColor: 'red' as const };
      case 'blue':
        return { bg: colors.blueLight, text: colors.blue, dotColor: 'blue' as const };
      case 'teal':
        return { bg: colors.tealLight, text: colors.teal, dotColor: 'teal' as const };
      case 'neutral':
      default:
        return { bg: colors.cardSoft, text: colors.ink, dotColor: 'muted' as const };
    }
  };

  const v = getVariantStyles();

  return (
    <View style={[styles.chip, { backgroundColor: v.bg }, style]}>
      {dot && <StatusDot color={v.dotColor} pulse={pulse} size="sm" style={styles.dot} />}
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={[styles.text, { color: v.text }, textStyle]}>{children}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  dot: {
    marginRight: 6,
  },
  iconContainer: {
    marginRight: 5,
  },
  text: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.bodySmall,
    letterSpacing: -0.2,
  },
});

