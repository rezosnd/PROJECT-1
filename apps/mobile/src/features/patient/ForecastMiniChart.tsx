import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { colors, radius, typography } from '../../theme/tokens';
import { WardForecastResponse } from '../../lib/api/forecast.api';

export interface ForecastMiniChartProps {
  forecast: WardForecastResponse | undefined;
}

export const ForecastMiniChart: React.FC<ForecastMiniChartProps> = ({ forecast }) => {
  const points = [
    { label: 'Now', val: forecast?.currentFree ?? 3, x: 30, y: 55 },
    { label: '+1h', val: forecast?.horizons.h1.expectedFree ?? 2, x: 90, y: 45 },
    { label: '+3h', val: forecast?.horizons.h3.expectedFree ?? 5, x: 170, y: 30 },
    { label: '+6h', val: forecast?.horizons.h6.expectedFree ?? 8, x: 250, y: 15 },
  ];

  const pathD = `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y} L ${points[2].x} ${points[2].y} L ${points[3].x} ${points[3].y}`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Poisson Bed Surge Projection</Text>
        <Text style={styles.badge}>Next 6 Hours</Text>
      </View>

      <View style={styles.chartWrapper}>
        <Svg width="100%" height={85} viewBox="0 0 280 85">
          {/* Baseline Grid */}
          <Line x1="10" y1="65" x2="270" y2="65" stroke={colors.hairline} strokeWidth="1" />

          {/* Projection Line */}
          <Path d={pathD} fill="none" stroke={colors.blue} strokeWidth="2.5" />

          {/* Nodes */}
          {points.map((p, idx) => (
            <React.Fragment key={idx}>
              <Circle cx={p.x} cy={p.y} r="4" fill={colors.surface} stroke={colors.blue} strokeWidth="2" />
              <SvgText
                x={p.x}
                y={p.y - 7}
                fontSize="10"
                fontWeight="bold"
                fill={colors.ink}
                textAnchor="middle"
              >
                +{p.val}
              </SvgText>
              <SvgText
                x={p.x}
                y="78"
                fontSize="9"
                fill={colors.muted}
                textAnchor="middle"
              >
                {p.label}
              </SvgText>
            </React.Fragment>
          ))}
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.hairline,
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.bodySmall,
    color: colors.ink,
  },
  badge: {
    fontFamily: typography.fontFamilies.bodyMedium,
    fontSize: typography.sizes.badge,
    color: colors.teal,
    backgroundColor: colors.tealLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  chartWrapper: {
    alignItems: 'center',
  },
});

