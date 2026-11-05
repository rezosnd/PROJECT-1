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
import { Button } from '../../components/ui/Button';
import { bedsApi } from '../../lib/api/beds.api';
import { forecastApi } from '../../lib/api/forecast.api';
import { useLiveBeds } from '../../hooks/useLiveBeds';
import { offlineManager } from '../../lib/offline/offline-manager';
import { colors, radius, typography } from '../../theme/tokens';
import { ShieldCheck, Clock, X, BedDouble } from 'lucide-react-native';
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
  if (pct >= 70) return { pct, label: 'Likely free', tone: colors.green };
  if (pct >= 40) return { pct, label: 'Possible', tone: colors.orange };
  return { pct, label: 'Unlikely', tone: colors.red };
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
    const merged = [...new Set([...fromLive, ...WARD_OPTIONS])];
    return merged;
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
              <Text style={styles.title}>Request Emergency Bed</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {hospitalName}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.ink} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.noticeBox}>
              <Clock size={16} color={colors.blue} style={styles.noticeIcon} />
              <Text style={styles.noticeText}>
                Submitting places a verified <Text style={styles.bold}>15-minute hold</Text> on this bed.
                A confirmation email is sent to your registered inbox.
              </Text>
            </View>

            {/* Live free + chance */}
            <View style={styles.liveCard}>
              <View style={styles.liveTop}>
                <View style={styles.liveIconBox}>
                  <BedDouble size={18} color={colors.navy} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.liveLabel}>
                    {wardType} · {isLive ? 'Live' : 'Cached'}
                  </Text>
                  <Text
                    style={[
                      styles.liveFree,
                      { color: freeNow > 2 ? colors.green : freeNow > 0 ? colors.orange : colors.red },
                    ]}
                  >
                    {freeNow > 0
                      ? `${freeNow} bed${freeNow === 1 ? '' : 's'} free right now`
                      : 'No beds free right now'}
                  </Text>
                </View>
              </View>
              <View style={styles.chanceRow}>
                <Text style={[styles.chancePct, { color: chance3h.tone }]}>{chance3h.pct}%</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.chanceLabel, { color: chance3h.tone }]}>{chance3h.label}</Text>
                  <Text style={styles.chanceHint}>
                    Easy read: about {chance3h.pct}% chance a {wardType} bed is free in ~3 hours.
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.sectionLabel}>Bed type</Text>
            <View style={styles.chipRow}>
              {availableWards.map((w) => {
                const ward = beds.find((b) => b.wardType === w);
                const free = ward?.free;
                return (
                  <Pressable
                    key={w}
                    onPress={() => setWardType(w)}
                    style={[styles.chip, wardType === w && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, wardType === w && styles.chipTextActive]}>{w}</Text>
                    {typeof free === 'number' ? (
                      <Text style={[styles.chipFree, wardType === w && styles.chipTextActive]}>
                        {free} free
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>How urgent?</Text>
            <View style={styles.chipRow}>
              {[
                { val: 'IMMEDIATE', label: 'Immediate (<15m)' },
                { val: 'HIGH', label: 'High (<1h)' },
                { val: 'MODERATE', label: 'Moderate' },
              ].map((u) => (
                <Pressable
                  key={u.val}
                  onPress={() => setUrgency(u.val as any)}
                  style={[styles.chip, urgency === u.val && styles.chipActive]}
                >
                  <Text style={[styles.chipText, urgency === u.val && styles.chipTextActive]}>
                    {u.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Brief symptoms / notes</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Slurred speech, sudden left-sided weakness..."
              placeholderTextColor={colors.muted}
              style={styles.textArea}
              multiline
              numberOfLines={3}
            />

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextContainer}>
                <View style={styles.abhaHeader}>
                  <ShieldCheck size={16} color={colors.navy} />
                  <Text style={styles.toggleTitle}>Share linked ABHA</Text>
                </View>
                <Text style={styles.toggleSubtitle}>
                  Sends your verified digital health ID to admitting staff.
                </Text>
              </View>
              <Switch
                value={shareAbha}
                onValueChange={setShareAbha}
                trackColor={{ false: colors.cardSoft, true: colors.navy }}
                thumbColor="#FFFFFF"
              />
            </View>

            {freeNow <= 0 ? (
              <Text style={styles.fullHint}>
                No {wardType} beds free right now — you can still request; hospital may approve from expected discharges.
              </Text>
            ) : null}

            <Button onPress={handleSubmit} isLoading={isSubmitting} style={styles.submitBtn}>
              {freeNow > 0 ? `Hold ${wardType} bed (15 min)` : `Request ${wardType} anyway`}
            </Button>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxHeight: '90%',
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
    gap: 8,
  },
  title: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: typography.sizes.h3,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: typography.fontFamilies.body,
    fontSize: typography.sizes.caption,
    color: colors.muted,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.blueLight,
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 12,
  },
  noticeIcon: {
    marginRight: 8,
  },
  noticeText: {
    flex: 1,
    fontFamily: typography.fontFamilies.body,
    fontSize: typography.sizes.caption,
    color: colors.navy,
    lineHeight: 16,
  },
  bold: {
    fontFamily: typography.fontFamilies.bodyBold,
  },
  liveCard: {
    backgroundColor: colors.cardSoft,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  liveTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  liveIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveLabel: {
    fontFamily: typography.fontFamilies.bodyMedium,
    fontSize: 11,
    color: colors.muted,
    textTransform: 'uppercase',
  },
  liveFree: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: typography.sizes.body,
    marginTop: 2,
  },
  chanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  chancePct: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: 28,
    minWidth: 64,
  },
  chanceLabel: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.bodySmall,
  },
  chanceHint: {
    fontFamily: typography.fontFamilies.body,
    fontSize: typography.sizes.caption,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 16,
  },
  sectionLabel: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.bodySmall,
    color: colors.ink,
    marginBottom: 8,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.cardSoft,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: colors.ink,
  },
  chipText: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.caption,
    color: colors.ink,
  },
  chipFree: {
    fontFamily: typography.fontFamilies.body,
    fontSize: 10,
    color: colors.muted,
    marginTop: 2,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  textArea: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: 12,
    fontFamily: typography.fontFamilies.body,
    fontSize: typography.sizes.bodySmall,
    color: colors.ink,
    textAlignVertical: 'top',
    height: 72,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.hairline,
    marginBottom: 20,
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
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.bodySmall,
    color: colors.ink,
  },
  toggleSubtitle: {
    fontFamily: typography.fontFamilies.body,
    fontSize: typography.sizes.caption,
    color: colors.muted,
  },
  fullHint: {
    fontFamily: typography.fontFamilies.body,
    fontSize: typography.sizes.caption,
    color: colors.muted,
    marginBottom: 10,
    lineHeight: 18,
  },
  submitBtn: {
    marginBottom: 10,
  },
});
