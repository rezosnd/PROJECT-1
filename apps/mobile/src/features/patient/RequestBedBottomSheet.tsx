import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Switch,
  TextInput,
  ScrollView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { bedsApi } from '../../lib/api/beds.api';
import { forecastApi } from '../../lib/api/forecast.api';
import { useLiveBeds } from '../../hooks/useLiveBeds';
import { offlineManager } from '../../lib/offline/offline-manager';
import { typography } from '../../theme/tokens';
import { ShieldCheck, Clock, X, BedDouble, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export interface RequestBedBottomSheetProps {
  visible: boolean;
  hospitalId: string;
  hospitalName: string;
  initialWardType?: string;
  onClose: () => void;
  onSuccess: (requestId: string) => void;
}

const WARD_OPTIONS = ['ICU', 'NICU', 'PICU', 'HDU', 'CCU', 'EMERGENCY', 'GENERAL'] as const;

function plainChance(p: number) {
  const pct = Math.round((p || 0) * 100);
  if (pct >= 70) return { pct, label: 'Likely free', tone: '#065F46' };
  if (pct >= 40) return { pct, label: 'Possible', tone: '#B45309' };
  return { pct, label: 'Unlikely', tone: '#B91C1C' };
}

export const RequestBedBottomSheet: React.FC<RequestBedBottomSheetProps> = ({
  visible,
  hospitalId,
  hospitalName,
  initialWardType = 'ICU',
  onClose,
  onSuccess,
}) => {
  const [wardType, setWardType] = useState(initialWardType);
  const [urgency, setUrgency] = useState<'IMMEDIATE' | 'HIGH' | 'MODERATE'>('IMMEDIATE');
  const [note, setNote] = useState('');
  const [shareAbha, setShareAbha] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: beds = [], isLive } = useLiveBeds(visible ? hospitalId : undefined);

  useEffect(() => {
    if (visible && initialWardType) setWardType(initialWardType);
  }, [visible, initialWardType]);

  const availableWards = useMemo(() => {
    const fromLive = beds.map((b) => b.wardType);
    return [...new Set([...fromLive, ...WARD_OPTIONS])];
  }, [beds]);

  const selectedWard = useMemo(
    () => beds.find((b) => b.wardType === wardType),
    [beds, wardType]
  );

  const freeNow = selectedWard?.free ?? 0;

  const { data: wardForecast } = useQuery({
    queryKey: ['mobile-request-forecast', hospitalId, wardType],
    queryFn: () => forecastApi.getForecast(hospitalId, wardType),
    enabled: Boolean(visible && hospitalId && wardType),
    staleTime: 30000,
  });

  const chance3h = plainChance(
    wardForecast?.horizons?.h3?.probabilityAtLeastOneFree ?? (freeNow > 0 ? 0.85 : 0.35)
  );

  const handleSubmit = async () => {
    setIsSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const idempotencyKey = offlineManager.createIdempotencyKey();

    try {
      const res = await bedsApi.requestBed({
        hospitalId,
        wardType,
        urgency,
        note,
        shareAbha,
        idempotencyKey,
      });
      setIsSubmitting(false);
      onSuccess(res.id);
    } catch {
      offlineManager.queueRequest({
        hospitalId,
        wardType,
        urgency,
        note,
        shareAbha,
      });
      setIsSubmitting(false);
      onSuccess(`offline-${Date.now()}`);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>Bed reservation</Text>
              <Text style={styles.title}>Hold a bed</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {hospitalName}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={18} color="#111111" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.holdBanner}>
              <Clock size={16} color="#111111" />
              <Text style={styles.holdBannerText}>
                Places a <Text style={styles.bold}>15-minute verified hold</Text>. Confirmation email follows.
              </Text>
            </View>

            <View style={styles.liveCard}>
              <View style={styles.liveTop}>
                <View style={styles.liveIconBox}>
                  <BedDouble size={18} color="#111111" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.liveLabel}>
                    {wardType} · {isLive ? 'Live' : 'Cached'}
                  </Text>
                  <Text
                    style={[
                      styles.liveFree,
                      { color: freeNow > 2 ? '#065F46' : freeNow > 0 ? '#B45309' : '#B91C1C' },
                    ]}
                  >
                    {freeNow > 0
                      ? `${freeNow} bed${freeNow === 1 ? '' : 's'} free now`
                      : 'No beds free right now'}
                  </Text>
                </View>
                <View style={styles.chanceBadge}>
                  <Text style={[styles.chancePct, { color: chance3h.tone }]}>{chance3h.pct}%</Text>
                  <Text style={styles.chanceTiny}>{chance3h.label}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.sectionLabel}>Ward</Text>
            <View style={styles.chipRow}>
              {availableWards.map((w) => {
                const ward = beds.find((b) => b.wardType === w);
                const free = ward?.free;
                const active = wardType === w;
                return (
                  <Pressable
                    key={w}
                    onPress={() => setWardType(w)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{w}</Text>
                    {typeof free === 'number' ? (
                      <Text style={[styles.chipFree, active && styles.chipTextActive]}>
                        {free} free
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>Urgency</Text>
            <View style={styles.chipRow}>
              {[
                { val: 'IMMEDIATE', label: 'Immediate' },
                { val: 'HIGH', label: 'High' },
                { val: 'MODERATE', label: 'Moderate' },
              ].map((u) => {
                const active = urgency === u.val;
                return (
                  <Pressable
                    key={u.val}
                    onPress={() => setUrgency(u.val as any)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{u.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>Notes for triage</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Brief symptoms for admitting staff…"
              placeholderTextColor="#64748B"
              style={styles.textArea}
              multiline
              numberOfLines={3}
            />

            <View style={styles.toggleCard}>
              <View style={styles.toggleTextContainer}>
                <View style={styles.abhaHeader}>
                  <ShieldCheck size={16} color="#0B3D1A" />
                  <Text style={styles.toggleTitle}>Share linked ABHA</Text>
                </View>
                <Text style={styles.toggleSubtitle}>
                  Send verified health ID to hospital staff
                </Text>
              </View>
              <Switch
                value={shareAbha}
                onValueChange={setShareAbha}
                trackColor={{ false: '#CBD5E1', true: '#0B3D1A' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {freeNow <= 0 ? (
              <Text style={styles.fullHint}>
                No {wardType} free now — you can still request; hospital may approve from expected discharges.
              </Text>
            ) : null}

            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.submitBtn,
                (pressed || isSubmitting) && { opacity: 0.9 },
              ]}
            >
              <View style={styles.submitThumb}>
                <Check size={20} color="#111111" strokeWidth={3} />
              </View>
              <Text style={styles.submitText}>
                {isSubmitting
                  ? 'Booking…'
                  : freeNow > 0
                    ? `Hold ${wardType} · 15 min`
                    : `Request ${wardType}`}
              </Text>
              <View style={styles.submitTarget}>
                <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
              </View>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FEE244',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxHeight: '92%',
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.22)',
    alignSelf: 'center',
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: '#3F3F46',
  },
  title: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: 26,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3F3F46',
    marginTop: 4,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.75)',
    padding: 12,
    borderRadius: 18,
    marginBottom: 12,
  },
  holdBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#111111',
    fontWeight: '600',
  },
  bold: { fontWeight: '800' },
  liveCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 22,
    padding: 14,
    marginBottom: 16,
  },
  liveTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  liveIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE244',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  liveFree: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  chanceBadge: {
    alignItems: 'flex-end',
  },
  chancePct: {
    fontSize: 22,
    fontWeight: '900',
  },
  chanceTiny: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111111',
    marginBottom: 8,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    minWidth: 72,
  },
  chipActive: {
    backgroundColor: '#111111',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111111',
  },
  chipFree: {
    fontSize: 10,
    fontWeight: '600',
    color: '#52525B',
    marginTop: 2,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  textArea: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 18,
    padding: 14,
    fontSize: 13,
    color: '#111111',
    textAlignVertical: 'top',
    height: 78,
    marginBottom: 14,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  abhaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111111',
  },
  toggleSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  fullHint: {
    fontSize: 12,
    color: '#3F3F46',
    marginBottom: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  submitBtn: {
    height: 60,
    borderRadius: 999,
    backgroundColor: '#111111',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  submitThumb: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  submitTarget: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#262933',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
