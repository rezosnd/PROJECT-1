import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLocation } from '../../src/hooks/useLocation';
import { EmergencyCallButton } from '../../src/components/ui/EmergencyCallButton';
import { EmergencyFooter } from '../../src/components/ui/EmergencyFooter';
import { colors, radius, typography } from '../../src/theme/tokens';
import {
  Search,
  MapPin,
  ArrowRight,
  Brain,
  Heart,
  Baby,
  Activity,
  Star,
  ShieldCheck,
  ChevronRight,
  Phone,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { TOP_DOCTORS, Doctor } from '../../src/lib/doctors-data';
import { SpecialtyIcon } from '../../src/components/graphics/SpecialtyIcons';
import { FlashBanner } from '../../src/components/ui/FlashBanner';
import { useAuthStore } from '../../src/lib/auth/auth-store';
import { useQuery } from '@tanstack/react-query';
import { abhaApi } from '../../src/lib/api/abha.api';

const QUICK_TAGS = [
  { id: 'stroke', label: 'Stroke (ICU)', icon: Brain, severity: 5 },
  { id: 'heart-attack', label: 'Cardiac (CCU)', icon: Heart, severity: 5 },
  { id: 'premature-baby', label: 'NICU Incubator', icon: Baby, severity: 5 },
  { id: 'trauma', label: 'Trauma OT', icon: Activity, severity: 5 },
];

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('stroke');
  const { location } = useLocation();
  const user = useAuthStore((s) => s.user);
  const { data: abhaProfile } = useQuery({
    queryKey: ['abha-profile'],
    queryFn: () => abhaApi.getProfile(),
  });
  const avatarUri = abhaProfile?.photoUrl || user?.abhaPhotoUrl || user?.pictureUrl || null;

  const handleLaunchSearch = (conditionSlug = selectedTag, severity = 4) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/(tabs)/hospitals',
      params: {
        condition: conditionSlug,
        severity: String(severity),
        lat: String(location.latitude),
        lng: String(location.longitude),
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* APP TOP BAR */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.push('/(tabs)/profile')}
          style={styles.greetingGroup}
          accessibilityRole="button"
        >
          <View style={styles.homeIdentityRow}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.homeAvatar} />
            ) : (
              <View style={[styles.homeAvatar, styles.homeAvatarFallback]}>
                <Text style={styles.homeAvatarInitial}>
                  {(abhaProfile?.name || user?.name || 'P').slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.greetingSub}>
                {abhaProfile
                  ? t('home.abhaReady', 'ABHA ready · tap profile for card & QR')
                  : t('home.subtitle', 'Real-time critical care inventory')}
              </Text>
              <Text style={styles.greetingTitle} numberOfLines={1}>
                {abhaProfile?.name || user?.name || t('home.title', 'Find Available Beds')}
              </Text>
            </View>
          </View>
        </Pressable>

        <EmergencyCallButton size="sm" />
      </View>

      <FlashBanner />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* LIVE CITY TELEMETRY PILL */}
        <View style={styles.liveGridPill}>
          <View style={styles.liveGreenDot} />
          <Text style={styles.liveGridText}>
            Bhubaneswar Grid: <Text style={styles.liveGridBold}>34 ICU Beds Free</Text>
          </Text>
          <View style={styles.locationPillMini}>
            <MapPin size={11} color="#2563EB" />
            <Text style={styles.locationMiniText}>GPS Active</Text>
          </View>
        </View>

        {/* UNIFIED HERO SEARCH & TRIAGE CARD */}
        <View style={styles.searchCardWrapper}>
          <Text style={styles.searchHeadline}>Find Immediate Critical Care</Text>

          {/* Search Input Box */}
          <Pressable
            onPress={() => handleLaunchSearch()}
            style={styles.searchInputRow}
          >
            <Search size={18} color="#64748B" />
            <Text style={styles.searchPlaceholderText}>
              Search condition, doctor, or hospital...
            </Text>
          </Pressable>

          {/* Quick Filter Tag Pills */}
          <View style={styles.tagsRow}>
            {QUICK_TAGS.map((tag) => {
              const IconComp = tag.icon;
              const isSelected = selectedTag === tag.id;
              return (
                <Pressable
                  key={tag.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedTag(tag.id);
                    handleLaunchSearch(tag.id, tag.severity);
                  }}
                  style={[
                    styles.tagPill,
                    isSelected && styles.tagPillActive,
                  ]}
                >
                  <IconComp
                    size={14}
                    color={isSelected ? '#0F172A' : '#64748B'}
                    strokeWidth={2}
                  />
                  <Text
                    style={[
                      styles.tagText,
                      isSelected && styles.tagTextActive,
                    ]}
                  >
                    {tag.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Search Action Button */}
          <Pressable
            onPress={() => handleLaunchSearch()}
            style={({ pressed }) => [
              styles.primarySearchBtn,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={styles.primarySearchBtnText}>Search Available Beds</Text>
            <ArrowRight size={17} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* TOP DOCTORS (100% MATCHING REFERENCE DESIGN) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Doctors</Text>
          <Pressable onPress={() => {
            Haptics.selectionAsync();
            router.push('/top-doctors');
          }}>
            <Text style={styles.seeAllLink}>See all ›</Text>
          </Pressable>
        </View>

        {/* 4 TOP DOCTORS MAPPED FROM REFERENCE DESIGN */}
        {TOP_DOCTORS.map((doc) => (
          <Pressable
            key={doc.id}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push(`/doctor/${doc.id}` as any);
            }}
            style={({ pressed }) => [
              styles.doctorHeroCard,
              { backgroundColor: doc.cardColor },
              pressed && { transform: [{ scale: 0.985 }] },
            ]}
          >
            {/* Left Avatar + Star Rating */}
            <View style={styles.cardLeftCol}>
              <View style={styles.avatarCircleFrame}>
                <Image
                  source={{ uri: doc.avatarUrl }}
                  style={styles.doctorAvatarImg}
                />
              </View>
              <View style={styles.starRatingBadge}>
                <Star size={13} color="#0F172A" fill="transparent" strokeWidth={2.2} />
                <Text style={styles.starRatingVal}>{doc.rating.toFixed(1)}/5.0</Text>
              </View>
            </View>

            {/* Center Info + Appointment CTA */}
            <View style={styles.cardCenterCol}>
              <Text style={styles.docNameText} numberOfLines={1}>{doc.name}</Text>
              <Text style={styles.docSpecText} numberOfLines={1}>{doc.specialty}</Text>
              <Text style={styles.docFeeText}>
                ₹ {doc.fee.toFixed(2)}
              </Text>

              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push(`/doctor/${doc.id}` as any);
                }}
                style={styles.getAppointmentPill}
              >
                <Text style={styles.getAppointmentText}>Get Appointment</Text>
              </Pressable>
            </View>

            {/* Right Action Icons Stack */}
            <View style={styles.cardRightCol}>
              <Pressable
                onPress={() => router.push(`/doctor/${doc.id}` as any)}
                style={styles.actionWhiteCircle}
              >
                <SpecialtyIcon type={doc.specialtyType} size={19} color="#0F172A" />
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${doc.latitude},${doc.longitude}`);
                }}
                style={styles.actionWhiteCircle}
              >
                <MapPin size={18} color="#0F172A" />
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  Linking.openURL(`tel:${doc.phone}`);
                }}
                style={styles.actionWhiteCircle}
              >
                <Phone size={17} color="#0F172A" />
              </Pressable>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* PERMANENT 112 EMERGENCY FOOTER */}
      <EmergencyFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  greetingGroup: {
    flex: 1,
    marginRight: 10,
  },
  homeIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  homeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  homeAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B2A5B',
  },
  homeAvatarInitial: {
    color: '#FFFFFF',
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: 16,
  },
  greetingSub: {
    fontFamily: typography.fontFamilies.bodyMedium,
    fontSize: 11,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  greetingTitle: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 36,
  },
  liveGridPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
  },
  liveGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
    marginRight: 6,
  },
  liveGridText: {
    fontFamily: typography.fontFamilies.bodyMedium,
    fontSize: 12,
    color: '#334155',
    flex: 1,
  },
  liveGridBold: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontWeight: '700',
    color: '#0F172A',
  },
  locationPillMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  locationMiniText: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  searchCardWrapper: {
    backgroundColor: '#F8FAFC',
    borderRadius: 28,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  searchHeadline: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  searchPlaceholderText: {
    fontFamily: typography.fontFamilies.body,
    fontSize: 13,
    color: '#64748B',
    flex: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tagPillActive: {
    backgroundColor: '#B4F481',
    borderColor: '#86EFAC',
  },
  tagText: {
    fontFamily: typography.fontFamilies.bodyMedium,
    fontSize: 12,
    color: '#64748B',
  },
  tagTextActive: {
    fontFamily: typography.fontFamilies.bodyBold,
    color: '#0F172A',
    fontWeight: '700',
  },
  primarySearchBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 999,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  primarySearchBtnText: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  seeAllLink: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  doctorHeroCard: {
    borderRadius: 30,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  cardLeftCol: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarCircleFrame: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  doctorAvatarImg: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  starRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
  },
  starRatingVal: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardCenterCol: {
    flex: 1,
    justifyContent: 'center',
  },
  docNameText: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  docSpecText: {
    fontFamily: typography.fontFamilies.bodySemiBold,
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginTop: 1,
  },
  docFeeText: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
  },
  docFreeBeds: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
  },
  getAppointmentPill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  getAppointmentText: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardRightCol: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginLeft: 8,
  },
  actionWhiteCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
});
