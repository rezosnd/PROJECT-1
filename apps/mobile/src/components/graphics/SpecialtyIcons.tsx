import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { Brain, Heart } from 'lucide-react-native';

export interface SpecialtyIconProps {
  type: 'tooth' | 'heart' | 'brain' | 'kidney';
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function SpecialtyIcon({
  type,
  size = 20,
  color = '#111111',
  strokeWidth = 2,
}: SpecialtyIconProps) {
  switch (type) {
    case 'tooth':
      return (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Anatomical Tooth Contour */}
          <Path d="M7 3C4.24 3 2 5.24 2 8c0 4.5 2 7 3 10 .67 2 1.67 3 3 3 1.33 0 1.67-1.5 2-3 .33-1.5 1-2 2-2s1.67.5 2 2c.33 1.5.67 3 2 3 1.33 0 2.33-1 3-3 1-3 3-5.5 3-10 0-2.76-2.24-5-5-5-1.8 0-3.4 1-5 2-1.6-1-3.2-2-5-2Z" />
        </Svg>
      );

    case 'heart':
      return (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Heart with ECG Pulse Line */}
          <Path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" />
          <Path d="M2.5 12h3.5l2-3.5 3 7 2-4.5 1.5 2h6" />
        </Svg>
      );

    case 'brain':
      return <Brain size={size} color={color} strokeWidth={strokeWidth} />;

    case 'kidney':
      return (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Kidney Pair / Nephron System */}
          <Path d="M8 4c-3 0-5 2.5-5 6.5s2.5 7.5 5 9.5c2 1.5 4 0 4-2.5 0-2.5-1-3-1-5s1-2.5 1-5c0-2-2-3.5-4-3.5Z" />
          <Path d="M16 4c3 0 5 2.5 5 6.5s-2.5 7.5-5 9.5c-2 1.5-4 0-4-2.5 0-2.5 1-3 1-5s-1-2.5-1-5c0-2 2-3.5 4-3.5Z" />
        </Svg>
      );

    default:
      return <Heart size={size} color={color} strokeWidth={strokeWidth} />;
  }
}
