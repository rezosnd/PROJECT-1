import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, Linking } from 'react-native';
import { MatchedHospitalItem } from '../../lib/api/matching.api';
import { Star, MapPin, Phone, Heart, Activity, Brain, Shield, ChevronRight } from 'lucide-react-native';
import { colors, radius, typography } from '../../theme/tokens';
import { useTranslation } from 'react-i18next';

export interface HospitalResultCardProps {
  item: MatchedHospitalItem;
  onRequestBed: (hospitalId: string, wardType: string) => void;
  onPressDetails: (hospitalId: string) => void;
  index?: number;
}

export const HospitalResultCard: React.FC<HospitalResultCardProps> = ({
  item,
  onRequestBed,
  onPressDetails,
  index = 0,
}) => {
  const { t } = useTranslation();
  const { hospital, matchedWard } = item;

  const cardBg = hospital.cardColor || (index % 2 === 0 ? colors.cardLime : colors.cardYellow);

  const hospitalName = hospital.name || 'Hospital';
  const hospitalType = hospital.type || hospital.specialties?.[0] || 'Emergency care';
  const rating = hospital.ratingAvg || hospital.doctorRating || 4.5;
  const avatarUri =
    hospital.photoUrl ||
    hospital.doctorAvatar ||
    'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=300&q=80';

  // Specialty icon renderer
  const renderSpecialtyIcon = () => {
    switch (hospital.specialtyType) {
      case 'heart':
        return <Heart size={20} color="#111111" strokeWidth={2} />;
      case 'brain':
        return <Brain size={20} color="#111111" strokeWidth={2} />;
      case 'tooth':
        return <Shield size={20} color="#111111" strokeWidth={2} />;
      default:
        return <Activity size={20} color="#111111" strokeWidth={2} />;
    }
  };

  const handleCall = () => {
    if (hospital.phone) {
      Linking.openURL(`tel:${hospital.phone}`);
    }
  };

  const handleMap = () => {
    const lat = hospital.latitude || 20.2961;
    const lng = hospital.longitude || 85.8245;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
  };

  const insuranceBadge = (() => {
    const cov = item.insuranceCoverage;
    if (!cov) return null;
    if (cov === 'COVERED') {
      const discount = Number((item as any).insuranceDiscountPercent) || 0;
      const cashless = Boolean((item as any).insuranceCashless);
      const extra =
        discount > 0
          ? ` · ${discount}% benefit`
          : cashless
            ? ' · cashless'
            : '';
      return { label: `Covered${extra}`, bg: '#DCFCE7', color: '#166534' };
    }
    if (cov === 'NONE_DECLARED') return { label: 'Self-pay', bg: '#F1F5F9', color: '#475569' };
    return { label: 'Check cashless', bg: '#FEF3C7', color: '#92400E' };
  })();

  return (
    <Pressable
      onPress={() => onPressDetails(hospital.id)}
      style={({ pressed }) => [
        styles.cardContainer,
        { backgroundColor: cardBg },
        pressed && { transform: [{ scale: 0.985 }], opacity: 0.95 },
      ]}
      accessible={true}
      accessibilityRole="button"
    >
      {/* LEFT COLUMN: Avatar + Star Rating */}
      <View style={styles.leftColumn}>
        <View style={styles.avatarWrapper}>
          <Image
            source={{ uri: avatarUri }}
            style={styles.avatarImage}
            resizeMode="cover"
          />
        </View>

        <View style={styles.ratingBox}>
          <Star size={16} color="#111111" fill="#111111" />
          <Text style={styles.ratingText}>{rating.toFixed(1)}/5.0</Text>
        </View>
      </View>

      <View style={styles.centerColumn}>
        <Text style={styles.doctorName} numberOfLines={2}>
          {hospitalName}
        </Text>
        <Text style={styles.doctorSpecialty} numberOfLines={1}>
          {hospitalType}
        </Text>
        {insuranceBadge ? (
          <View style={[styles.insuranceBadge, { backgroundColor: insuranceBadge.bg }]}>
            <Text style={[styles.insuranceBadgeText, { color: insuranceBadge.color }]}>
              {insuranceBadge.label}
            </Text>
          </View>
        ) : null}
        {hospital.city ? (
          <Text style={styles.facilitySubtitle} numberOfLines={1}>
            {hospital.city}
          </Text>
        ) : null}

        <Text style={styles.feeBeds}>
          {matchedWard.freeBeds > 0
            ? `${matchedWard.freeBeds} ${matchedWard.wardType} bed${matchedWard.freeBeds === 1 ? '' : 's'} free now`
            : `No ${matchedWard.wardType} beds free right now`}
        </Text>
        <Text style={styles.chanceText}>
          {Math.round((matchedWard.forecastProb3h || 0) * 100)}% chance free in ~3 hrs
          {(matchedWard.forecastProb3h || 0) >= 0.7
            ? ' · Likely'
            : (matchedWard.forecastProb3h || 0) >= 0.4
            ? ' · Possible'
            : ' · Unlikely'}
        </Text>

        <Pressable
          onPress={() => onRequestBed(hospital.id, matchedWard.wardType)}
          style={({ pressed }) => [
            styles.ctaButton,
            pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
          ]}
        >
          <Text style={styles.ctaButtonText}>
            {matchedWard.freeBeds > 0
              ? t('results.requestBed', 'Hold Bed · 15 min')
              : t('results.requestWhenReady', 'Request Hold')}
          </Text>
        </Pressable>
      </View>

      {/* RIGHT COLUMN: White Floating Action Buttons */}
      <View style={styles.rightColumn}>
        <Pressable
          style={styles.circleActionButton}
          onPress={() => onPressDetails(hospital.id)}
          accessibilityLabel="Specialty details"
        >
          {renderSpecialtyIcon()}
        </Pressable>

        <Pressable
          style={styles.circleActionButton}
          onPress={handleMap}
          accessibilityLabel="Open in Google Maps"
        >
          <MapPin size={20} color="#111111" strokeWidth={2} />
        </Pressable>

        <Pressable
          style={styles.circleActionButton}
          onPress={handleCall}
          accessibilityLabel="Call hospital emergency"
        >
          <Phone size={19} color="#111111" strokeWidth={2} />
        </Pressable>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 32,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 3,
  },
  leftColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  ratingText: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: 12,
    fontWeight: '700',
    color: '#111111',
  },
  centerColumn: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  doctorName: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: 18,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -0.4,
  },
  doctorSpecialty: {
    fontFamily: typography.fontFamilies.bodySemiBold,
    fontSize: 13,
    fontWeight: '600',
    color: '#2A2A2A',
    marginTop: 2,
  },
  insuranceBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  insuranceBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  facilitySubtitle: {
    fontFamily: typography.fontFamilies.body,
    fontSize: 11,
    color: '#4A4A4A',
    marginTop: 1,
  },
  feeBeds: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111111',
    marginTop: 8,
  },
  chanceText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3A3A3A',
    marginTop: 2,
  },
  ctaButton: {
    backgroundColor: '#111111',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  ctaButtonText: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rightColumn: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginLeft: 8,
  },
  circleActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
});
