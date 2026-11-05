import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radius, typography } from '../../theme/tokens';
import * as Haptics from 'expo-haptics';

export interface SeverityChipsProps {
  severity: number;
  onSelect: (severity: number) => void;
}

const SEVERITY_CONFIG = [
  { level: 1, label: '1 - Mild', color: colors.green, bg: colors.greenLight },
  { level: 2, label: '2 - Moderate', color: colors.teal, bg: colors.tealLight },
  { level: 3, label: '3 - Urgent', color: colors.orange, bg: colors.orangeLight },
  { level: 4, label: '4 - High Dep', color: colors.orange, bg: colors.orangeLight },
  { level: 5, label: '5 - Critical ICU', color: colors.red, bg: colors.redLight },
];

export const SeverityChips: React.FC<SeverityChipsProps> = ({
  severity,
  onSelect,
}) => {
  const handlePress = (lvl: number) => {
    Haptics.selectionAsync();
    onSelect(lvl);
  };

  return (
    <View style={styles.container}>
      {SEVERITY_CONFIG.map((cfg) => {
        const isSelected = cfg.level === severity;
        return (
          <Pressable
            key={cfg.level}
            onPress={() => handlePress(cfg.level)}
            style={[
              styles.chip,
              { backgroundColor: isSelected ? cfg.color : colors.cardSoft },
              isSelected && styles.selectedChip,
            ]}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Severity level ${cfg.label}`}
          >
            <Text
              style={[
                styles.chipText,
                { color: isSelected ? '#FFFFFF' : colors.ink },
              ]}
            >
              {cfg.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  selectedChip: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  chipText: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.bodySmall,
  },
});

