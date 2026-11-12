import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { hospitalsApi } from '../../lib/api/hospitals.api';
import { insuranceApi } from '../../lib/api/insurance.api';
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
  ArrowLeft,
  Navigation,
  Stethoscope,
  Hospital,
  Wrench,
} from 'lucide-react';

const STATUS_CHIP: Record<
  EquipmentStatus,
  'green' | 'blue' | 'orange' | 'red' | 'neutral'
> = {
  AVAILABLE: 'green',
  IN_USE: 'blue',
  MAINTENANCE: 'orange',
  OFFLINE: 'red',
};

export const HospitalDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'overview' | 'beds' | 'equipment'>('overview');
  const [selectedWardForForecast, setSelectedWardForForecast] = useState<WardType>('ICU');
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [equipmentFilter, setEquipmentFilter] = useState<'ALL' | EquipmentStatus>('ALL');

  const { data: hospital, isLoading: isHospLoading } = useQuery({
    queryKey: ['hospital-detail', id],
    queryFn: () => hospitalsApi.getHospitalById(id!),
    enabled: Boolean(id),
  });

  const { data: beds = [], isLoading: isBedsLoading, isLive, lastUpdated, pulseWard } = useLiveBeds(id);

  const { data: equipment = [], isLoading: isEqLoading } = useQuery({
    queryKey: ['hospital-equipment', id],
    queryFn: () => equipmentApi.getHospitalEquipment(id!),
    enabled: Boolean(id),
  });

  const { data: wardForecast } = useQuery({
    queryKey: ['hospital-forecast', id, selectedWardForForecast],
    queryFn: () => forecastApi.getWardForecast(id!, selectedWardForForecast),
    enabled: Boolean(id && selectedWardForForecast),
  });

  const { data: insuranceNetwork = [] } = useQuery({
    queryKey: ['hospital-insurance', id],
    queryFn: () => insuranceApi.getHospitalNetwork(id!),
    enabled: Boolean(id),
    staleTime: 60_000,
  });

  const secondsAgo = useElapsedTime(lastUpdated);

  const freeBedsTotal = useMemo(
    () => beds.reduce((sum, w) => sum + (Number(w.free) || 0), 0),
    [beds]
  );
  const totalBedsCount = useMemo(
    () => beds.reduce((sum, w) => sum + (Number(w.total) || 0), 0),
    [beds]
  );

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

  const filteredEquipment = useMemo(() => {
    if (equipmentFilter === 'ALL') return equipment;
    return equipment.filter((eq) => eq.status === equipmentFilter);
  }, [equipment, equipmentFilter]);

  const equipmentByType = useMemo(() => {
    const map = new Map<string, EquipmentItem[]>();
    for (const eq of filteredEquipment) {
      const key = eq.type || 'OTHER';
      const list = map.get(key) || [];
      list.push(eq);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredEquipment]);

  if (isHospLoading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        <Skeleton variant="card" className="h-56 rounded-[32px]" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Skeleton variant="card" className="h-24 rounded-[24px]" />
          <Skeleton variant="card" className="h-24 rounded-[24px]" />
          <Skeleton variant="card" className="h-24 rounded-[24px]" />
          <Skeleton variant="card" className="h-24 rounded-[24px]" />
        </div>
        <Skeleton variant="card" className="h-96 rounded-[28px]" />
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="text-center py-16 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-[#EEF8D8] mx-auto mb-4 flex items-center justify-center">
          <Hospital className="w-7 h-7 text-[#0B3D1A]" />
        </div>
        <h2 className="text-xl font-bold font-display text-ink mb-2">Hospital not found</h2>
        <p className="text-sm text-muted mb-5">This profile may have been removed or the link is outdated.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/')}>
          Return home
        </Button>
      </div>
    );
  }

  const ratingAvg = Number(hospital.ratingAvg ?? (hospital as any).rating_avg ?? 4.5);
  const registrationNo = hospital.registrationNo || (hospital as any).registration_no || '—';
  const emergency24x7 = Boolean(hospital.emergency24x7 ?? (hospital as any).emergency_24x7 ?? true);
  const photoUrl = hospital.photoUrl || (hospital as any).photo_url;
  const traumaLevel = Number(hospital.traumaLevel ?? (hospital as any).trauma_level ?? 0);
  const hospitalType = hospital.type || (hospital as any).type || 'PRIVATE';
  const specialties: string[] = hospital.specialties || [];
  const facilities: string[] = hospital.facilities || [];
  const mapsUrl =
    hospital.latitude && hospital.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude},${hospital.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${hospital.name} ${hospital.address || ''} ${hospital.city || ''}`
        )}`;

  return (
    <div className="max-w-5xl mx-auto space-y-5 text-left pb-10">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-2">
          <Chip variant={isLive ? 'green' : 'orange'} dot pulse={isLive}>
            {isLive ? 'Live sync' : 'Polling'}
          </Chip>
          <span className="text-xs text-muted hidden sm:inline">
            {t('hospitalDetail.updatedAgo', { seconds: secondsAgo })}
          </span>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-[32px] ll-glass-strong">
        <div
          className="pointer-events-none absolute -top-24 left-[15%] w-72 h-72 rounded-full opacity-70"
          style={{ background: 'radial-gradient(circle, rgba(240,180,138,0.5), transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute -bottom-28 right-[0%] w-80 h-80 rounded-full opacity-55"
          style={{ background: 'radial-gradient(circle, rgba(158,212,184,0.55), transparent 70%)' }}
        />

        <div className="relative z-10 p-5 sm:p-7">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/70 text-muted border border-white/80">
                  {registrationNo}
                </span>
                <Chip variant="neutral" icon={<Star className="w-3 h-3 text-orange fill-orange" />}>
                  {ratingAvg.toFixed(1)}
                </Chip>
                <Chip variant="neutral">{String(hospitalType).replace(/_/g, ' ')}</Chip>
                {emergency24x7 && (
                  <Chip variant="blue" icon={<ShieldCheck className="w-3 h-3" />}>
                    24×7 Emergency
                  </Chip>
                )}
                {traumaLevel > 0 && <Chip variant="orange">Trauma L{traumaLevel}</Chip>}
              </div>

              <h1 className="font-display text-3xl sm:text-[2.35rem] font-bold text-ink tracking-tight leading-[1.05]">
                {hospital.name}
              </h1>

              <p className="text-sm text-muted flex items-start gap-1.5 max-w-xl">
                <MapPin className="w-4 h-4 text-red shrink-0 mt-0.5" />
                <span>
                  {hospital.address}
                  {hospital.city ? `, ${hospital.city}` : ''}
                  {hospital.pin ? ` · ${hospital.pin}` : ''}
                </span>
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setIsRequestModalOpen(true)}
                  className="font-bold shadow-soft"
                >
                  Request bed
                </Button>
                <a
                  href={`tel:${hospital.phone}`}
                  className="h-11 px-5 rounded-full bg-ink text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-ink-light transition"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="h-11 px-5 rounded-full ll-glass border border-white/70 text-sm font-semibold text-ink inline-flex items-center gap-2 hover:bg-white/70 transition"
                >
                  <Navigation className="w-4 h-4" />
                  Directions
                </a>
              </div>
            </div>

            <div className="lg:col-span-5">
              {photoUrl ? (
                <div className="rounded-[28px] overflow-hidden border border-white/70 shadow-soft aspect-[16/10] bg-white/40">
                  <img src={photoUrl} alt={hospital.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="rounded-[28px] border border-white/70 bg-[#EEF8D8]/80 aspect-[16/10] flex items-center justify-center">
                  <div className="text-center">
                    <Building2 className="w-10 h-10 text-[#0B3D1A] mx-auto mb-2" />
                    <p className="text-sm font-semibold text-[#0B3D1A]">Verified facility</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Beds free now',
            value: isBedsLoading ? '—' : String(freeBedsTotal),
            hint: `${totalBedsCount} total`,
            tone: 'bg-[#EEF8D8]',
          },
          {
            label: 'Equipment ready',
            value: String(equipmentSummary.AVAILABLE),
            hint: `${equipment.length} units`,
            tone: 'bg-[#E8F4FF]',
          },
          {
            label: 'Specialties',
            value: String(specialties.length || '—'),
            hint: 'clinical',
            tone: 'bg-[#FFF1C2]',
          },
          {
            label: 'Insurance plans',
            value: String(insuranceNetwork.length),
            hint: insuranceNetwork.some((n) => n.cashless) ? 'cashless' : 'listed',
            tone: 'bg-[#F3E8FF]',
          },
        ].map((s) => (
          <article key={s.label} className={`rounded-[24px] ${s.tone} border border-black/[0.04] p-4 sm:p-5 shadow-soft`}>
            <p className="text-xs text-muted">{s.label}</p>
            <div className="mt-2 flex items-end justify-between gap-2">
              <p className="font-display text-2xl sm:text-3xl font-bold text-ink tabular-nums tracking-tight">
                {s.value}
              </p>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-ink text-white">
                {s.hint}
              </span>
            </div>
          </article>
        ))}
      </div>

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview', icon: <Building2 className="w-4 h-4" /> },
          { id: 'beds', label: t('hospitalDetail.tabs.beds'), icon: <BedDouble className="w-4 h-4" />, badge: freeBedsTotal },
          {
            id: 'equipment',
            label: t('hospitalDetail.tabs.equipment'),
            icon: <Activity className="w-4 h-4" />,
            badge: equipment.length,
          },
        ]}
        activeTab={activeTab}
        onChange={(val) => setActiveTab(val as typeof activeTab)}
      />

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-4 animate-in fade-in">
          <Card variant="surface" className="p-5 border border-hairline/80 shadow-soft space-y-5">
            <div>
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 inline-flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5" />
                Clinical specialties
              </h4>
              {specialties.length === 0 ? (
                <p className="text-sm text-muted">No specialties listed yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {specialties.map((s) => (
                    <Chip key={s} variant="neutral">
                      {s}
                    </Chip>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-hairline/60">
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Facilities
              </h4>
              {facilities.length === 0 ? (
                <p className="text-sm text-muted">Facilities will appear once published by the hospital.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {facilities.map((f) => (
                    <span
                      key={f}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#F4F7F2] border border-[#D8E0D4] text-ink"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-hairline/60">
              <div className="rounded-2xl bg-[#F4F7F2] px-3.5 py-3 flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-muted shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Phone</p>
                  <a href={`tel:${hospital.phone}`} className="text-sm font-bold text-ink hover:underline truncate block">
                    {hospital.phone || '—'}
                  </a>
                </div>
              </div>
              <div className="rounded-2xl bg-[#F4F7F2] px-3.5 py-3 flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-muted shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Email</p>
                  <a
                    href={`mailto:${hospital.email}`}
                    className="text-sm font-bold text-ink hover:underline truncate block"
                  >
                    {hospital.email || '—'}
                  </a>
                </div>
              </div>
            </div>
          </Card>

          <Card variant="surface" className="p-5 border border-hairline/80 shadow-soft space-y-3">
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Accepted insurance & benefits
            </h4>
            {insuranceNetwork.length === 0 ? (
              <p className="text-sm text-muted">Hospital has not published an insurance network yet.</p>
            ) : (
              <ul className="space-y-3">
                {insuranceNetwork.map((n) => (
                  <li
                    key={n.insurerId}
                    className="rounded-2xl bg-[#F4F7F2] border border-[#D8E0D4] px-3.5 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-ink">{n.name}</p>
                        <p className="text-[11px] text-muted mt-0.5">
                          {n.planLabel || n.type}
                          {n.cashless ? ' · Cashless' : ''}
                          {n.discountPercent > 0 ? ` · up to ${n.discountPercent}% package benefit` : ''}
                        </p>
                      </div>
                    </div>
                    {n.benefits?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {n.benefits.map((b) => (
                          <span
                            key={b}
                            className="text-[10px] font-bold px-2 py-1 rounded-full bg-white border border-[#D8E0D4] text-ink"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Equipment snapshot on overview */}
          <Card variant="surface" className="p-5 border border-hairline/80 shadow-soft">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider inline-flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5" /> Equipment snapshot
              </h4>
              <button
                type="button"
                onClick={() => setActiveTab('equipment')}
                className="text-xs font-bold text-ink hover:underline"
              >
                View all →
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  ['Available', equipmentSummary.AVAILABLE, 'text-green'],
                  ['In use', equipmentSummary.IN_USE, 'text-blue'],
                  ['Maintenance', equipmentSummary.MAINTENANCE, 'text-orange'],
                  ['Offline', equipmentSummary.OFFLINE, 'text-red'],
                ] as const
              ).map(([label, count, tone]) => (
                <div key={label} className="rounded-2xl bg-[#F4F7F2] px-3 py-3 text-center">
                  <p className={`font-display text-2xl font-bold tabular-nums ${tone}`}>{count}</p>
                  <p className="text-[11px] text-muted font-semibold mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* BEDS */}
      {activeTab === 'beds' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {isBedsLoading && beds.length === 0 ? (
              <>
                <Skeleton variant="card" className="h-40 rounded-2xl" />
                <Skeleton variant="card" className="h-40 rounded-2xl" />
                <Skeleton variant="card" className="h-40 rounded-2xl" />
              </>
            ) : beds.length === 0 ? (
              <Card variant="surface" className="p-6 text-center border border-hairline/80 col-span-full">
                <p className="text-sm text-muted">No ward inventory published for this hospital yet.</p>
              </Card>
            ) : (
              beds.map((w) => {
                const isPulsing = pulseWard === w.wardType;
                const isSelected = selectedWardForForecast === w.wardType;
                const freeColor = w.free > 2 ? 'text-green' : w.free > 0 ? 'text-orange' : 'text-red';
                const dotColor = w.free > 2 ? 'green' : w.free > 0 ? 'orange' : 'red';

                return (
                  <button
                    type="button"
                    key={w.wardType}
                    onClick={() => setSelectedWardForForecast(w.wardType)}
                    className={`p-4 bg-white rounded-2xl border transition-all text-left ${
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
                      <span
                        className={`font-display font-extrabold text-3xl ${freeColor} ${
                          isPulsing ? 'animate-number-pulse' : ''
                        }`}
                      >
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
                      (wardForecast?.horizons?.h3 || wardForecast?.horizons?.['3h']) &&
                      (() => {
                        const p =
                          wardForecast.horizons.h3?.probabilityAtLeastOneFree ??
                          wardForecast.horizons['3h']?.probabilityAtLeastOneFree ??
                          0;
                        return (
                          <div className="mt-2 pt-2 border-t border-hairline/40 text-[11px]">
                            <span className="text-muted">Chance free in ~3 hrs: </span>
                            <span className="font-extrabold text-ink">{Math.round(p * 100)}%</span>
                            <span className="text-muted">
                              {' '}
                              ({p >= 0.7 ? 'Likely' : p >= 0.4 ? 'Possible' : 'Unlikely'})
                            </span>
                          </div>
                        );
                      })()}
                  </button>
                );
              })
            )}
          </div>

          {wardForecast && <ForecastChart forecast={wardForecast} />}
        </div>
      )}

      {/* EQUIPMENT */}
      {activeTab === 'equipment' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['ALL', equipment.length, 'All'],
                ['AVAILABLE', equipmentSummary.AVAILABLE, 'Available'],
                ['IN_USE', equipmentSummary.IN_USE, 'In use'],
                ['MAINTENANCE', equipmentSummary.MAINTENANCE, 'Maintenance'],
                ['OFFLINE', equipmentSummary.OFFLINE, 'Offline'],
              ] as const
            ).map(([key, count, label]) => {
              const active = equipmentFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setEquipmentFilter(key)}
                  className={`h-9 px-3.5 rounded-full text-xs font-bold border transition ${
                    active
                      ? 'bg-ink text-white border-ink'
                      : 'bg-white/70 text-muted border-hairline hover:text-ink hover:border-ink/30'
                  }`}
                >
                  {label} · {count}
                </button>
              );
            })}
          </div>

          {isEqLoading ? (
            <Skeleton variant="card" className="h-48 rounded-[24px]" />
          ) : equipment.length === 0 ? (
            <Card variant="surface" className="p-8 text-center border border-hairline/80">
              <Activity className="w-8 h-8 text-muted mx-auto mb-3" />
              <p className="text-sm font-semibold text-ink mb-1">No equipment registered</p>
              <p className="text-xs text-muted">This hospital has not published diagnostic or critical-care units yet.</p>
            </Card>
          ) : filteredEquipment.length === 0 ? (
            <Card variant="surface" className="p-6 text-center border border-hairline/80">
              <p className="text-sm text-muted">No units match this filter.</p>
            </Card>
          ) : (
            equipmentByType.map(([type, items]) => (
              <Card key={type} variant="surface" className="p-0 overflow-hidden border border-hairline/80 shadow-soft">
                <div className="p-4 border-b border-hairline/60 bg-[#F0FBE4]/50 flex items-center justify-between gap-3">
                  <h3 className="font-display font-bold text-base text-[#0B3D1A]">
                    {type.replace(/_/g, ' ')}
                  </h3>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white border border-[#D8E0D4] text-[#0B3D1A]">
                    {items.length} unit{items.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="divide-y divide-hairline/60">
                  {items.map((eq) => (
                    <div key={eq.id} className="p-4 flex items-start sm:items-center justify-between gap-4">
                      <div className="min-w-0">
                        <span className="font-bold text-sm text-ink block truncate">{eq.name}</span>
                        <span className="text-xs text-muted block mt-0.5">
                          {eq.model ? `${eq.model} · ` : ''}
                          Criticality: {eq.criticality}
                          {eq.serialNo ? ` · #${eq.serialNo.slice(-6)}` : ''}
                        </span>
                        {eq.updatedAt && (
                          <span className="text-[10px] text-muted block mt-1">
                            Updated {new Date(eq.updatedAt).toLocaleString()}
                          </span>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <Chip variant={STATUS_CHIP[eq.status]} dot>
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
