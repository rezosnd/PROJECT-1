import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Switch,
} from 'react-native';
import { Button } from '../../components/ui/Button';
import { colors, radius, typography } from '../../theme/tokens';
import { X, Filter } from 'lucide-react-native';

export interface FilterState {
  radiusKm: number;
  wardType: string | null;
  emergencyOnly: boolean;
}

export interface FiltersBottomSheetProps {
  visible: boolean;
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onClose: () => void;
}

export const FiltersBottomSheet: React.FC<FiltersBottomSheetProps> = ({
  visible,
  filters,
  onChange,
  onClose,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Filter size={18} color={colors.ink} style={styles.filterIcon} />
              <Text style={styles.title}>Filter Search</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.ink} />
            </Pressable>
          </View>

          {/* Search Radius */}
          <Text style={styles.sectionLabel}>Search Radius</Text>
          <View style={styles.chipRow}>
            {[5, 10, 15, 25].map((r) => (
              <Pressable
                key={r}
                onPress={() => onChange({ ...filters, radiusKm: r })}
                style={[styles.chip, filters.radiusKm === r && styles.chipActive]}
              >
                <Text style={[styles.chipText, filters.radiusKm === r && styles.chipTextActive]}>
                  Within {r} km
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Ward Type */}
          <Text style={styles.sectionLabel}>Preferred Ward Type</Text>
          <View style={styles.chipRow}>
            {[null, 'ICU', 'NICU', 'PICU', 'HDU', 'CCU', 'EMERGENCY'].map((w) => (
              <Pressable
                key={w || 'all'}
                onPress={() => onChange({ ...filters, wardType: w })}
                style={[styles.chip, filters.wardType === w && styles.chipActive]}
              >
                <Text style={[styles.chipText, filters.wardType === w && styles.chipTextActive]}>
                  {w || 'All Wards'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* 24x7 Emergency Toggle */}
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>24x7 Emergency Facilities Only</Text>
              <Text style={styles.toggleSub}>Filter for accredited trauma and acute centers</Text>
            </View>
            <Switch
              value={filters.emergencyOnly}
              onValueChange={(val) => onChange({ ...filters, emergencyOnly: val })}
              trackColor={{ false: colors.cardSoft, true: colors.navy }}
              thumbColor="#FFFFFF"
            />
          </View>

          <Button onPress={onClose} style={styles.applyBtn}>
            Apply Filters
          </Button>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.hairline,
    alignSelf: 'center',
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterIcon: {
    marginRight: 8,
  },
  title: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: typography.sizes.h3,
    color: colors.ink,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.bodySmall,
    color: colors.ink,
    marginBottom: 8,
    marginTop: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.cardSoft,
  },
  chipActive: {
    backgroundColor: colors.ink,
  },
  chipText: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.caption,
    color: colors.ink,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.hairline,
    marginVertical: 12,
  },
  toggleLabel: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.bodySmall,
    color: colors.ink,
  },
  toggleSub: {
    fontFamily: typography.fontFamilies.body,
    fontSize: typography.sizes.caption,
    color: colors.muted,
  },
  applyBtn: {
    marginTop: 12,
  },
});

