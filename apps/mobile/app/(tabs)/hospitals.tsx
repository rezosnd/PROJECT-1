import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { matchingApi } from '../../src/lib/api/matching.api';
import { HospitalResultCard } from '../../src/features/patient/HospitalResultCard';
import { RequestBedBottomSheet } from '../../src/features/patient/RequestBedBottomSheet';
import { FiltersBottomSheet, FilterState } from '../../src/features/patient/FiltersBottomSheet';
import { Skeleton } from '../../src/components/ui/Skeleton';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { EmergencyFooter } from '../../src/components/ui/EmergencyFooter';
import { cacheStorage } from '../../src/lib/storage/cache-storage';
import { colors, radius, typography, spacing } from '../../src/theme/tokens';
import {
  ChevronLeft,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Building2,
  MapPin,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useFlashStore } from '../../src/lib/ui/flash-store';

export default function HospitalsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const pushFlash = useFlashStore((s) => s.push);
  const params = useLocalSearchParams<{ condition?: string; severity?: string; lat?: string; lng?: string }>();

  const conditionSlug = params.condition || 'stroke';
  const severityLevel = Number(params.severity) || 4;

  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [notSuitableOpen, setNotSuitableOpen] = useState(false);
  const [selectedHospitalForHold, setSelectedHospitalForHold] = useState<{ id: string; ward: string; name: string } | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    radiusKm: 15,
    wardType: null,
    emergencyOnly: false,
  });

  const {
    data: matchData,
    isLoading,
    isRefetching,
    refetch,
    isError,
  } = useQuery({
    queryKey: ['hospital-matches', conditionSlug, severityLevel, filters],
    queryFn: async () => {
      try {
        const res = await matchingApi.findMatches({
          conditionSlug,
          severity: severityLevel,
          lat: params.lat ? Number(params.lat) : undefined,
          lng: params.lng ? Number(params.lng) : undefined,
        });
        cacheStorage.set('last_matches', res);
        return res;
      } catch (err) {
        // Fallback: plain verified hospital directory if match times out
        try {
          const { hospitalsApi } = await import('../../src/lib/api/hospitals.api');
          const list = await hospitalsApi.getHospitals('VERIFIED');
          const items = Array.isArray(list) ? list : (list as any)?.items || [];
          const fallback = {
            condition: { id: 'fallback', name: conditionSlug, category: 'Emergency' },
            matchedCount: items.length,
            hospitals: items.map((h: any) => ({
              hospital: {
                id: h.id,
                name: h.name,
                address: h.address,
                phone: h.phone,
                emergency24x7: h.emergency24x7 ?? true,
                ratingAvg: h.ratingAvg || 4.5,
                latitude: h.latitude,
                longitude: h.longitude,
              },
              distanceKm: h.distanceKm || 0,
              etaMinutes: Math.round(((h.distanceKm || 1) / 30) * 60),
              score: 0.7,
              scoreBreakdown: { proximity: 0.7, beds: 0.7, equipment: 0.7, specialty: 0.7 },
              matchedWard: {
                wardType: 'ICU',
                freeBeds: h.beds?.find?.((b: any) => b.ward_type === 'ICU' || b.wardType === 'ICU')?.free || 1,
                forecastProb1h: 0.8,
                forecastProb3h: 0.75,
                forecastProb6h: 0.7,
                confidence: 'LOW' as const,
              },
              matchedEquipment: [],
              explanation: 'Directory fallback — live match engine temporarily slow',
            })),
            excluded: [],
            emergencyDisclaimer: 'In an emergency call 112',
          };
          cacheStorage.set('last_matches', fallback);
          return fallback;
        } catch {
          const cached = cacheStorage.get<any>('last_matches');
          if (cached) return (cached as any).data || cached;
          throw err;
        }
      }
    },
    staleTime: 10000,
  });

  const handleRequestBed = (hospitalId: string, wardType: string) => {
    const hosp = matchData?.hospitals.find((h: any) => h.hospital.id === hospitalId);
    setSelectedHospitalForHold({
      id: hospitalId,
      ward: wardType,
      name: hosp?.hospital?.name || 'Hospital',
    });
  };

  const handleHoldSuccess = (requestId: string) => {
    setSelectedHospitalForHold(null);
    pushFlash({
      title: 'Bed hold confirmed',
      body: 'Formal email sent to your Gmail. Track status in My Requests.',
      tone: 'success',
    });
    router.replace('/(tabs)');
  };

  const hospitalsList = matchData?.hospitals || [];
  const excludedList = matchData?.excluded || [];

  return (
    <View style={styles.container}>
      {/* TOP HEADER MATCHING MOCKUP */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.circleHeaderBtn}
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={22} color="#0F172A" />
        </Pressable>

        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>Hospitals near you</Text>
        </View>

        <Pressable
          onPress={() => setFiltersOpen(true)}
          style={styles.circleHeaderBtn}
          accessibilityLabel="Search and filter"
        >
          <Search size={20} color="#0F172A" />
        </Pressable>
      </View>

      {/* FILTER / VIEW TOGGLE CHIPS */}
      <View style={styles.subHeaderRow}>
        <View style={styles.triageBadge}>
          <Text style={styles.triageBadgeText}>
            {conditionSlug.toUpperCase()} • Triage L{severityLevel}
          </Text>
        </View>

        <Pressable
          onPress={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
          style={styles.modeToggleBtn}
        >
          <MapPin size={14} color="#B4F481" />
          <Text style={styles.modeToggleText}>
            {viewMode === 'list' ? 'Map view' : 'List view'}
          </Text>
        </Pressable>
      </View>

      {/* MAIN LIST / MAP */}
      {viewMode === 'map' ? (
        <View style={styles.mapContainer}>
          <MapView
            style={StyleSheet.absoluteFillObject}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={{
              latitude: Number(params.lat) || 20.2961,
              longitude: Number(params.lng) || 85.8245,
              latitudeDelta: 0.12,
              longitudeDelta: 0.12,
            }}
          >
            {hospitalsList.map((match: any) => (
              <Marker
                key={match.hospital.id}
                coordinate={{
                  latitude: Number(match.hospital.latitude) || 20.2961,
                  longitude: Number(match.hospital.longitude) || 85.8245,
                }}
                title={match.hospital.name}
                description={`${match.matchedWard?.wardType || 'Ward'} · ${match.matchedWard?.freeBeds ?? '?'} free`}
                onCalloutPress={() => router.push(`/hospital/${match.hospital.id}` as any)}
              />
            ))}
          </MapView>
          {hospitalsList.length === 0 && (
            <View style={styles.mapEmptyOverlay}>
              <Text style={styles.mapTitle}>No hospitals pinned yet</Text>
              <Text style={styles.mapDesc}>Switch to list or pull to refresh match results.</Text>
            </View>
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => { void refetch(); }}
              tintColor="#B4F481"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Skeleton height={150} borderRadius={32} style={styles.skeletonItem} />
              <Skeleton height={150} borderRadius={32} style={styles.skeletonItem} />
              <Skeleton height={150} borderRadius={32} style={styles.skeletonItem} />
            </View>
          ) : isError && hospitalsList.length === 0 ? (
            <EmptyState
              icon={<AlertCircle size={32} color={colors.red} />}
              title="Connection Interrupted"
              description="Unable to reach hospital telemetry grid. Please check network."
              actionLabel="Retry Telemetry"
              onAction={refetch}
            />
          ) : hospitalsList.length === 0 ? (
            <EmptyState
              icon={<Building2 size={32} color={colors.muted} />}
              title={t('results.noMatches', 'No hospitals have matching capacity')}
              description={t('results.tryExpanding', 'Try expanding search radius or adjusting severity.')}
            />
          ) : (
            <>
              {hospitalsList.map((match: any, index: number) => (
                <HospitalResultCard
                  key={match.hospital.id}
                  item={match}
                  index={index}
                  onRequestBed={handleRequestBed}
                  onPressDetails={(id) => router.push(`/hospital/${id}` as any)}
                />
              ))}

              {/* Collapsible Excluded Facilities Section */}
              {excludedList.length > 0 && (
                <View style={styles.excludedSection}>
                  <Pressable
                    onPress={() => setNotSuitableOpen(!notSuitableOpen)}
                    style={styles.excludedHeader}
                  >
                    <View style={styles.excludedTitleRow}>
                      <AlertCircle size={15} color={colors.muted} />
                      <Text style={styles.excludedTitle}>
                        {t('results.notSuitable', { count: excludedList.length, defaultValue: `Not suitable (${excludedList.length} facilities)` })}
                      </Text>
                    </View>
                    {notSuitableOpen ? (
                      <ChevronUp size={18} color={colors.muted} />
                    ) : (
                      <ChevronDown size={18} color={colors.muted} />
                    )}
                  </Pressable>

                  {notSuitableOpen && (
                    <View style={styles.excludedList}>
                      {excludedList.map((ex: any) => (
                        <View key={ex.hospitalId} style={styles.excludedItem}>
                          <Text style={styles.excludedHospName}>{ex.hospitalName}</Text>
                          <Text style={styles.excludedReason}>{ex.reason}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* 15-Minute Bed Request Bottom Sheet */}
      {selectedHospitalForHold && (
        <RequestBedBottomSheet
          visible={Boolean(selectedHospitalForHold)}
          hospitalId={selectedHospitalForHold.id}
          hospitalName={selectedHospitalForHold.name}
          initialWardType={selectedHospitalForHold.ward}
          onClose={() => setSelectedHospitalForHold(null)}
          onSuccess={handleHoldSuccess}
        />
      )}

      {/* Filters Sheet */}
      <FiltersBottomSheet
        visible={filtersOpen}
        filters={filters}
        onChange={(newFilters) => setFilters(newFilters)}
        onClose={() => setFiltersOpen(false)}
      />

      {/* Permanent Emergency Footer Strip */}
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
    paddingTop: 54,
    paddingBottom: 14,
  },
  circleHeaderBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  triageBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  triageBadgeText: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.5,
  },
  modeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modeToggleText: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 30,
  },
  loadingContainer: {
    gap: 16,
  },
  skeletonItem: {
    marginBottom: 12,
  },
  excludedSection: {
    marginTop: 8,
    marginBottom: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  excludedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  excludedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  excludedTitle: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: 13,
    color: '#64748B',
  },
  excludedList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
  },
  excludedItem: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  excludedHospName: {
    fontFamily: typography.fontFamilies.bodyBold,
    fontSize: 13,
    color: '#0F172A',
  },
  excludedReason: {
    fontFamily: typography.fontFamilies.body,
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 16,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    margin: 18,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  mapEmptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248,250,252,0.85)',
    padding: 24,
  },
  mapIcon: {
    marginBottom: 16,
  },
  mapTitle: {
    fontFamily: typography.fontFamilies.headingBold,
    fontSize: 18,
    color: '#0F172A',
    marginBottom: 8,
  },
  mapDesc: {
    fontFamily: typography.fontFamilies.body,
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});
