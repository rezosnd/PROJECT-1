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
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Search,
  Star,
  MapPin,
  Phone,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { mapDirectoryDoctor, Doctor } from '../src/lib/doctors-data';
import { insuranceApi } from '../src/lib/api/insurance.api';
import { SpecialtyIcon } from '../src/components/graphics/SpecialtyIcons';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export default function TopDoctorsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const { data: directory = [] } = useQuery({
    queryKey: ['directory-doctors'],
    queryFn: () => insuranceApi.listDoctors(60),
    staleTime: 60_000,
  });
  const doctors = useMemo(
    () => directory.map((d, i) => mapDirectoryDoctor(d, i)),
    [directory]
  );

  const filteredDoctors = doctors.filter((doc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      doc.name.toLowerCase().includes(q) ||
      doc.specialty.toLowerCase().includes(q) ||
      doc.hospitalName.toLowerCase().includes(q)
    );
  });

  const handleOpenDoctorDetail = (doctor: Doctor) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: `/doctor/${doctor.id}` as any,
    });
  };

  const handleCall = (phone: string) => {
    Haptics.selectionAsync();
    Linking.openURL(`tel:${phone}`);
  };

  const handleMap = (lat: number, lng: number) => {
    Haptics.selectionAsync();
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* STATUS BAR SPACE / HEADER (MATCHES LEFT SCREEN) */}
      <View style={styles.header}>
        {/* Back Button */}
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.circleNavBtn,
            pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
          ]}
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={22} color="#FFFFFF" strokeWidth={2.4} />
        </Pressable>

        {/* Title */}
        <Text style={styles.headerTitle}>Top doctors</Text>

        {/* Search Icon */}
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setIsSearchVisible(!isSearchVisible);
          }}
          style={({ pressed }) => [
            styles.circleNavBtn,
            pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
          ]}
          accessibilityLabel="Search doctors"
        >
          {isSearchVisible ? (
            <X size={20} color="#FFFFFF" strokeWidth={2.4} />
          ) : (
            <Search size={20} color="#FFFFFF" strokeWidth={2.4} />
          )}
        </Pressable>
      </View>

      {/* EXPANDABLE SEARCH BAR */}
      {isSearchVisible && (
        <View style={styles.searchBarContainer}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by doctor, specialty, clinic..."
            placeholderTextColor="#64748B"
            style={styles.searchInput}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={16} color="#94A3B8" />
            </Pressable>
          )}
        </View>
      )}

      {/* DOCTOR CARDS LIST (100% MATCHING REFERENCE DESIGN) */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredDoctors.map((doc, index) => {
          return (
            <View
              key={doc.id}
              style={[
                styles.doctorCard,
                { backgroundColor: doc.cardColor },
              ]}
            >
              {/* LEFT COLUMN: Circular Doctor Avatar + Star Rating */}
              <View style={styles.avatarRatingColumn}>
                <View style={styles.avatarRing}>
                  <Image
                    source={{ uri: doc.avatarUrl }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                </View>

                {/* Rating Badge: Star + 4.5/5.0 */}
                <View style={styles.ratingBadge}>
                  <Star size={15} color="#111111" fill="transparent" strokeWidth={2} />
                  <Text style={styles.ratingText}>{doc.rating.toFixed(1)}/5.0</Text>
                </View>
              </View>

              {/* CENTER COLUMN: Doctor info & Care QR CTA */}
              <View style={styles.infoColumn}>
                <Text style={styles.doctorName} numberOfLines={1}>
                  {doc.name}
                </Text>
                <Text style={styles.doctorSpecialty} numberOfLines={1}>
                  {doc.specialty}
                </Text>
                <Text style={styles.doctorFee}>
                  ₹ {doc.fee.toFixed(2)}
                </Text>

                {/* Solid Black CTA Pill */}
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push('/(tabs)/profile');
                  }}
                  style={({ pressed }) => [
                    styles.appointmentBtn,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Open Care QR in Profile for doctor referral"
                >
                  <Text style={styles.appointmentBtnText}>Care QR · refer</Text>
                </Pressable>
              </View>

              {/* RIGHT COLUMN: 3 White Circular Icon Buttons Stacked Vertically */}
              <View style={styles.actionsColumn}>
                {/* 1. Specialty Icon Button */}
                <Pressable
                  onPress={() => handleOpenDoctorDetail(doc)}
                  style={({ pressed }) => [
                    styles.whiteActionCircle,
                    pressed && { opacity: 0.8, transform: [{ scale: 0.92 }] },
                  ]}
                  accessibilityLabel={`${doc.specialty} icon`}
                >
                  <SpecialtyIcon type={doc.specialtyType} size={20} color="#111111" />
                </Pressable>

                {/* 2. Location Pin Button */}
                <Pressable
                  onPress={() => handleMap(doc.latitude, doc.longitude)}
                  style={({ pressed }) => [
                    styles.whiteActionCircle,
                    pressed && { opacity: 0.8, transform: [{ scale: 0.92 }] },
                  ]}
                  accessibilityLabel="View doctor clinic location on Google Maps"
                >
                  <MapPin size={20} color="#111111" strokeWidth={2} />
                </Pressable>

                {/* 3. Phone Call Button */}
                <Pressable
                  onPress={() => handleCall(doc.phone)}
                  style={({ pressed }) => [
                    styles.whiteActionCircle,
                    pressed && { opacity: 0.8, transform: [{ scale: 0.92 }] },
                  ]}
                  accessibilityLabel={`Call ${doc.name}`}
                >
                  <Phone size={19} color="#111111" strokeWidth={2} />
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0F12', // Deep matte dark background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  circleNavBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E2028',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1D24',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#2A2E39',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    padding: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
    gap: 14,
  },
  doctorCard: {
    borderRadius: 36,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarRatingColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 82,
  },
  avatarRing: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#FFFFFF',
    padding: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  ratingText: {
    color: '#111111',
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  infoColumn: {
    flex: 1,
    paddingLeft: 12,
    paddingRight: 8,
    justifyContent: 'center',
  },
  doctorName: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  doctorSpecialty: {
    color: '#262626',
    fontSize: 13.5,
    fontWeight: '600',
    marginBottom: 6,
  },
  doctorFee: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  appointmentBtn: {
    backgroundColor: '#111111',
    borderRadius: 24,
    paddingVertical: 9,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  appointmentBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  actionsColumn: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  whiteActionCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
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

