import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { colors } from '../../theme/tokens';

export interface StatusDotProps {
  color?: 'green' | 'orange' | 'red' | 'blue' | 'teal' | 'muted';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  style?: ViewStyle;
}

export const StatusDot: React.FC<StatusDotProps> = ({
  color = 'green',
  size = 'md',
  pulse = false,
  style,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.7);

  useEffect(() => {
    if (pulse) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.8, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        true
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 1000 }),
          withTiming(0.7, { duration: 1000 })
        ),
        -1,
        true
      );
    } else {
      scale.value = 1;
      opacity.value = 0.7;
    }
  }, [pulse]);

  const animatedWaveStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const getColorCode = () => {
    switch (color) {
      case 'green':
        return colors.green;
      case 'orange':
        return colors.orange;
      case 'red':
        return colors.red;
      case 'blue':
        return colors.blue;
      case 'teal':
        return colors.teal;
      case 'muted':
      default:
        return colors.muted;
    }
  };

  const getDimensions = () => {
    switch (size) {
      case 'sm':
        return 7;
      case 'lg':
        return 12;
      case 'md':
      default:
        return 9;
    }
  };

  const dim = getDimensions();
  const c = getColorCode();

  return (
    <View style={[styles.container, { width: dim, height: dim }, style]}>
      {pulse && (
        <Animated.View
          style={[
            styles.wave,
            {
              width: dim,
              height: dim,
              borderRadius: dim / 2,
              backgroundColor: c,
            },
            animatedWaveStyle,
          ]}
        />
      )}
      <View
        style={[
          styles.dot,
          {
            width: dim,
            height: dim,
            borderRadius: dim / 2,
            backgroundColor: c,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
  },
  wave: {
    position: 'absolute',
  },
});

