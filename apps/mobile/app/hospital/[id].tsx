import React, { useMemo, useState } from 'react';
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
import { equipmentApi, EquipmentItem, EquipmentStatus } from '../../src/lib/api/equipment.api';
import { forecastApi } from '../../src/lib/api/forecast.api';
import { useLiveBeds } from '../../src/hooks/useLiveBeds';
import { useElapsedTime } from '../../src/hooks/useElapsedTime';
import { RequestBedBottomSheet } from '../../src/features/patient/RequestBedBottomSheet';
import { EmergencyFooter } from '../../src/components/ui/EmergencyFooter';
import { colors, typography } from '../../src/theme/tokens';
import {
  ChevronLeft,
  Bookmark,
  Heart,
  MapPin,
  Info,
  Star,
  Calendar,
  Activity,
  Check,
  Phone,
  Navigation,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function HospitalDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const hospitalId = id || '';

  const [activeTab, setActiveTab] = useState<'info' | 'location' | 'equipment' | 'slots'>('info');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [requestSheetOpen, setRequestSheetOpen] = useState(false);
  const [selectedWardForRequest, setSelectedWardForRequest] = useState('ICU');

  const { data: wards = [], isLive, lastUpdated } = useLiveBeds(hospitalId);
  const updatedAgo = useElapsedTime(lastUpdated);

  const { data: hospital } = useQuery({
    queryKey: ['hospital', hospitalId],
    queryFn: () => hospitalsApi.getHospitalById(hospitalId),
  });

  useQuery({
    queryKey: ['hospital-forecast', hospitalId],
    queryFn: () => forecastApi.getForecast(hospitalId, 'ICU'),
  });

  const { data: equipment = [], isLoading: isEqLoading } = useQuery({
    queryKey: ['hospital-equipment', hospitalId],
    queryFn: () => equipmentApi.getHospitalEquipment(hospitalId),
  });

  const equipmentSummary = useMemo(() => {
    const counts: Record<EquipmentStatus, number> = {
      AVAILABLE: 0,
      IN_USE: 0,
      MAINTENANCE: 0,
      OFFLINE: 0,
    };
    for (const eq of equipment) {
      if (counts[eq.status] != null) counts[eq.status] += 1;
    }
    return counts;
  }, [equipment]);

  const equipmentByType = useMemo(() => {
    const map = new Map<string, EquipmentItem[]>();
    for (const eq of equipment) {
      const key = eq.type || 'OTHER';
      const list = map.get(key) || [];
      list.push(eq);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [equipment]);

  const statusColor = (status: EquipmentStatus) => {
    if (status === 'AVAILABLE') return colors.green;
    if (status === 'IN_USE') return colors.blue;
    if (status === 'MAINTENANCE') return colors.orange;
    return colors.red;
  };

  const hospitalName = hospital?.name || 'Hospital';
  const hospitalType = hospital?.type || hospital?.specialties?.[0] || 'Emergency care';
  const freeBeds = wards.reduce((sum, w) => {
    const free =
      typeof w.free === 'number'
        ? w.free
        : Math.max(0, w.total - (w.occupied + w.reserved + w.cleaning + w.maintenance));
    return sum + free;
  }, 0);
  const heroImage =
    hospital?.photoUrl ||
    hospital?.doctorHeroImage ||
    'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=900&q=80';
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
      <View style={[styles.topNav, { top: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.circleNavBtn}
          accessibilityLabel="Back"
        >
          <ChevronLeft size={22} color="#0F172A" />
        </Pressable>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable onPress={handleCall} style={styles.circleNavBtn} accessibilityLabel="Call hospital">
            <Phone size={18} color="#0F172A" />
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
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.heroWrapper}>
          <Image source={{ uri: heroImage }} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroOverlayGradient} />
        </View>

        <View style={[styles.bottomCard, { backgroundColor: cardColor }]}>
          <View style={styles.handleBar} />

          <View style={styles.headerRow}>
            <View style={styles.doctorIdentityRow}>
              <View style={styles.specialtyCircle}>
                <Heart size={20} color="#111111" strokeWidth={2.2} />
              </View>
              <View style={styles.doctorInfoText}>
                <Text style={styles.doctorTitleText} numberOfLines={2}>
                  {hospitalName}
                </Text>
                <Text style={styles.doctorSpecialtyText} numberOfLines={1}>
                  {hospitalType}
                </Text>
              </View>
            </View>

            <View style={styles.priceContainer}>
              <Text style={styles.priceAmount}>{freeBeds}</Text>
              <Text style={styles.priceSubtext}>beds free</Text>
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

            {/* TAB 3: EQUIPMENT */}
            <Pressable
              onPress={() => setActiveTab('equipment')}
              style={[
                styles.tabIconButton,
                activeTab === 'equipment' && styles.tabIconButtonActive,
              ]}
            >
              <Activity
                size={18}
                color={activeTab === 'equipment' ? '#FFFFFF' : '#111111'}
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

          {activeTab === 'info' && (
            <View style={styles.tabContentBlock}>
              <Text style={styles.sectionHeader}>{hospital?.name || 'Live bed capacity'}</Text>
              <Text style={styles.facilityAddress}>{hospital?.address}</Text>

              {Array.isArray((hospital as any)?.insuranceNetwork) &&
              (hospital as any).insuranceNetwork.length > 0 ? (
                <View style={{ marginBottom: 16, gap: 8 }}>
                  <Text style={[styles.sectionHeader, { fontSize: 14 }]}>Accepted insurance</Text>
                  {(hospital as any).insuranceNetwork.slice(0, 8).map((n: any) => (
                    <View
                      key={n.insurerId}
                      style={{
                        backgroundColor: '#F4F7F2',
                        borderRadius: 14,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: '#D8E0D4',
                      }}
                    >
                      <Text style={{ fontWeight: '800', color: '#0F172A', fontSize: 13 }}>
                        {n.name}
                      </Text>
                      <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '600', marginTop: 2 }}>
                        {n.cashless ? 'Cashless' : 'Reimbursement'}
                        {n.discountPercent > 0 ? ` · up to ${n.discountPercent}% benefit` : ''}
                      </Text>
                      {Array.isArray(n.benefits) && n.benefits.length > 0 ? (
                        <Text style={{ color: '#475569', fontSize: 11, marginTop: 4 }}>
                          {n.benefits.slice(0, 4).join(' · ')}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : null}

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
                        {free > 0 ? `${free} free` : 'Full'}
                      </Text>
                      <Text style={styles.wardMiniTotal}>of {w.total} beds</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.liveHint}>
                {isLive ? '● Live beds' : '○ Cached'} · tap a ward to hold · {updatedAgo}
              </Text>

              <Pressable onPress={handleOpenMap} style={styles.navigateRow}>
                <Navigation size={15} color="#111111" />
                <Text style={styles.navigateText}>Go to hospital on Maps</Text>
              </Pressable>
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

          {/* TAB 3: EQUIPMENT */}
          {activeTab === 'equipment' && (
            <View style={styles.tabContentBlock}>
              <Text style={styles.sectionHeader}>Medical equipment</Text>
              <View style={styles.eqSummaryRow}>
                <Text style={styles.eqSummaryPill}>
                  {equipmentSummary.AVAILABLE} available
                </Text>
                <Text style={styles.eqSummaryPill}>
                  {equipmentSummary.IN_USE} in use
                </Text>
                <Text style={styles.eqSummaryPill}>
                  {equipmentSummary.MAINTENANCE} maint.
                </Text>
                <Text style={styles.eqSummaryPillBold}>{equipment.length} total</Text>
              </View>

              {isEqLoading ? (
                <Text style={styles.liveHint}>Loading equipment…</Text>
              ) : equipment.length === 0 ? (
                <Text style={styles.forecastDesc}>No equipment listed for this hospital yet.</Text>
              ) : (
                equipmentByType.map(([type, items]) => (
                  <View key={type} style={styles.eqTypeBlock}>
                    <Text style={styles.eqTypeTitle}>
                      {type.replace(/_/g, ' ')} ({items.length})
                    </Text>
                    {items.map((eq) => (
                      <View key={eq.id} style={styles.eqRow}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.eqName} numberOfLines={1}>
                            {eq.name}
                          </Text>
                          <Text style={styles.eqSub}>
                            {eq.type}
                            {eq.criticality ? ` · ${eq.criticality}` : ''}
                          </Text>
                        </View>
                        <Text style={[styles.eqStatus, { color: statusColor(eq.status) }]}>
                          {eq.status.replace('_', ' ')}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))
              )}
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
              body: 'Track it in My Requests. When the hospital confirms, tap Go to hospital.',
              tone: 'success',
            });
          });
          router.replace('/(tabs)/requests');
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
  navigateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  navigateText: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: 13,
    fontWeight: '800',
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
  eqSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  eqSummaryPill: {
    fontFamily: typography.fontFamilies.bodyMedium,
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  eqSummaryPillBold: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: 10,
    fontWeight: '800',
    color: '#0B3D1A',
    backgroundColor: '#B9F84B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  eqTypeBlock: {
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 16,
    padding: 10,
  },
  eqTypeTitle: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: 13,
    fontWeight: '700',
    color: '#0B3D1A',
    marginBottom: 8,
  },
  eqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  eqName: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: 13,
    fontWeight: '700',
    color: '#111',
  },
  eqSub: {
    fontFamily: typography.fontFamilies.body,
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  eqStatus: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});
