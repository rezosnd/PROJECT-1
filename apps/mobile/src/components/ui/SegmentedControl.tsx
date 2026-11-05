import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radius, typography } from '../../theme/tokens';
import * as Haptics from 'expo-haptics';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  selected,
  onSelect,
}: SegmentedControlProps<T>) {
  const handleSelect = (val: T) => {
    if (val !== selected) {
      Haptics.selectionAsync();
      onSelect(val);
    }
  };

  return (
    <View style={styles.container}>
      {options.map((opt) => {
        const isSelected = opt.value === selected;
        return (
          <Pressable
            key={opt.value}
            onPress={() => handleSelect(opt.value)}
            style={[styles.segment, isSelected && styles.selectedSegment]}
          >
            <Text style={[styles.text, isSelected && styles.selectedText]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.cardSoft,
    borderRadius: radius.pill,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  selectedSegment: {
    backgroundColor: colors.surface,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  text: {
    fontFamily: typography.fontFamilies.bodyMedium,
    fontSize: typography.sizes.bodySmall,
    color: colors.muted,
  },
  selectedText: {
    fontFamily: typography.fontFamilies.bodyBold,
    color: colors.ink,
  },
});

