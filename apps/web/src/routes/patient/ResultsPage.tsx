import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { matchingApi } from '../../lib/api/matching.api';
import { HospitalCard } from '../../features/patient/HospitalCard';
import { ResultsFilterDrawer, FilterState } from '../../features/patient/ResultsFilterDrawer';
import { HospitalMap } from '../../components/common/HospitalMap';
import { RequestBedModal } from '../../features/patient/RequestBedModal';
import { Tabs } from '../../components/ui/Tabs';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  List,
  Map as MapIcon,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  SlidersHorizontal,
  ArrowLeft,
  MapPin,
} from 'lucide-react';

export const ResultsPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const conditionId = searchParams.get('conditionId') || undefined;
  const q = searchParams.get('q') || undefined;
  const lat = Number(searchParams.get('lat')) || 20.2961;
  const lng = Number(searchParams.get('lng')) || 85.8245;
  const severity = Number(searchParams.get('severity')) || 3;

  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);
  const [showExcluded, setShowExcluded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [requestModal, setRequestModal] = useState({
    isOpen: false,
    hospitalId: '',
    hospitalName: '',
    wardType: 'ICU',
  });

  const [filters, setFilters] = useState<FilterState>({
    radiusKm: 25,
    wardType: '',
    emergencyOnly: false,
    sortBy: 'score',
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['matching-hospitals', conditionId, q, lat, lng, severity, filters.radiusKm, filters.emergencyOnly],
    queryFn: () =>
      matchingApi.findMatches({
        conditionId,
        q: q || (conditionId ? undefined : 'Emergency Trauma'),
        lat,
        lng,
        radiusKm: filters.radiusKm,
        severity,
        emergencyOnly: filters.emergencyOnly,
        clientType: 'web',
      }),
    staleTime: 10000,
    refetchInterval: 15000,
  });

  const handleRequestBed = (hospitalId: string, wardType: string) => {
    const hosp = data?.hospitals.find((h) => h.hospital.id === hospitalId);
    setRequestModal({
      isOpen: true,
      hospitalId,
      hospitalName: hosp?.hospital.name || 'Hospital',
      wardType,
    });
  };

  let hospitals = data?.hospitals || [];
  if (filters.wardType) {
    hospitals = hospitals.filter((h) => h.matchedWard.wardType === filters.wardType);
  }
  if (filters.sortBy === 'distance') {
    hospitals = [...hospitals].sort((a, b) => a.distanceKm - b.distanceKm);
  } else if (filters.sortBy === 'beds') {
    hospitals = [...hospitals].sort((a, b) => b.matchedWard.freeBeds - a.matchedWard.freeBeds);
  }

  const excluded = data?.excluded || [];
  const title = data?.condition?.name || q || 'Available beds';

  return (
    <div className="ll-app-screen lg:max-w-none space-y-4 text-left">
      {/* App-style hospitals header */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-ink hover:bg-slate-50 transition shrink-0 lg:w-11 lg:h-11"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Hospitals</p>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold font-display text-ink tracking-tight truncate">
            {title}
          </h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {hospitals.length > 0
              ? `${hospitals.length} hospital${hospitals.length === 1 ? '' : 's'} nearby`
              : 'Searching nearby hospitals…'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="lg:hidden">
            <Tabs
              tabs={[
                { id: 'list', label: 'List', icon: <List className="w-3.5 h-3.5" /> },
                { id: 'map', label: 'Map', icon: <MapIcon className="w-3.5 h-3.5" /> },
              ]}
              activeTab={mobileView}
              onChange={(val) => setMobileView(val as 'list' | 'map')}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-1.5 h-11 px-4 bg-white rounded-2xl border border-hairline text-xs font-bold text-ink shadow-soft hover:bg-card-soft"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-muted" />
            Filters
          </button>
        </div>
      </div>

      {showFilters && (
        <ResultsFilterDrawer
          filters={filters}
          onChange={setFilters}
          onReset={() =>
            setFilters({ radiusKm: 25, wardType: '', emergencyOnly: false, sortBy: 'score' })
          }
        />
      )}

      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 space-y-4">
            <Skeleton variant="card" className="h-52" />
            <Skeleton variant="card" className="h-52" />
          </div>
          <div className="hidden lg:block lg:col-span-7">
            <Skeleton variant="card" className="h-[560px]" />
          </div>
        </div>
      )}

      {error && (
        <EmptyState
          icon={<AlertTriangle className="w-8 h-8 text-red" />}
          title="Couldn’t load hospitals"
          description="Check your connection and try again."
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      )}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div
            className={`space-y-3.5 lg:col-span-5 ${
              mobileView === 'map' ? 'hidden lg:block' : 'block'
            }`}
          >
            {hospitals.length === 0 ? (
              <EmptyState
                title={t('results.noResults')}
                description={t('results.noResultsSub')}
                actionLabel="Widen search to 50 km"
                onAction={() => setFilters((f) => ({ ...f, radiusKm: 50 }))}
              />
            ) : (
              hospitals.map((match, i) => (
                <HospitalCard
                  key={match.hospital.id}
                  match={match}
                  index={i}
                  onRequestBed={handleRequestBed}
                />
              ))
            )}

            {excluded.length > 0 && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowExcluded(!showExcluded)}
                  className="w-full p-3.5 bg-white rounded-2xl border border-hairline flex items-center justify-between text-xs font-bold text-muted hover:text-ink transition"
                >
                  <span>{excluded.length} hospitals not a fit right now</span>
                  {showExcluded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showExcluded && (
                  <div className="mt-2 space-y-2">
                    {excluded.map((item) => (
                      <div
                        key={item.hospitalId}
                        className="p-3 bg-white rounded-xl border border-hairline text-xs"
                      >
                        <span className="font-bold text-ink block">{item.hospitalName}</span>
                        <span className="text-muted mt-0.5 block">{item.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div
            className={`lg:col-span-7 h-[560px] lg:sticky lg:top-24 rounded-[24px] overflow-hidden border border-hairline shadow-soft ${
              mobileView === 'list' ? 'hidden lg:block' : 'block h-[70vh]'
            }`}
          >
            <HospitalMap
              userLat={lat}
              userLng={lng}
              hospitals={hospitals}
              selectedHospitalId={selectedHospitalId}
              onSelectHospital={setSelectedHospitalId}
            />
          </div>
        </div>
      )}

      <RequestBedModal
        isOpen={requestModal.isOpen}
        onClose={() => setRequestModal((prev) => ({ ...prev, isOpen: false }))}
        hospitalId={requestModal.hospitalId}
        hospitalName={requestModal.hospitalName}
        defaultWardType={requestModal.wardType}
        onSuccess={() => navigate('/requests')}
      />
    </div>
  );
};
