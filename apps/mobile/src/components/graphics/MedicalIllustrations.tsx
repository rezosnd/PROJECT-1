import React from 'react';
import Svg, { Path, Circle, Rect, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { View, StyleSheet } from 'react-native';

export const HeartbeatPulseSvg: React.FC<{
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
}> = ({ width = 120, height = 36, color = '#2563EB', strokeWidth = 2.5 }) => (
  <Svg width={width} height={height} viewBox="0 0 120 36" fill="none">
    <Path
      d="M0 18H28L34 8L42 30L52 2L60 26L66 14L72 18H120"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const MedicalCrossBadgeSvg: React.FC<{ size?: number; color?: string }> = ({
  size = 28,
  color = '#2563EB',
}) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <Circle cx="16" cy="16" r="16" fill={color} fillOpacity="0.12" />
    <Rect x="13.5" y="8" width="5" height="16" rx="2.5" fill={color} />
    <Rect x="8" y="13.5" width="16" height="5" rx="2.5" fill={color} />
  </Svg>
);

export const HeroHealthcareGraphic: React.FC<{ width?: number; height?: number }> = ({
  width = 320,
  height = 90,
}) => (
  <Svg width={width} height={height} viewBox="0 0 320 90" fill="none">
    <Defs>
      <LinearGradient id="heroGrad" x1="0" y1="0" x2="320" y2="90" gradientUnits="userSpaceOnUse">
        <Stop stopColor="#B4F481" stopOpacity="0.4" />
        <Stop offset="0.6" stopColor="#FCE354" stopOpacity="0.25" />
        <Stop offset="1" stopColor="#38BDF8" stopOpacity="0.15" />
      </LinearGradient>
    </Defs>
    <Rect x="0" y="0" width="320" height="90" rx="24" fill="url(#heroGrad)" />
    {/* Concentric decorative circles */}
    <Circle cx="280" cy="45" r="40" stroke="#0F172A" strokeOpacity="0.06" strokeWidth="1.5" />
    <Circle cx="280" cy="45" r="24" stroke="#0F172A" strokeOpacity="0.08" strokeWidth="1.5" />
    <Circle cx="280" cy="45" r="8" fill="#B4F481" />
    {/* Floating Plus Icons */}
    <Path d="M40 24V32M36 28H44" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.25" />
    <Path d="M120 62V70M116 66H124" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.25" />
    <Path d="M220 18V24M217 21H223" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.2" />
    {/* Telemetry Waveform */}
    <Path
      d="M30 48H80L88 38L96 58L106 32L114 54L120 44L126 48H230"
      stroke="#0F172A"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeOpacity="0.75"
    />
  </Svg>
);

export const AbhaShieldSvg: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2L4 5V11C4 16.5 7.5 21.5 12 22C16.5 21.5 20 16.5 20 11V5L12 2Z"
      fill="#16A34A"
      fillOpacity="0.15"
      stroke="#16A34A"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 12L11 14L15 9"
      stroke="#16A34A"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

