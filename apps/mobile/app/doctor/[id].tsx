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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Bookmark,
  MapPin,
  Info,
  Star,
  Calendar,
  ChevronRight,
  ShieldCheck,
  Phone,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { getDoctorById } from '../../src/lib/doctors-data';
import { SpecialtyIcon } from '../../src/components/graphics/SpecialtyIcons';

const { width } = Dimensions.get('window');

export default function DoctorDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const doctor = getDoctorById(id || 'doc-002');
  const [activeTab, setActiveTab] = useState<'info' | 'location' | 'reviews' | 'referral'>('location');
  const [isBookmarked, setIsBookmarked] = useState(false);

  const handleBookmarkToggle = () => {
    Haptics.selectionAsync();
    setIsBookmarked(!isBookmarked);
  };

  const handleOpenMap = () => {
    Haptics.selectionAsync();
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${doctor.latitude},${doctor.longitude}`
    );
  };

  const handleCall = () => {
    Haptics.selectionAsync();
    Linking.openURL(`tel:${doctor.phone}`);
  };

  const handleOpenCareQr = () => {
    Haptics.selectionAsync();
    router.push('/(tabs)/profile');
  };

  return (
    <View style={styles.container}>
      {/* TOP FLOATING NAVIGATION BAR */}
      <View style={[styles.topNavBar, { top: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.circleNavBtn,
            pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
          ]}
          accessibilityLabel="Back"
        >
          <ChevronLeft size={22} color="#FFFFFF" strokeWidth={2.4} />
        </Pressable>

        <Pressable
          onPress={handleBookmarkToggle}
          style={({ pressed }) => [
            styles.circleNavBtn,
            pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
          ]}
          accessibilityLabel="Bookmark doctor"
        >
          <Bookmark
            size={20}
            color="#FFFFFF"
            fill={isBookmarked ? '#FFFFFF' : 'transparent'}
            strokeWidth={2.2}
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* DOCTOR HERO PORTRAIT SECTION (MATCHES SCREENSHOT) */}
        <View style={styles.heroSection}>
          <Image
            source={{ uri: doctor.heroImageUrl }}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        {/* BOTTOM SHEET CARD (MATCHES YELLOW CARD WITH CURVED TOP) */}
        <View style={[styles.bottomCard, { backgroundColor: doctor.cardColor }]}>
          {/* Top Center Drag Handle */}
          <View style={styles.handleBar} />

          {/* DOCTOR & PRICE HEADER ROW */}
          <View style={styles.headerRow}>
            {/* Left: Specialty Icon in White Circle + Name + Specialty */}
            <View style={styles.doctorIdentityRow}>
              <View style={styles.specialtyWhiteCircle}>
                <SpecialtyIcon type={doctor.specialtyType} size={22} color="#111111" />
              </View>
              <View style={styles.doctorInfoTextCol}>
                <Text style={styles.doctorTitleText}>{doctor.name}</Text>
                <Text style={styles.doctorSpecialtyText}>{doctor.specialty}</Text>
              </View>
            </View>

            {/* Right: Fee + GST */}
            <View style={styles.priceContainer}>
              <Text style={styles.priceAmount}>₹ {doctor.fee.toFixed(2)}</Text>
              <Text style={styles.priceSubtext}>+GST</Text>
            </View>
          </View>

          {/* GREEN PILL TAB CONTAINER WITH 4 TABS (MATCHES REFERENCE) */}
          <View style={styles.pillTabBar}>
            {/* 1. INFO TAB */}
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab('info');
              }}
              style={[
                styles.tabIconButton,
                activeTab === 'info' && styles.tabIconButtonActive,
              ]}
              accessibilityLabel="Doctor Information"
            >
              <Info
                size={19}
                color={activeTab === 'info' ? '#FFFFFF' : '#111111'}
                strokeWidth={2.2}
              />
            </Pressable>

            {/* 2. LOCATION TAB (ACTIVE SOLID BLACK PILL WITH PIN + TEXT) */}
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab('location');
              }}
              style={[
                styles.tabPillButton,
                activeTab === 'location' && styles.tabPillButtonActive,
              ]}
              accessibilityLabel="Clinic Location"
            >
              <MapPin
                size={16}
                color={activeTab === 'location' ? '#FFFFFF' : '#111111'}
                strokeWidth={2.4}
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

            {/* 3. REVIEWS TAB */}
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab('reviews');
              }}
              style={[
                styles.tabIconButton,
                activeTab === 'reviews' && styles.tabIconButtonActive,
              ]}
              accessibilityLabel="Patient Reviews"
            >
              <Star
                size={19}
                color={activeTab === 'reviews' ? '#FFFFFF' : '#111111'}
                strokeWidth={2.2}
              />
            </Pressable>

            {/* 4. REFERRAL TAB */}
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab('referral');
              }}
              style={[
                styles.tabIconButton,
                activeTab === 'referral' && styles.tabIconButtonActive,
              ]}
              accessibilityLabel="Doctor referral via Care QR"
            >
              <Calendar
                size={19}
                color={activeTab === 'referral' ? '#FFFFFF' : '#111111'}
                strokeWidth={2.2}
              />
            </Pressable>
          </View>

          {/* TAB 1: LOCATION MAP (DEFAULT - 100% MATCHING SCREENSHOT) */}
          {activeTab === 'location' && (
            <View style={styles.tabContentContainer}>
              <Pressable onPress={handleOpenMap} style={styles.mapCard}>
                {/* Visual Map Render with Road Labels */}
                <Image
                  source={{
                    uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80',
                  }}
                  style={styles.mapImage}
                  resizeMode="cover"
                />

                {/* Overlaid Street Markers Matching Screenshot Aesthetic */}
                <View style={styles.mapLabelsOverlay}>
                  {/* Law Garden Pin */}
                  <View style={styles.streetTagLawGarden}>
                    <Text style={styles.streetTagText}>Law Garden</Text>
                  </View>

                  {/* Gandhigram Tag */}
                  <View style={styles.streetTagGandhigram}>
                    <Text style={styles.streetTagText}>Gandhigram</Text>
                  </View>

                  {/* Sabarmati Riverfront Tag */}
                  <View style={styles.streetTagRiver}>
                    <Text style={styles.streetTagText}>Sabarmati Riverfront</Text>
                  </View>

                  {/* HCG Hospitals Main Landmark Badge */}
                  <View style={styles.hospitalPinBadge}>
                    <View style={styles.redPinDot}>
                      <MapPin size={14} color="#FFFFFF" strokeWidth={2.6} />
                    </View>
                    <Text style={styles.hospitalPinText}>{doctor.hospitalName.split('&')[0].trim()}</Text>
                  </View>
                </View>

                {/* Bottom Address Info Bar */}
                <View style={styles.mapBottomBar}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mapAddressTitle}>{doctor.hospitalName}</Text>
                    <Text style={styles.mapAddressSub} numberOfLines={1}>{doctor.hospitalAddress}</Text>
                  </View>
                  <Pressable onPress={handleCall} style={styles.miniCallBtn}>
                    <Phone size={15} color="#FFFFFF" strokeWidth={2.4} />
                  </Pressable>
                </View>
              </Pressable>
            </View>
          )}

          {/* TAB 2: INFO TAB */}
          {activeTab === 'info' && (
            <View style={styles.tabContentContainer}>
              <View style={styles.infoContentCard}>
                <View style={styles.verifiedBadgeRow}>
                  <ShieldCheck size={16} color="#059669" />
                  <Text style={styles.verifiedBadgeText}>ABDM & National Medical Commission Verified</Text>
                </View>

                <Text style={styles.degreesText}>{doctor.degrees}</Text>
                <Text style={styles.experienceText}>{doctor.experience}</Text>
                <Text style={styles.aboutText}>{doctor.about}</Text>

                <View style={styles.hospitalQuickBox}>
                  <Text style={styles.hospitalBoxName}>{doctor.hospitalName}</Text>
                  <Text style={styles.hospitalBoxAddress}>{doctor.hospitalAddress}</Text>
                </View>
              </View>
            </View>
          )}

          {/* TAB 3: REVIEWS TAB */}
          {activeTab === 'reviews' && (
            <View style={styles.tabContentContainer}>
              <View style={styles.infoContentCard}>
                <View style={styles.reviewsSummaryRow}>
                  <Text style={styles.bigRatingNum}>{doctor.rating.toFixed(1)}</Text>
                  <View>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={16} color="#111111" fill="#111111" />
                      ))}
                    </View>
                    <Text style={styles.reviewCountText}>{doctor.reviewsCount} verified patient consultations</Text>
                  </View>
                </View>

                <View style={styles.reviewItem}>
                  <Text style={styles.reviewerName}>Ananya Patel • 2 days ago</Text>
                  <Text style={styles.reviewBody}>
                    &ldquo;Dr. Shah is extremely thorough. Explains the diagnosis calmly and the hospital staff ensured zero wait time.&rdquo;
                  </Text>
                </View>
              </View>
            </View>
          )}

          {activeTab === 'referral' && (
            <View style={styles.tabContentContainer}>
              <View style={styles.infoContentCard}>
                <View style={styles.verifiedBadgeRow}>
                  <ShieldCheck size={14} color="#059669" />
                  <Text style={styles.verifiedBadgeText}>Referrals via Care QR</Text>
                </View>
                <Text style={styles.aboutText}>
                  Doctors refer you using the Care QR in your Profile. Open Profile, show your QR, and ask your doctor
                  to scan with the GetMyHospital Doctor app — no in-app appointment booking here.
                </Text>
                <Text style={[styles.aboutText, { marginTop: 8 }]}>
                  For emergency beds, use Search to place a 15-minute verified hold at a hospital.
                </Text>
              </View>
            </View>
          )}

          <Pressable
            onPress={handleOpenCareQr}
            style={({ pressed }) => [
              styles.sliderBarContainer,
              pressed && { opacity: 0.9, transform: [{ scale: 0.985 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open Care QR in Profile"
          >
            <View style={styles.sliderWhiteCircle}>
              <ShieldCheck size={22} color="#111111" strokeWidth={2.5} />
            </View>
            <View style={styles.sliderArrowsWrapper}>
              <Text style={styles.goHospitalLabel}>Care QR in Profile</Text>
            </View>
            <View style={styles.sliderDarkCircle}>
              <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0F12', // Sleek dark studio background
  },
  topNavBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circleNavBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E2028',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 40,
  },
  heroSection: {
    width: width,
    height: 310,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  heroImage: {
    width: width * 0.88,
    height: 310,
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
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  handleBar: {
    width: 46,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
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
  specialtyWhiteCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  doctorInfoTextCol: {
    flex: 1,
  },
  doctorTitleText: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  doctorSpecialtyText: {
    color: '#262626',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  priceSubtext: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  pillTabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#B9F84B', // Mint / lime pill container
    borderRadius: 30,
    padding: 5,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    borderRadius: 24,
  },
  tabPillButtonActive: {
    backgroundColor: '#111111',
  },
  tabPillText: {
    color: '#111111',
    fontSize: 13.5,
    fontWeight: '700',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
  },
  tabContentContainer: {
    marginBottom: 20,
  },
  mapCard: {
    height: 200,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapLabelsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  streetTagLawGarden: {
    position: 'absolute',
    top: 24,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  streetTagGandhigram: {
    position: 'absolute',
    bottom: 60,
    left: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  streetTagRiver: {
    position: 'absolute',
    bottom: 50,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  streetTagText: {
    color: '#374151',
    fontSize: 10.5,
    fontWeight: '700',
  },
  hospitalPinBadge: {
    position: 'absolute',
    top: 45,
    left: 80,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  redPinDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hospitalPinText: {
    color: '#111111',
    fontSize: 11.5,
    fontWeight: '800',
  },
  mapBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mapAddressTitle: {
    color: '#111111',
    fontSize: 12.5,
    fontWeight: '800',
  },
  mapAddressSub: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '500',
  },
  miniCallBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 24,
    padding: 16,
  },
  verifiedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  verifiedBadgeText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  degreesText: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  experienceText: {
    color: '#4B5563',
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 8,
  },
  aboutText: {
    color: '#374151',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  hospitalQuickBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 10,
  },
  hospitalBoxName: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '700',
  },
  hospitalBoxAddress: {
    color: '#6B7280',
    fontSize: 11.5,
    marginTop: 2,
  },
  reviewsSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  bigRatingNum: {
    color: '#111111',
    fontSize: 32,
    fontWeight: '800',
  },
  reviewCountText: {
    color: '#4B5563',
    fontSize: 12,
    marginTop: 3,
  },
  reviewItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
  },
  reviewerName: {
    color: '#111111',
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 4,
  },
  reviewBody: {
    color: '#374151',
    fontSize: 12.5,
    lineHeight: 17,
  },
  daySelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  dayPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  dayPillActive: {
    backgroundColor: '#111111',
  },
  dayPillText: {
    color: '#374151',
    fontSize: 12.5,
    fontWeight: '700',
  },
  dayPillTextActive: {
    color: '#FFFFFF',
  },
  slotGroupTitle: {
    color: '#111111',
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 8,
  },
  slotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  slotButtonActive: {
    backgroundColor: '#111111',
    borderColor: '#111111',
  },
  slotButtonText: {
    color: '#111111',
    fontSize: 12,
    fontWeight: '700',
  },
  slotButtonTextActive: {
    color: '#FFFFFF',
  },
  sliderBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111111', // Solid dark pill
    borderRadius: 36,
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  sliderWhiteCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderArrowsWrapper: {
    paddingHorizontal: 12,
  },
  sliderArrowText: {
    color: '#9CA3AF',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 4,
  },
  goHospitalLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sliderDarkCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#262933',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

