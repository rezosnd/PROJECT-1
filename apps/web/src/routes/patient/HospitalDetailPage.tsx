import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { hospitalsApi } from '../../lib/api/hospitals.api';
import { equipmentApi, EquipmentItem, EquipmentStatus } from '../../lib/api/equipment.api';
import { forecastApi } from '../../lib/api/forecast.api';
import { WardType } from '../../lib/api/beds.api';
import { useLiveBeds } from '../../hooks/useLiveBeds';
import { useElapsedTime } from '../../hooks/useElapsedTime';
import { ForecastChart } from '../../features/patient/ForecastChart';
import { RequestBedModal } from '../../features/patient/RequestBedModal';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { Skeleton } from '../../components/ui/Skeleton';
import { StatusDot } from '../../components/ui/StatusDot';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  Star,
  Activity,
  BedDouble,
  Clock,
  ArrowLeft,
  Share2
} from 'lucide-react';

export const HospitalDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'beds' | 'equipment' | 'overview'>('beds');
  const [selectedWardForForecast, setSelectedWardForForecast] = useState<WardType>('ICU');
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // 1. Hospital Profile Query
  const { data: hospital, isLoading: isHospLoading } = useQuery({
    queryKey: ['hospital-detail', id],
    queryFn: () => hospitalsApi.getHospitalById(id!),
    enabled: Boolean(id)
  });

  // 2. Live Ward Inventory with degraded mode fallback & socket pulse
  const { data: beds = [], isLoading: isBedsLoading, isLive, lastUpdated, pulseWard } = useLiveBeds(id);

  // 3. Equipment Query
  const { data: equipment = [], isLoading: isEqLoading } = useQuery({
    queryKey: ['hospital-equipment', id],
    queryFn: () => equipmentApi.getHospitalEquipment(id!),
    enabled: Boolean(id)
  });

  // 4. Ward Forecast Query
  const { data: wardForecast } = useQuery({
    queryKey: ['hospital-forecast', id, selectedWardForForecast],
    queryFn: () => forecastApi.getWardForecast(id!, selectedWardForForecast),
    enabled: Boolean(id && selectedWardForForecast)
  });

  const secondsAgo = useElapsedTime(lastUpdated);

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

  if (isHospLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Skeleton variant="card" className="h-44" />
        <Skeleton variant="card" className="h-96" />
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold font-display text-ink mb-2">Hospital Not Found</h2>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>
    );
  }

  const ratingAvg = Number(hospital.ratingAvg ?? (hospital as any).rating_avg ?? 4.5);
  const registrationNo = hospital.registrationNo || (hospital as any).registration_no || 'OD-BBSR-HOSP';
  const emergency24x7 = Boolean(hospital.emergency24x7 ?? (hospital as any).emergency_24x7 ?? true);
  const photoUrl = hospital.photoUrl || (hospital as any).photo_url;

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left">
      {/* Back button & Action Row */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Live Sync Badge */}
          <Chip variant={isLive ? 'green' : 'orange'} dot pulse={isLive}>
            {isLive ? 'Live Sync Active' : 'Polling (10s)'}
          </Chip>
          <span className="text-xs text-muted hidden sm:inline">
            {t('hospitalDetail.updatedAgo', { seconds: secondsAgo })}
          </span>
        </div>
      </div>

      {/* Hospital Banner Card */}
      <Card variant="surface" className="p-6 relative overflow-hidden border border-hairline/80 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-card-soft text-muted">
                {registrationNo}
              </span>
              <Chip variant="neutral" icon={<Star className="w-3 h-3 text-orange fill-orange" />}>
                {ratingAvg.toFixed(1)} / 5.0
              </Chip>
              {emergency24x7 && (
                <Chip variant="blue" icon={<ShieldCheck className="w-3 h-3 text-blue" />}>
                  24x7 Emergency
                </Chip>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold font-display text-ink tracking-tight">
              {hospital.name}
            </h1>

            <p className="text-xs text-muted flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red shrink-0" />
              <span>{hospital.address}, {hospital.city} - {hospital.pin}</span>
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={() => setIsRequestModalOpen(true)}
            className="shrink-0 font-bold shadow-soft"
          >
            Request Bed
          </Button>
        </div>

        {/* Real Cloudinary Verified Photo */}
        {photoUrl && (
          <div className="mt-4 rounded-2xl overflow-hidden border border-hairline/80 max-h-60">
            <img
              src={photoUrl}
              alt={hospital.name}
              className="w-full h-52 object-cover"
            />
          </div>
        )}
      </Card>

      {/* Segmented Navigation Tabs */}
      <Tabs
        tabs={[
          { id: 'beds', label: t('hospitalDetail.tabs.beds'), icon: <BedDouble className="w-4 h-4" /> },
          { id: 'equipment', label: t('hospitalDetail.tabs.equipment'), icon: <Activity className="w-4 h-4" /> },
          { id: 'overview', label: t('hospitalDetail.tabs.overview'), icon: <Building2 className="w-4 h-4" /> }
        ]}
        activeTab={activeTab}
        onChange={(val) => setActiveTab(val as any)}
      />

      {/* TAB 1: BEDS & FORECAST */}
      {activeTab === 'beds' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Ward Inventory Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {beds.map((w) => {
              const isPulsing = pulseWard === w.wardType;
              const isSelected = selectedWardForForecast === w.wardType;
              const freeColor = w.free > 2 ? 'text-green' : w.free > 0 ? 'text-orange' : 'text-red';
              const dotColor = w.free > 2 ? 'green' : w.free > 0 ? 'orange' : 'red';

              return (
                <div
                  key={w.wardType}
                  onClick={() => setSelectedWardForForecast(w.wardType)}
                  className={`p-4 bg-white rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-ink shadow-float scale-[1.01]'
                      : 'border-hairline/80 hover:border-ink/30 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-ink">{w.wardType} Ward</span>
                    <StatusDot color={dotColor as any} pulse={w.free > 0} />
                  </div>

                  <div className="flex items-baseline gap-2 mb-1">
                    <span className={`font-display font-extrabold text-3xl ${freeColor} ${isPulsing ? 'animate-number-pulse' : ''}`}>
                      {w.free}
                    </span>
                    <span className="text-xs text-muted font-medium">
                      {w.free === 1 ? 'bed free now' : 'beds free now'}
                    </span>
                  </div>
                  <p className={`text-xs font-semibold mb-2 ${freeColor}`}>
                    {w.free > 2
                      ? 'Good chance — you can request a bed'
                      : w.free > 0
                      ? 'Limited — request quickly (15-min hold)'
                      : 'Full right now — check again soon'}
                  </p>

                  <div className="text-[11px] text-muted space-y-0.5 pt-2 border-t border-hairline/60">
                    <div className="flex justify-between">
                      <span>Total beds in ward:</span>
                      <span className="font-semibold text-ink">{w.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Patients using beds:</span>
                      <span className="font-semibold text-ink">{w.occupied}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Held for incoming:</span>
                      <span className="font-semibold text-ink">{w.reserved}</span>
                    </div>
                  </div>
                  {isSelected &&
                    (wardForecast?.horizons?.h3 || wardForecast?.horizons?.['3h']) && (() => {
                      const p =
                        wardForecast.horizons.h3?.probabilityAtLeastOneFree ??
                        wardForecast.horizons['3h']?.probabilityAtLeastOneFree ??
                        0;
                      return (
                        <div className="mt-2 pt-2 border-t border-hairline/40 text-[11px]">
                          <span className="text-muted">Chance free in ~3 hrs: </span>
                          <span className="font-extrabold text-ink">{Math.round(p * 100)}%</span>
                          <span className="text-muted">
                            {' '}({p >= 0.7 ? 'Likely' : p >= 0.4 ? 'Possible' : 'Unlikely'})
                          </span>
                        </div>
                      );
                    })()}
                </div>
              );
            })}
          </div>

          {/* Availability Projections Recharts Graphic */}
          {wardForecast && <ForecastChart forecast={wardForecast} />}
        </div>
      )}

      {/* TAB 2: EQUIPMENT LISTING */}
      {activeTab === 'equipment' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex flex-wrap gap-2">
            <Chip variant="green" dot>
              {equipmentSummary.AVAILABLE} available
            </Chip>
            <Chip variant="blue" dot>
              {equipmentSummary.IN_USE} in use
            </Chip>
            <Chip variant="orange" dot>
              {equipmentSummary.MAINTENANCE} maintenance
            </Chip>
            <Chip variant="neutral">
              {equipment.length} total units
            </Chip>
          </div>

          {isEqLoading ? (
            <Skeleton variant="card" className="h-48" />
          ) : equipment.length === 0 ? (
            <Card variant="surface" className="p-6 text-center border border-hairline/80">
              <p className="text-sm text-muted">No equipment registered for this hospital yet.</p>
            </Card>
          ) : (
            equipmentByType.map(([type, items]) => (
              <Card key={type} variant="surface" className="p-0 overflow-hidden border border-hairline/80 shadow-soft">
                <div className="p-4 border-b border-hairline/60 bg-[#F0FBE4]/40">
                  <h3 className="font-display font-bold text-base text-[#0B3D1A]">
                    {type.replace(/_/g, ' ')} <span className="text-muted font-medium">({items.length})</span>
                  </h3>
                </div>
                <div className="divide-y divide-hairline/60">
                  {items.map((eq) => (
                    <div key={eq.id} className="p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <span className="font-bold text-sm text-ink block truncate">{eq.name}</span>
                        <span className="text-xs text-muted block mt-0.5">
                          {eq.model ? `${eq.model} · ` : ''}
                          Criticality: {eq.criticality}
                          {eq.serialNo ? ` · #${eq.serialNo.slice(-6)}` : ''}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <Chip
                          variant={
                            eq.status === 'AVAILABLE'
                              ? 'green'
                              : eq.status === 'IN_USE'
                              ? 'blue'
                              : eq.status === 'MAINTENANCE'
                              ? 'orange'
                              : 'red'
                          }
                          dot
                        >
                          {eq.status.replace('_', ' ')}
                        </Chip>
                        {eq.availableAt && (
                          <span className="text-[10px] text-muted block mt-1">
                            Est. return:{' '}
                            {new Date(eq.availableAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* TAB 3: OVERVIEW & MAP */}
      {activeTab === 'overview' && (
        <div className="space-y-4 animate-in fade-in">
          <Card variant="surface" className="p-5 border border-hairline/80 shadow-soft space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Clinical Specialties
              </h4>
              <div className="flex items-center gap-1.5 flex-wrap">
                {hospital.specialties?.map((s: string) => (
                  <Chip key={s} variant="neutral">
                    {s}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-hairline/60">
              <div className="flex items-center gap-2 text-xs text-ink">
                <Phone className="w-4 h-4 text-muted" />
                <a href={`tel:${hospital.phone}`} className="font-semibold hover:underline">
                  {hospital.phone}
                </a>
              </div>
              <div className="flex items-center gap-2 text-xs text-ink">
                <Mail className="w-4 h-4 text-muted" />
                <a href={`mailto:${hospital.email}`} className="font-semibold hover:underline truncate">
                  {hospital.email}
                </a>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Bed Reservation Modal */}
      <RequestBedModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        hospitalId={hospital.id}
        hospitalName={hospital.name}
        defaultWardType={selectedWardForForecast}
        onSuccess={() => navigate('/requests')}
      />
    </div>
  );
};

