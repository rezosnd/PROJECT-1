import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Input } from '../../components/ui/Input';
import { Search, X, Stethoscope } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { conditionsApi, Condition } from '../../lib/api/conditions.api';
import { useDebounce } from '../../hooks/useDebounce';
import { colors, radius, typography } from '../../theme/tokens';
import { useTranslation } from 'react-i18next';

export interface ConditionAutocompleteProps {
  selectedCondition: Condition | null;
  onSelect: (condition: Condition) => void;
}

export const ConditionAutocomplete: React.FC<ConditionAutocompleteProps> = ({
  selectedCondition,
  onSelect,
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState(selectedCondition?.name || '');
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 200);

  const { data: conditions = [], isLoading } = useQuery({
    queryKey: ['conditions', debouncedQuery],
    queryFn: () => conditionsApi.getConditions(debouncedQuery),
    enabled: isOpen && debouncedQuery.length > 0,
  });

  const handleSelect = (c: Condition) => {
    setQuery(c.name);
    setIsOpen(false);
    onSelect(c);
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      <Input
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={t(
          'home.searchPlaceholder',
          'Search condition (e.g. stroke, dengue, premature baby)...'
        )}
        leftIcon={<Search size={18} color={colors.muted} />}
        rightIcon={
          isLoading ? (
            <ActivityIndicator size="small" color={colors.ink} />
          ) : query.length > 0 ? (
            <Pressable onPress={handleClear} hitSlop={8}>
              <X size={18} color={colors.muted} />
            </Pressable>
          ) : null
        }
      />

      {isOpen && conditions.length > 0 && (
        <View style={styles.dropdown}>
          {conditions.slice(0, 5).map((item) => (
            <Pressable
              key={item.id}
              onPress={() => handleSelect(item)}
              style={({ pressed }) => [
                styles.item,
                pressed && styles.itemPressed,
              ]}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Select ${item.name}`}
            >
              <Stethoscope size={16} color={colors.navy} style={styles.itemIcon} />
              <View style={styles.itemTextContainer}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>
                  Primary Ward: {item.primaryBedType} • Urgency: Level {item.urgencyLevel}/5
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 20,
  },
  dropdown: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  itemPressed: {
    backgroundColor: colors.cardSoft,
  },
  itemIcon: {
    marginRight: 12,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemName: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.body,
    color: colors.ink,
  },
  itemMeta: {
    fontFamily: typography.fontFamilies.body,
    fontSize: typography.sizes.caption,
    color: colors.muted,
    marginTop: 2,
  },
});

