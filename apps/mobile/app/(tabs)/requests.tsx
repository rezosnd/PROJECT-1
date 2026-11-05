import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bedsApi, BedRequest } from '../../src/lib/api/beds.api';
import { Card } from '../../src/components/ui/Card';
import { Chip } from '../../src/components/ui/Chip';
import { Button } from '../../src/components/ui/Button';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { EmergencyFooter } from '../../src/components/ui/EmergencyFooter';
import { colors, radius, typography, spacing } from '../../src/theme/tokens';
import { Clock, Building2, ShieldCheck, AlertCircle, XCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

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
    <View style={styles.countdownContainer}>
      <Clock size={16} color={isExpired ? colors.red : colors.orange} />
      <Text style={[styles.countdownText, isExpired && styles.countdownExpired]}>
        {isExpired ? 'Hold Expired' : timeLeft}
      </Text>
    </View>
  );
}

export default function RequestsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
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

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'HOLD':
      case 'PENDING':
        return 'orange';
      case 'APPROVED':
      case 'ADMITTED':
        return 'green';
      case 'REJECTED':
      case 'EXPIRED':
      case 'CANCELLED':
      default:
        return 'red';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('requests.title', 'My Requests')}</Text>
        <Text style={styles.subtitle}>
          {t('requests.subtitle', 'Track your emergency bed hold reservations')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { void refetch(); }} />}
        showsVerticalScrollIndicator={false}
      >
        {requests.length === 0 && !isLoading ? (
          <EmptyState
            icon={<Clock size={32} color={colors.muted} />}
            title={t('requests.empty', 'No active bed requests')}
            description={t(
              'requests.emptyDesc',
              'When you request a bed, your 15-minute hold timer and intake confirmation appear here.'
            )}
            actionLabel="Find Hospitals"
            onAction={() => router.push('/(tabs)/hospitals')}
          />
        ) : (
          requests.map((req: BedRequest) => {
            const isHoldActive = req.status === 'HOLD' || req.status === 'PENDING';

            return (
              <Card key={req.id} variant="default" style={styles.card}>
                {/* Header Row */}
                <View style={styles.cardTopRow}>
                  <View style={styles.hospBox}>
                    <Building2 size={16} color={colors.navy} />
                    <Text style={styles.hospName}>
                      {req.hospitalName || 'AIIMS Bhubaneswar'}
                    </Text>
                  </View>
                  <Chip variant={getStatusVariant(req.status)} dot pulse={isHoldActive}>
                    {t(`requests.status.${req.status}`, req.status)}
                  </Chip>
                </View>

                {/* Ward & Urgency Meta */}
                <View style={styles.metaBox}>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>Ward Type</Text>
                    <Text style={styles.metaVal}>{req.wardType} Ward</Text>
                  </View>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>Urgency</Text>
                    <Text style={styles.metaVal}>{req.urgency}</Text>
                  </View>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>ABHA Linked</Text>
                    <Text style={styles.metaVal}>{req.shareAbha ? 'Yes' : 'No'}</Text>
                  </View>
                </View>

                {/* Active Hold Countdown Strip */}
                {isHoldActive && req.holdExpiresAt && (
                  <View style={styles.holdStrip}>
                    <View>
                      <Text style={styles.holdLabel}>{t('requests.holdCountdown', 'Hold expires in')}</Text>
                      <Text style={styles.holdSub}>Inventory locked on server</Text>
                    </View>
                    <HoldCountdownTimer expiresAt={req.holdExpiresAt} />
                  </View>
                )}

                {/* Triage Note */}
                {req.note && (
                  <Text style={styles.noteText} numberOfLines={2}>
                    &ldquo;{req.note}&rdquo;
                  </Text>
                )}

                {/* Cancel Action */}
                {isHoldActive && (
                  <View style={styles.actionRow}>
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => setCancelTargetId(req.id)}
                      style={styles.cancelBtn}
                      icon={<XCircle size={14} color={colors.red} />}
                    >
                      {t('requests.cancelHold', 'Cancel Hold')}
                    </Button>
                  </View>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Cancel Confirmation Dialog */}
      <Modal
        visible={Boolean(cancelTargetId)}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelTargetId(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Cancel Bed Reservation?</Text>
            <Text style={styles.modalDesc}>
              Releasing this reservation will immediately return the bed to the public emergency pool for other arriving patients.
            </Text>
            <View style={styles.modalActions}>
              <Button
                variant="outline"
                size="sm"
                onPress={() => setCancelTargetId(null)}
                style={styles.modalBtn}
              >
                Keep Hold
              </Button>
              <Button
                variant="danger"
                size="sm"
                onPress={() => cancelTargetId && cancelMutation.mutate(cancelTargetId)}
                isLoading={cancelMutation.isPending}
                style={styles.modalBtn}
              >
                Confirm Cancel
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Emergency Footer */}
      <EmergencyFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 54,
    paddingBottom: 12,
  },
  title: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: typography.sizes.h2,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: typography.fontFamilies.body,
    fontSize: typography.sizes.bodySmall,
    color: colors.muted,
    marginTop: 2,
    marginBottom: 8,
  },
  listContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: 24,
  },
  card: {
    marginBottom: 16,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  hospBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  hospName: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: typography.sizes.body,
    color: colors.ink,
  },
  metaBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    marginBottom: 12,
  },
  metaCol: {
    alignItems: 'flex-start',
  },
  metaLabel: {
    fontFamily: typography.fontFamilies.body,
    fontSize: typography.sizes.badge,
    color: colors.muted,
    textTransform: 'uppercase',
  },
  metaVal: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.bodySmall,
    color: colors.ink,
    marginTop: 2,
  },
  holdStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.orangeLight,
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 12,
  },
  holdLabel: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.caption,
    color: colors.orange,
  },
  holdSub: {
    fontFamily: typography.fontFamilies.body,
    fontSize: 10,
    color: colors.muted,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  countdownText: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: typography.sizes.body,
    color: colors.orange,
    letterSpacing: 1,
  },
  countdownExpired: {
    color: colors.red,
  },
  noteText: {
    fontFamily: typography.fontFamilies.body,
    fontSize: typography.sizes.caption,
    color: colors.muted,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    paddingTop: 10,
  },
  cancelBtn: {
    borderColor: colors.red,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: typography.sizes.h3,
    color: colors.ink,
    marginBottom: 8,
  },
  modalDesc: {
    fontFamily: typography.fontFamilies.body,
    fontSize: typography.sizes.caption,
    color: colors.muted,
    lineHeight: 18,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalBtn: {
    minWidth: 90,
  },
});

