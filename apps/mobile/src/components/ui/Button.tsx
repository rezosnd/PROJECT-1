import React from 'react';
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Pressable,
  StyleProp,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, radius, layout, typography, shadows } from '../../theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface ButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'md' | 'sm';
  disabled?: boolean;
  isLoading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  isLoading = false,
  style,
  textStyle,
  icon,
  accessibilityLabel,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled && !isLoading) {
      scale.value = withTiming(0.98, { duration: 100 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 150 });
  };

  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primary;
      case 'secondary':
        return styles.secondary;
      case 'outline':
        return styles.outline;
      case 'danger':
        return styles.danger;
      case 'ghost':
        return styles.ghost;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryText;
      case 'secondary':
        return styles.secondaryText;
      case 'outline':
        return styles.outlineText;
      case 'danger':
        return styles.dangerText;
      case 'ghost':
        return styles.ghostText;
    }
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || isLoading}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || (typeof children === 'string' ? children : 'Button')}
      accessibilityState={{ disabled: disabled || isLoading, busy: isLoading }}
      style={[
        styles.base,
        size === 'sm' ? styles.small : styles.medium,
        getVariantStyle(),
        disabled && styles.disabled,
        animatedStyle,
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : colors.ink}
          size="small"
        />
      ) : (
        <>
          {icon ? <Animated.View style={styles.iconContainer}>{icon}</Animated.View> : null}
          <Text style={[styles.textBase, getTextStyle(), textStyle]}>
            {children}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medium: {
    height: layout.buttonHeight,
    paddingHorizontal: 24,
  },
  small: {
    height: 38,
    paddingHorizontal: 16,
  },
  primary: {
    backgroundColor: colors.ink,
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    ...shadows.soft,
  },
  secondaryText: {
    color: colors.ink,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.hairline,
  },
  outlineText: {
    color: colors.ink,
  },
  danger: {
    backgroundColor: colors.red,
  },
  dangerText: {
    color: '#FFFFFF',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: colors.ink,
  },
  disabled: {
    opacity: 0.45,
  },
  textBase: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.body,
    letterSpacing: -0.2,
  },
  iconContainer: {
    marginRight: 8,
  },
});

