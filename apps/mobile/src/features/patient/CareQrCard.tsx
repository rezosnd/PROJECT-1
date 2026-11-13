import React from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { QrCode } from 'lucide-react-native';
import { CareQr } from '../../lib/api/referrals.api';
import { typography } from '../../theme/tokens';

export interface CareQrCardProps {
  careQr: CareQr | null | undefined;
  isLoading?: boolean;
}

export const CareQrCard: React.FC<CareQrCardProps> = ({ careQr, isLoading }) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <QrCode size={18} color="#0B3D1A" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Care QR</Text>
          <Text style={styles.subtitle}>Show this to your doctor to refer you</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#0B3D1A" style={{ marginVertical: 24 }} />
      ) : careQr?.imageUrl ? (
        <View style={styles.qrWrap}>
          <Image
            source={{ uri: careQr.imageUrl }}
            style={styles.qrImage}
            resizeMode="contain"
            accessibilityLabel="Care QR for doctor referral"
          />
        </View>
      ) : (
        <Text style={styles.placeholder}>
          Complete your profile to generate your Care QR for doctor referrals.
        </Text>
      )}

      <Text style={styles.footnote}>
        Show this green Care QR to your doctor (Doctor app). Do not show the ABHA card QR for
        referrals. Open this screen once so your code refreshes.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#B9F84B',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.08)',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: 17,
    fontWeight: '800',
    color: '#111111',
  },
  subtitle: { fontSize: 12, fontWeight: '600', color: '#3F3F46', marginTop: 2 },
  qrWrap: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
  },
  qrImage: { width: 200, height: 200 },
  placeholder: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3F3F46',
    textAlign: 'center',
    paddingVertical: 20,
    paddingHorizontal: 8,
  },
  footnote: {
    fontSize: 11,
    lineHeight: 16,
    color: '#0B3D1A',
    fontWeight: '600',
    textAlign: 'center',
  },
});
