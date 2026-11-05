import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { hospitalsApi } from '../../src/lib/api/hospitals.api';
import { equipmentApi } from '../../src/lib/api/equipment.api';
import { forecastApi } from '../../src/lib/api/forecast.api';
import { useLiveBeds } from '../../src/hooks/useLiveBeds';
import { useElapsedTime } from '../../src/hooks/useElapsedTime';
import { RequestBedBottomSheet } from '../../src/features/patient/RequestBedBottomSheet';
import { EmergencyFooter } from '../../src/components/ui/EmergencyFooter';
import { colors, radius, typography } from '../../src/theme/tokens';
import {
  ChevronLeft,
  Bookmark,
  Heart,
  MapPin,
  Info,
  Star,
  Calendar,
  Check,
  ChevronRight,
  ShieldCheck,
  Phone,
  BedDouble,
  Activity,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function HospitalDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const hospitalId = id || 'hosp-002';

  const [activeTab, setActiveTab] = useState<'info' | 'location' | 'reviews' | 'slots'>('location');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [requestSheetOpen, setRequestSheetOpen] = useState(false);
  const [selectedWardForRequest, setSelectedWardForRequest] = useState('ICU');

  // Live telemetry hook
  const { data: wards = [], isLive, lastUpdated } = useLiveBeds(hospitalId);
  const updatedAgo = useElapsedTime(lastUpdated);

  // Hospital query
  const { data: hospital } = useQuery({
    queryKey: ['hospital', hospitalId],
    queryFn: () => hospitalsApi.getHospitalById(hospitalId),
  });

  // Equipment query
  const { data: equipment = [] } = useQuery({
    queryKey: ['hospital-equipment', hospitalId],
    queryFn: () => equipmentApi.getHospitalEquipment(hospitalId),
  });

  // Forecast query
  const { data: forecastData } = useQuery({
    queryKey: ['hospital-forecast', hospitalId],
    queryFn: () => forecastApi.getForecast(hospitalId, 'ICU'),
  });

  const doctorName = hospital?.doctorName || 'Dr. Shah';
  const doctorSpecialty = hospital?.doctorSpecialty || 'Cardiologist';
  const doctorFee = hospital?.doctorFee || 1500;
  const heroImage = hospital?.doctorHeroImage || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800&q=80';
  const cardColor = hospital?.cardColor || colors.cardYellow;

  const handleOpenRequest = (wardType = 'ICU') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedWardForRequest(wardType);
    setRequestSheetOpen(true);
  };

  const handleBookmarkToggle = () => {
    Haptics.selectionAsync();
    setIsBookmarked(!isBookmarked);
  };

  const handleOpenMap = () => {
    const lat = hospital?.latitude || 20.2862;
    const lng = hospital?.longitude || 85.7744;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
  };

  const handleCall = () => {
    if (hospital?.phone) {
      Linking.openURL(`tel:${hospital.phone}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* TOP FLOATING NAVIGATION BAR */}
      <View style={styles.topNav}>
        <Pressable
          onPress={() => router.back()}
          style={styles.circleNavBtn}
          accessibilityLabel="Back"
        >
          <ChevronLeft size={22} color="#0F172A" />
        </Pressable>

        <Pressable
          onPress={handleBookmarkToggle}
          style={styles.circleNavBtn}
          accessibilityLabel="Bookmark specialist"
        >
          <Bookmark
            size={20}
            color="#0F172A"
            fill={isBookmarked ? '#0F172A' : 'transparent'}
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* DOCTOR HERO PORTRAIT */}
        <View style={styles.heroWrapper}>
          <Image
            source={{ uri: heroImage }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroOverlayGradient} />
        </View>

        {/* BOTTOM SHEET / CARD MATCHING REFERENCE SCREEN */}
        <View style={[styles.bottomCard, { backgroundColor: cardColor }]}>
          {/* Top Sheet Handle */}
          <View style={styles.handleBar} />

          {/* DOCTOR & PRICE HEADER ROW */}
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => router.push('/doctor/doc-002' as any)}
              style={styles.doctorIdentityRow}
              accessibilityLabel="View full doctor profile"
            >
              <View style={styles.specialtyCircle}>
                <Heart size={20} color="#111111" strokeWidth={2.2} />
              </View>
              <View style={styles.doctorInfoText}>
                <Text style={styles.doctorTitleText}>{doctorName}</Text>
                <Text style={styles.doctorSpecialtyText}>{doctorSpecialty}</Text>
              </View>
            </Pressable>

            <View style={styles.priceContainer}>
              <Text style={styles.priceAmount}>₹ {doctorFee.toFixed(2)}</Text>
              <Text style={styles.priceSubtext}>+GST</Text>
            </View>
          </View>

          {/* QUICK ACTION PILL BAR (GREEN PILL CONTAINER WITH 4 TABS) */}
          <View style={styles.pillTabBar}>
            {/* TAB 1: INFO */}
            <Pressable
              onPress={() => setActiveTab('info')}
              style={[
                styles.tabIconButton,
                activeTab === 'info' && styles.tabIconButtonActive,
              ]}
            >
              <Info
                size={18}
                color={activeTab === 'info' ? '#FFFFFF' : '#111111'}
                strokeWidth={2}
              />
            </Pressable>

            {/* TAB 2: LOCATION (PILL WITH LABEL) */}
            <Pressable
              onPress={() => setActiveTab('location')}
              style={[
                styles.tabPillButton,
                activeTab === 'location' && styles.tabPillButtonActive,
              ]}
            >
              <MapPin
                size={16}
                color={activeTab === 'location' ? '#FFFFFF' : '#111111'}
                strokeWidth={2.2}
              />
              <Text
                style={[
                  styles.tabPillText,
                  activeTab === 'location' && styles.tabPillTextActive,
                ]}
              >
                Location
              </Text>
            </Pressable>

            {/* TAB 3: REVIEWS */}
            <Pressable
              onPress={() => setActiveTab('reviews')}
              style={[
                styles.tabIconButton,
                activeTab === 'reviews' && styles.tabIconButtonActive,
              ]}
            >
              <Star
                size={18}
                color={activeTab === 'reviews' ? '#FFFFFF' : '#111111'}
                strokeWidth={2}
              />
            </Pressable>

            {/* TAB 4: CALENDAR / SLOTS */}
            <Pressable
              onPress={() => setActiveTab('slots')}
              style={[
                styles.tabIconButton,
                activeTab === 'slots' && styles.tabIconButtonActive,
              ]}
            >
              <Calendar
                size={18}
                color={activeTab === 'slots' ? '#FFFFFF' : '#111111'}
                strokeWidth={2}
              />
            </Pressable>
          </View>

          {/* TAB 1: INFO / WARDS & TELEMETRY */}
          {activeTab === 'info' && (
            <View style={styles.tabContentBlock}>
              <Text style={styles.sectionHeader}>Hospital Capacity & Equipment</Text>
              <Text style={styles.facilityAddress}>{hospital?.address}</Text>

              {/* Ward Mini Badges — live free counts */}
              <View style={styles.wardsGrid}>
                {wards.map((w) => {
                  const free =
                    typeof w.free === 'number'
                      ? w.free
                      : Math.max(0, w.total - (w.occupied + w.reserved + w.cleaning + w.maintenance));
                  const freeColor = free > 2 ? colors.green : free > 0 ? colors.orange : colors.red;
                  return (
                    <Pressable
                      key={w.wardType}
                      onPress={() => handleOpenRequest(w.wardType)}
                      style={styles.wardMiniCard}
                    >
                      <Text style={styles.wardMiniType}>{w.wardType}</Text>
                      <Text style={[styles.wardMiniFree, { color: freeColor }]}>
                        {free > 0 ? `${free} free now` : 'Full'}
                      </Text>
                      <Text style={styles.wardMiniTotal}>of {w.total} beds</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.liveHint}>
                {isLive ? '● Live bed counts' : '○ Cached'} · tap a ward to request · {updatedAgo}
              </Text>

              {/* Equipment list */}
              {equipment.length > 0 && (
                <View style={styles.equipmentRow}>
                  {equipment.map((eq: any) => (
                    <View key={eq.id} style={styles.eqPill}>
                      <Activity size={12} color="#111111" />
                      <Text style={styles.eqPillText}>{eq.type}: {eq.status}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* TAB 2: LOCATION MAP (MATCHES SCREENSHOT) */}
          {activeTab === 'location' && (
            <View style={styles.tabContentBlock}>
              <Pressable onPress={handleOpenMap} style={styles.mapContainerPreview}>
                {/* Styled Map Graphic Matching Screenshot */}
                <Image
                  source={{
                    uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=700&q=80',
                  }}
                  style={styles.mapPreviewImage}
                  resizeMode="cover"
                />

                {/* Map Pin Overlay Card */}
                <View style={styles.mapPinOverlay}>
                  <View style={styles.redPinCircle}>
                    <MapPin size={16} color="#FFFFFF" strokeWidth={2.5} />
                  </View>
                  <View style={styles.mapPinInfo}>
                    <Text style={styles.mapHospitalName}>{hospital?.name || 'HCG Hospitals'}</Text>
                    <Text style={styles.mapHospitalSub}>Law Garden, Bhubaneswar</Text>
                  </View>
                </View>

                {/* Tap to Navigate Pill */}
                <View style={styles.tapToNavigatePill}>
                  <Text style={styles.tapToNavigateText}>Tap to open GPS</Text>
                </View>
              </Pressable>
            </View>
          )}

          {/* TAB 3: REVIEWS */}
          {activeTab === 'reviews' && (
            <View style={styles.tabContentBlock}>
              <View style={styles.reviewSummaryRow}>
                <Text style={styles.ratingBigNumber}>4.8</Text>
                <View>
                  <View style={{ flexDirection: 'row', gap: 3 }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} size={16} color="#111111" fill="#111111" />
                    ))}
                  </View>
                  <Text style={styles.verifiedReviewsCount}>142 verified ABHA patient reviews</Text>
                </View>
              </View>
              <Text style={styles.reviewQuote}>
                &ldquo;Immediate ICU bed availability confirmed in 2 minutes. Ventilator was pre-set upon patient arrival.&rdquo;
              </Text>
            </View>
          )}

          {/* TAB 4: SLOTS & EMERGENCY HOLD */}
          {activeTab === 'slots' && (
            <View style={styles.tabContentBlock}>
              <Text style={styles.sectionHeader}>Live Discharge Forecast</Text>
              <Text style={styles.forecastDesc}>
                High confidence probability of next ICU bed opening in under 45 mins.
              </Text>
              <View style={styles.slotPillsRow}>
                <View style={styles.slotActivePill}>
                  <Text style={styles.slotActiveText}>Immediate Hold (15 min window)</Text>
                </View>
              </View>
            </View>
          )}

          {/* BOTTOM CONFIRMATION SLIDER TRACK (MATCHES REFERENCE BUTTON [✓] > > [✓]) */}
          <Pressable
            onPress={() => handleOpenRequest('ICU')}
            style={({ pressed }) => [
              styles.sliderTrackContainer,
              pressed && { opacity: 0.9, transform: [{ scale: 0.985 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Slide to hold bed"
          >
            {/* Left White Thumb [ ✓ ] */}
            <View style={styles.sliderWhiteThumb}>
              <Check size={22} color="#111111" strokeWidth={3} />
            </View>

            {/* Middle Arrows */}
            <View style={styles.sliderArrowsRow}>
              <Text style={styles.sliderArrowText}>›  ›</Text>
            </View>

            {/* Right Action Target [ ✓ ] */}
            <View style={styles.sliderTargetThumb}>
              <Check size={20} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </Pressable>
        </View>
      </ScrollView>

      {/* 15-MINUTE BED REQUEST MODAL */}
      <RequestBedBottomSheet
        visible={requestSheetOpen}
        hospitalId={hospitalId}
        hospitalName={hospital?.name || 'Hospital'}
        initialWardType={selectedWardForRequest}
        onClose={() => setRequestSheetOpen(false)}
        onSuccess={() => {
          setRequestSheetOpen(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          import('../../src/lib/ui/flash-store').then(({ useFlashStore }) => {
            useFlashStore.getState().push({
              title: 'Bed hold confirmed',
              body: 'Formal confirmation email is on its way. Open My Requests anytime.',
              tone: 'success',
            });
          });
          router.replace('/(tabs)');
        }}
      />

      <EmergencyFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topNav: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  circleNavBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  heroWrapper: {
    width: '100%',
    height: 330,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  heroImage: {
    width: '90%',
    height: '100%',
    bottom: -10,
  },
  heroOverlayGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  bottomCard: {
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 36,
    minHeight: 460,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  handleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  doctorIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  specialtyCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  doctorInfoText: {
    flex: 1,
  },
  doctorTitleText: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: 22,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -0.4,
  },
  doctorSpecialtyText: {
    fontFamily: typography.fontFamilies.bodyMedium,
    fontSize: 14,
    color: '#2A2A2A',
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: 20,
    fontWeight: '800',
    color: '#111111',
  },
  priceSubtext: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: 11,
    color: '#3A3A3A',
    fontWeight: '600',
  },
  pillTabBar: {
    backgroundColor: '#B4F481',
    borderRadius: 999,
    padding: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  tabIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconButtonActive: {
    backgroundColor: '#111111',
  },
  tabPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  tabPillButtonActive: {
    backgroundColor: '#111111',
  },
  tabPillText: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: 13,
    fontWeight: '700',
    color: '#111111',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
  },
  tabContentBlock: {
    marginBottom: 20,
  },
  mapContainerPreview: {
    width: '100%',
    height: 180,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  mapPreviewImage: {
    width: '100%',
    height: '100%',
  },
  mapPinOverlay: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingRight: 14,
    paddingLeft: 6,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  redPinCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#DC2646',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPinInfo: {},
  mapHospitalName: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: 11,
    fontWeight: '700',
    color: '#111111',
  },
  mapHospitalSub: {
    fontFamily: typography.fontFamilies.body,
    fontSize: 9,
    color: '#666666',
  },
  tapToNavigatePill: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(17, 17, 17, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tapToNavigateText: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sectionHeader: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 6,
  },
  facilityAddress: {
    fontFamily: typography.fontFamilies.body,
    fontSize: 12,
    color: '#333333',
    marginBottom: 12,
  },
  wardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  wardMiniCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 72,
  },
  wardMiniType: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: 12,
    fontWeight: '700',
    color: '#111111',
  },
  wardMiniFree: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: 13,
    fontWeight: '800',
    color: '#14B84F',
    marginVertical: 2,
  },
  wardMiniTotal: {
    fontFamily: typography.fontFamilies.body,
    fontSize: 10,
    color: '#777777',
  },
  liveHint: {
    fontFamily: typography.fontFamilies.body,
    fontSize: 11,
    color: '#666666',
    marginBottom: 12,
  },
  equipmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  eqPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  eqPillText: {
    fontFamily: typography.fontFamilies.bodyMedium,
    fontSize: 11,
    color: '#111111',
  },
  reviewSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  ratingBigNumber: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: 36,
    fontWeight: '900',
    color: '#111111',
  },
  verifiedReviewsCount: {
    fontFamily: typography.fontFamilies.body,
    fontSize: 11,
    color: '#444444',
    marginTop: 2,
  },
  reviewQuote: {
    fontFamily: typography.fontFamilies.bodyMedium,
    fontSize: 12,
    color: '#222222',
    fontStyle: 'italic',
    lineHeight: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: 12,
    borderRadius: 16,
  },
  forecastDesc: {
    fontFamily: typography.fontFamilies.body,
    fontSize: 12,
    color: '#333333',
    marginBottom: 10,
  },
  slotPillsRow: {
    flexDirection: 'row',
  },
  slotActivePill: {
    backgroundColor: '#111111',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  slotActiveText: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sliderTrackContainer: {
    height: 64,
    backgroundColor: '#111111',
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  sliderWhiteThumb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  sliderArrowsRow: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderArrowText: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: 22,
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 4,
  },
  sliderTargetThumb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#242830',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
