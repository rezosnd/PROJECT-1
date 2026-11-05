import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Image, Share } from 'react-native';
import { AbhaProfile } from '../../lib/api/abha.api';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { ShieldCheck, Trash2, Maximize2, Share2 } from 'lucide-react-native';
import { colors, radius, typography, shadows } from '../../theme/tokens';

export interface AbhaCardViewProps {
  profile: AbhaProfile;
  onUnlink: () => Promise<void>;
}

function buildQrPayload(profile: AbhaProfile) {
  return JSON.stringify({
    type: 'ABHA',
    number: profile.maskedNumber || '',
    address: profile.abhaAddress || '',
    name: profile.name || '',
    yob: profile.yearOfBirth || '',
    gender: profile.gender || '',
    mobile: profile.mobile || '',
    source: 'LifeLink',
  });
}

export const AbhaCardView: React.FC<AbhaCardViewProps> = ({ profile, onUnlink }) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);

  const qrPayload = useMemo(
    () => profile.qrPayload || buildQrPayload(profile),
    [profile.qrPayload, profile.maskedNumber, profile.abhaAddress, profile.name, profile.yearOfBirth]
  );
  const qrUri = useMemo(
    () =>
      profile.qrImageUrl ||
      `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=${encodeURIComponent(qrPayload)}`,
    [profile.qrImageUrl, qrPayload]
  );

  const handleConfirm = async () => {
    setIsUnlinking(true);
    try {
      await onUnlink();
      setConfirmOpen(false);
    } finally {
      setIsUnlinking(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `LifeLink ABHA\n${profile.name}\n${profile.maskedNumber}\n${profile.abhaAddress}`,
      });
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <View style={styles.card}>
        <View style={styles.accentCircle} />

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={{ flex: 1 }}>
              <Text style={styles.authority}>National Health Authority • ABDM</Text>
              <Text style={styles.cardTitle}>Ayushman Bharat Health Card</Text>
            </View>
          </View>
          <Chip variant="green" dot textStyle={styles.badgeText}>
            {profile.badge || 'ABDM Verified'}
          </Chip>
        </View>

        <View style={styles.heroIdentity}>
          {profile.photoUrl ? (
            <Image source={{ uri: profile.photoUrl }} style={styles.abhaFaceLarge} />
          ) : (
            <View style={[styles.abhaFaceLarge, styles.abhaFaceFallback]}>
              <ShieldCheck size={28} color="#86EFAC" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.heroName} numberOfLines={2}>
              {profile.name || 'Linked patient'}
            </Text>
            <Text style={styles.numberLabel}>ABHA Number</Text>
            <Text style={styles.numberValueCompact}>{profile.maskedNumber}</Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.demographics}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>ABHA Address</Text>
              <Text style={styles.addressValue} numberOfLines={2}>
                {profile.abhaAddress || '—'}
              </Text>
            </View>
            {profile.gender ? (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Gender</Text>
                <Text style={styles.fieldValue}>{profile.gender}</Text>
              </View>
            ) : null}
            {profile.yearOfBirth || profile.dob ? (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Date of birth</Text>
                <Text style={styles.fieldValue}>
                  {profile.dob || String(profile.yearOfBirth)}
                </Text>
              </View>
            ) : null}
            {profile.mobile ? (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Mobile</Text>
                <Text style={styles.fieldValue}>{profile.mobile}</Text>
              </View>
            ) : null}
          </View>

          <Pressable onPress={() => setQrOpen(true)} style={styles.qrBox} accessibilityLabel="Enlarge ABHA QR">
            <Image source={{ uri: qrUri }} style={styles.qrImage} resizeMode="contain" />
            <View style={styles.qrExpandHint}>
              <Maximize2 size={10} color={colors.navy} />
            </View>
          </Pressable>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.verifiedText}>✓ Active Digital Health Identity</Text>
          <View style={styles.statusActions}>
            <Pressable onPress={handleShare} style={styles.unlinkBtn} hitSlop={8}>
              <Share2 size={13} color="#A7F3D0" />
              <Text style={styles.shareText}>Share</Text>
            </Pressable>
            <Pressable onPress={() => setConfirmOpen(true)} style={styles.unlinkBtn} hitSlop={8}>
              <Trash2 size={13} color="#FCA5A5" />
              <Text style={styles.unlinkText}>Unlink</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Full-screen QR */}
      <Modal visible={qrOpen} transparent animationType="fade" onRequestClose={() => setQrOpen(false)}>
        <Pressable style={styles.qrModalBackdrop} onPress={() => setQrOpen(false)}>
          <View style={styles.qrModalCard}>
            <Text style={styles.qrModalTitle}>Scan ABHA QR</Text>
            <Text style={styles.qrModalSub} numberOfLines={1}>
              {profile.abhaAddress || profile.maskedNumber}
            </Text>
            <Image source={{ uri: qrUri }} style={styles.qrModalImage} resizeMode="contain" />
            <Text style={styles.qrModalHint}>Show this at hospital intake for verified identity.</Text>
            <Button variant="outline" size="sm" onPress={() => setQrOpen(false)} style={{ marginTop: 12 }}>
              Close
            </Button>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Unlink ABHA Account?</Text>
            <Text style={styles.modalDesc}>
              Unlinking permanently purges your encrypted ABHA credentials from this device. Future emergency bed
              requests will no longer transmit your verified health profile.
            </Text>
            <View style={styles.modalActions}>
              <Button
                variant="outline"
                size="sm"
                onPress={() => setConfirmOpen(false)}
                disabled={isUnlinking}
                style={styles.modalBtn}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onPress={handleConfirm}
                isLoading={isUnlinking}
                style={styles.modalBtn}
              >
                Confirm Unlink
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.navy,
    borderRadius: radius.card,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.float,
  },
  accentCircle: {
    position: 'absolute',
    right: -40,
    bottom: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  abhaFace: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(167, 243, 208, 0.7)',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  abhaFaceLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: 'rgba(167, 243, 208, 0.85)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  abhaFaceFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: 17,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  numberValueCompact: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  authority: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: typography.sizes.body,
    color: '#FFFFFF',
  },
  badgeText: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bodyBold,
    textTransform: 'uppercase',
  },
  numberBox: {
    marginBottom: 16,
  },
  numberLabel: {
    fontFamily: typography.fontFamilies.bodyMedium,
    fontSize: typography.sizes.badge,
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  numberValue: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: typography.sizes.h2,
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    gap: 12,
  },
  demographics: {
    flex: 1,
  },
  field: {
    marginBottom: 6,
  },
  fieldLabel: {
    fontFamily: typography.fontFamilies.body,
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
  },
  fieldValue: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.bodySmall,
    color: '#FFFFFF',
  },
  addressValue: {
    fontFamily: typography.fontFamilies.bodySemiBold,
    fontSize: typography.sizes.caption,
    color: '#A7F3D0',
  },
  qrBox: {
    width: 72,
    height: 72,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    position: 'relative',
  },
  qrImage: {
    width: 64,
    height: 64,
  },
  qrExpandHint: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
  },
  statusActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  verifiedText: {
    fontFamily: typography.fontFamilies.bodyMedium,
    fontSize: typography.sizes.badge,
    color: '#86EFAC',
    flex: 1,
  },
  unlinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unlinkText: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.badge,
    color: '#FCA5A5',
  },
  shareText: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: typography.sizes.badge,
    color: '#A7F3D0',
  },
  qrModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  qrModalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    ...shadows.float,
  },
  qrModalTitle: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: typography.sizes.h3,
    color: colors.ink,
  },
  qrModalSub: {
    fontFamily: typography.fontFamilies.body,
    fontSize: typography.sizes.caption,
    color: colors.muted,
    marginTop: 4,
    marginBottom: 16,
  },
  qrModalImage: {
    width: 220,
    height: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  qrModalHint: {
    fontFamily: typography.fontFamilies.body,
    fontSize: typography.sizes.caption,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 18,
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
    ...shadows.float,
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
