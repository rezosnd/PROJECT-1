import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  Pressable,
  Linking,
  Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bedsApi, BedRequest } from '../../src/lib/api/beds.api';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { EmergencyFooter } from '../../src/components/ui/EmergencyFooter';
import { colors, typography, spacing } from '../../src/theme/tokens';
import {
  Clock,
  Building2,
  MapPin,
  Phone,
  Navigation,
  BedDouble,
  XCircle,
  Check,
  ChevronRight,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const CARD_COLORS = ['#FEE244', '#B9F84B', '#E9D5FF', '#BAE6FD', '#FCE354'];

function HoldCountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const diffMs = new Date(expiresAt).getTime() - Date.now();
      if (diffMs <= 0) {
        setTimeLeft('00:00');
        setIsExpired(true);
        return;
      }
      const totalSec = Math.floor(diffMs / 1000);
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <View style={[styles.countdownPill, isExpired && styles.countdownExpiredPill]}>
      <Clock size={14} color={isExpired ? '#B91C1C' : '#111111'} />
      <Text style={[styles.countdownText, isExpired && { color: '#B91C1C' }]}>
        {isExpired ? 'Expired' : timeLeft}
      </Text>
    </View>
  );
}

function statusLabel(status: string) {
  switch (status) {
    case 'HOLD':
    case 'PENDING':
      return 'On hold';
    case 'APPROVED':
      return 'Confirmed';
    case 'ADMITTED':
      return 'Admitted';
    case 'DISCHARGED':
      return 'Left hospital';
    case 'REJECTED':
      return 'Declined';
    case 'EXPIRED':
      return 'Expired';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}

/** Confirmed booking — patient should navigate to hospital */
function canGoToHospital(status: string) {
  return status === 'APPROVED';
}

function isAdmitted(status: string) {
  return status === 'ADMITTED';
}

function isLeft(status: string) {
  return status === 'DISCHARGED';
}

function isHoldActive(status: string) {
  return status === 'HOLD' || status === 'PENDING';
}

function RequestCard({
  req,
  color,
  onCancel,
  onGoHospital,
  onOpenDetail,
  onCall,
}: {
  req: BedRequest;
  color: string;
  onCancel: () => void;
  onGoHospital: () => void;
  onOpenDetail: () => void;
  onCall: () => void;
}) {
  const showGo = canGoToHospital(req.status);
  const admitted = isAdmitted(req.status);
  const holding = isHoldActive(req.status);
  const left = isLeft(req.status);

  return (
    <Pressable
      onPress={onOpenDetail}
      style={({ pressed }) => [
        styles.requestCard,
        { backgroundColor: left ? '#E0F2FE' : color },
        pressed && { transform: [{ scale: 0.985 }], opacity: 0.96 },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={styles.identityRow}>
          <View style={styles.iconCircle}>
            <Building2 size={20} color="#111111" strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.hospName} numberOfLines={2}>
              {req.hospitalName || 'Hospital'}
            </Text>
            <Text style={styles.wardLine}>
              {req.wardType} · {req.urgency}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.statusPill,
            (showGo || admitted) && styles.statusPillBooked,
            holding && styles.statusPillHold,
            left && styles.statusPillLeft,
          ]}
        >
          <Text style={[styles.statusText, (showGo || admitted || left) && styles.statusTextBooked]}>
            {statusLabel(req.status)}
          </Text>
        </View>
      </View>

      <View style={styles.innerPanel}>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <BedDouble size={14} color="#64748B" />
            <Text style={styles.metaText}>{req.wardType} ward</Text>
          </View>
          {req.hospitalCity ? (
            <View style={styles.metaItem}>
              <MapPin size={14} color="#64748B" />
              <Text style={styles.metaText} numberOfLines={1}>
                {req.hospitalCity}
              </Text>
            </View>
          ) : null}
        </View>

        {holding && req.holdExpiresAt ? (
          <View style={styles.holdRow}>
            <Text style={styles.holdLabel}>Hold expires in</Text>
            <HoldCountdownTimer expiresAt={req.holdExpiresAt} />
          </View>
        ) : null}

        {showGo ? (
          <View style={styles.confirmedBanner}>
            <Check size={14} color="#065F46" strokeWidth={3} />
            <Text style={styles.confirmedText}>Hospital confirmed — head there now</Text>
          </View>
        ) : null}

        {admitted ? (
          <View style={styles.confirmedBanner}>
            <Check size={14} color="#065F46" strokeWidth={3} />
            <Text style={styles.confirmedText}>You are admitted at this hospital</Text>
          </View>
        ) : null}

        {left ? (
          <View style={styles.leftBanner}>
            <Check size={14} color="#0369A1" strokeWidth={3} />
            <Text style={styles.leftBannerText}>
              You left — bed released. No navigation needed.
            </Text>
          </View>
        ) : null}

        {(req.note || req.reason) ? (
          <Text style={styles.note} numberOfLines={2}>
            “{req.note || req.reason}”
          </Text>
        ) : null}
      </View>

      {showGo ? (
        <View style={styles.actionStack}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onGoHospital();
            }}
            style={({ pressed }) => [styles.goBtn, pressed && { opacity: 0.9 }]}
          >
            <Navigation size={16} color="#FFFFFF" strokeWidth={2.4} />
            <Text style={styles.goBtnText}>Go to hospital</Text>
            <ChevronRight size={16} color="#FFFFFF" />
          </Pressable>
          {req.hospitalPhone ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                onCall();
              }}
              style={({ pressed }) => [styles.callBtn, pressed && { opacity: 0.9 }]}
            >
              <Phone size={15} color="#111111" />
              <Text style={styles.callBtnText}>Call hospital</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {admitted && req.hospitalPhone ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            onCall();
          }}
          style={({ pressed }) => [styles.callBtn, { marginTop: 12 }, pressed && { opacity: 0.9 }]}
        >
          <Phone size={15} color="#111111" />
          <Text style={styles.callBtnText}>Call hospital</Text>
        </Pressable>
      ) : null}

      {holding ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            onCancel();
          }}
          style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.85 }]}
        >
          <XCircle size={15} color="#B91C1C" />
          <Text style={styles.cancelBtnText}>Cancel hold</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export default function RequestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);

  const {
    data: requests = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['my-bed-requests'],
    queryFn: () => bedsApi.getMyRequests(),
    refetchInterval: 5000,
  });

  const cancelMutation = useMutation({
    mutationFn: (reqId: string) => bedsApi.cancelBedRequest(reqId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bed-requests'] });
      setCancelTargetId(null);
    },
  });

  const sorted = useMemo(() => {
    const rank = (s: string) => {
      if (s === 'APPROVED' || s === 'ADMITTED') return 0;
      if (s === 'HOLD' || s === 'PENDING') return 1;
      return 2;
    };
    return [...requests].sort((a, b) => rank(a.status) - rank(b.status));
  }, [requests]);

  const openMaps = (req: BedRequest) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const lat = req.hospitalLatitude;
    const lng = req.hospitalLongitude;
    if (lat != null && lng != null) {
      const url = Platform.select({
        ios: `maps:0,0?q=${lat},${lng}`,
        android: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(req.hospitalName || 'Hospital')})`,
        default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      });
      Linking.openURL(url!);
      return;
    }
    const q = encodeURIComponent(req.hospitalName || req.hospitalAddress || 'hospital');
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Requests</Text>
        <Text style={styles.subtitle}>Live bed holds · hospital confirmations</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => { void refetch(); }} />
        }
        showsVerticalScrollIndicator={false}
      >
        {sorted.length === 0 && !isLoading ? (
          <EmptyState
            icon={<Clock size={32} color={colors.muted} />}
            title="No bed requests yet"
            description="When you request a bed, your hold timer and hospital confirmation appear here."
            actionLabel="Find Hospitals"
            onAction={() => router.push('/(tabs)/hospitals')}
          />
        ) : (
          sorted.map((req, index) => (
            <RequestCard
              key={req.id}
              req={req}
              color={CARD_COLORS[index % CARD_COLORS.length]}
              onCancel={() => setCancelTargetId(req.id)}
              onGoHospital={() => openMaps(req)}
              onOpenDetail={() => router.push(`/hospital/${req.hospitalId}` as any)}
              onCall={() => {
                if (req.hospitalPhone) Linking.openURL(`tel:${req.hospitalPhone}`);
              }}
            />
          ))
        )}
      </ScrollView>

      <Modal
        visible={Boolean(cancelTargetId)}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelTargetId(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Cancel bed reservation?</Text>
            <Text style={styles.modalDesc}>
              Releasing this hold returns the bed to the emergency pool for other patients.
            </Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalKeep} onPress={() => setCancelTargetId(null)}>
                <Text style={styles.modalKeepText}>Keep hold</Text>
              </Pressable>
              <Pressable
                style={styles.modalConfirm}
                onPress={() => cancelTargetId && cancelMutation.mutate(cancelTargetId)}
              >
                <Text style={styles.modalConfirmText}>
                  {cancelMutation.isPending ? 'Cancelling…' : 'Confirm cancel'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <EmergencyFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: 28,
    paddingTop: 8,
  },
  requestCard: {
    borderRadius: 28,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hospName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -0.3,
  },
  wardLine: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  statusPill: {
    backgroundColor: 'rgba(17,17,17,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusPillBooked: {
    backgroundColor: '#111111',
  },
  statusPillHold: {
    backgroundColor: '#FFFFFF',
  },
  statusPillLeft: {
    backgroundColor: '#0369A1',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111111',
  },
  statusTextBooked: {
    color: '#FFFFFF',
  },
  innerPanel: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    padding: 14,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  holdRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  holdLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111111',
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  countdownExpiredPill: {
    backgroundColor: '#FEF2F2',
  },
  countdownText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: 0.5,
  },
  confirmedBanner: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  confirmedText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  leftBanner: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  leftBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
  },
  note: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 17,
    color: '#64748B',
    fontStyle: 'italic',
  },
  actionStack: {
    marginTop: 12,
    gap: 8,
  },
  goBtn: {
    height: 52,
    borderRadius: 999,
    backgroundColor: '#111111',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  goBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  callBtn: {
    height: 46,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  callBtnText: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '800',
  },
  cancelBtn: {
    marginTop: 10,
    height: 44,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cancelBtnText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
    marginBottom: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  modalKeep: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
  },
  modalKeepText: {
    fontWeight: '700',
    color: '#0F172A',
    fontSize: 13,
  },
  modalConfirm: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#DC2626',
  },
  modalConfirmText: {
    fontWeight: '800',
    color: '#FFFFFF',
    fontSize: 13,
  },
});
