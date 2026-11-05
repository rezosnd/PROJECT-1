import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { equipmentApi, EquipmentItem } from '../../src/lib/api/equipment.api';
import { hospitalsApi } from '../../src/lib/api/hospitals.api';
import { Card } from '../../src/components/ui/Card';
import { Chip } from '../../src/components/ui/Chip';
import { Skeleton } from '../../src/components/ui/Skeleton';
import { EmergencyFooter } from '../../src/components/ui/EmergencyFooter';
import { colors, typography } from '../../src/theme/tokens';
import { Stethoscope, Clock, Building2, Search, ChevronLeft } from 'lucide-react-native';

const TYPES = ['ALL', 'VENTILATOR', 'CT', 'MRI', 'DIALYSIS', 'INCUBATOR', 'OPERATION_THEATRE', 'X_RAY'];

export default function EquipmentScreen() {
  const [selectedHospital, setSelectedHospital] = useState<{ id: string; name: string } | null>(null);
  const [hospitalQuery, setHospitalQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const { data: hospitalsData, isLoading: hospitalsLoading } = useQuery({
    queryKey: ['equipment-hospitals'],
    queryFn: () => hospitalsApi.getHospitals('VERIFIED'),
    staleTime: 30_000,
  });

  const hospitals = useMemo(() => {
    const items = (hospitalsData as any)?.items || [];
    const q = hospitalQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (h: any) =>
        h.name?.toLowerCase().includes(q) ||
        h.address?.toLowerCase().includes(q) ||
        h.city?.toLowerCase().includes(q)
    );
  }, [hospitalsData, hospitalQuery]);

  const { data: equipmentList = [], isLoading: eqLoading } = useQuery({
    queryKey: ['hospital-equipment', selectedHospital?.id, typeFilter],
    queryFn: () => equipmentApi.getHospitalEquipment(selectedHospital!.id),
    enabled: Boolean(selectedHospital?.id),
    staleTime: 10_000,
  });

  const filteredEquipment = useMemo(() => {
    if (typeFilter === 'ALL') return equipmentList;
    return equipmentList.filter((e) => e.type === typeFilter);
  }, [equipmentList, typeFilter]);

  if (!selectedHospital) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Equipment</Text>
          <Text style={styles.subtitle}>Search or select a hospital, then view its live equipment.</Text>
          <View style={styles.searchBox}>
            <Search size={16} color="#64748B" />
            <TextInput
              value={hospitalQuery}
              onChangeText={setHospitalQuery}
              placeholder="Search hospital name…"
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
            />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.listContent}>
          {hospitalsLoading ? (
            <>
              <Skeleton height={72} borderRadius={16} />
              <Skeleton height={72} borderRadius={16} />
            </>
          ) : hospitals.length === 0 ? (
            <Text style={styles.empty}>No hospitals found.</Text>
          ) : (
            hospitals.map((h: any) => (
              <Pressable
                key={h.id}
                onPress={() => setSelectedHospital({ id: h.id, name: h.name })}
                style={styles.hospitalRow}
              >
                <View style={styles.hospIcon}>
                  <Building2 size={18} color="#0F172A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.hospName}>{h.name}</Text>
                  <Text style={styles.hospAddr} numberOfLines={1}>
                    {h.address || h.city || 'Bhubaneswar'}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
          <EmergencyFooter />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => setSelectedHospital(null)} style={styles.backRow}>
          <ChevronLeft size={18} color="#0F172A" />
          <Text style={styles.backText}>Change hospital</Text>
        </Pressable>
        <Text style={styles.title}>{selectedHospital.name}</Text>
        <Text style={styles.subtitle}>Live diagnostic & life-support equipment</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {TYPES.map((t) => (
            <Pressable
              key={t}
              onPress={() => setTypeFilter(t)}
              style={[styles.chip, typeFilter === t && styles.chipActive]}
            >
              <Text style={[styles.chipText, typeFilter === t && styles.chipTextActive]}>
                {t === 'ALL' ? 'All' : t.replace(/_/g, ' ')}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {eqLoading ? (
          <>
            <Skeleton height={110} borderRadius={20} />
            <Skeleton height={110} borderRadius={20} />
          </>
        ) : filteredEquipment.length === 0 ? (
          <Text style={styles.empty}>No equipment units for this filter.</Text>
        ) : (
          filteredEquipment.map((eq: EquipmentItem) => {
            const statusVariant = eq.status === 'OFFLINE' || eq.status === 'MAINTENANCE' ? 'red' : eq.inUse ? 'orange' : 'green';
            return (
              <Card key={eq.id} variant="default" style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconCircle}>
                    <Stethoscope size={18} color={colors.navy} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eqName}>{eq.name}</Text>
                    <Text style={styles.eqType}>{eq.type}</Text>
                  </View>
                  <Chip variant={statusVariant as any} dot>
                    {eq.status === 'MAINTENANCE'
                      ? 'Maintenance'
                      : eq.status === 'OFFLINE'
                      ? 'Offline'
                      : eq.inUse
                      ? 'In use'
                      : 'Ready'}
                  </Chip>
                </View>
                {eq.inUse && eq.availableAt ? (
                  <View style={styles.timeRow}>
                    <Clock size={13} color={colors.orange} />
                    <Text style={styles.timeText}>Available at {eq.availableAt}</Text>
                  </View>
                ) : null}
              </Card>
            );
          })
        )}
        <EmergencyFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 20, paddingTop: 54, paddingBottom: 12 },
  title: { fontFamily: typography.fontFamilies.headingBold, fontSize: 24, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 12, color: '#64748B', marginTop: 4, marginBottom: 12 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    backgroundColor: '#F8FAFC',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A' },
  listContent: { padding: 20, paddingTop: 8, gap: 10, paddingBottom: 40 },
  hospitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  hospIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hospName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  hospAddr: { fontSize: 11, color: '#64748B', marginTop: 2 },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 40 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 8 },
  backText: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  chips: { gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  chipActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  chipText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  chipTextActive: { color: '#FFFFFF' },
  card: { marginBottom: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eqName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  eqType: { fontSize: 11, color: '#64748B', marginTop: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  timeText: { fontSize: 12, color: colors.orange, fontWeight: '600' },
});
