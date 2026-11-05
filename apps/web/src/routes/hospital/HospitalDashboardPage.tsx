import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';
import { useLiveBeds } from '../../hooks/useLiveBeds';
import { useElapsedTime } from '../../hooks/useElapsedTime';
import { WardAdjustCard } from '../../features/hospital/WardAdjustCard';
import { RequestQueueTable } from '../../features/hospital/RequestQueueTable';
import { EquipmentManagerTable } from '../../features/hospital/EquipmentManagerTable';
import { ShortcutsModal } from '../../features/hospital/ShortcutsModal';
import { StatusDot } from '../../components/ui/StatusDot';
import { Activity, RefreshCw, HelpCircle, BedDouble, Stethoscope, Clock, UserPlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { hospitalsApi } from '../../lib/api/hospitals.api';
import { forecastApi } from '../../lib/api/forecast.api';
import { bedsApi } from '../../lib/api/beds.api';
import { equipmentApi } from '../../lib/api/equipment.api';
import { socketManager } from '../../lib/socket/socket-client';
import { StaffPreRegForm } from '../../features/admin/StaffPreRegForm';

type HospitalTab = 'wards' | 'queue' | 'equipment' | 'forecast' | 'staff';

export const HospitalDashboardPage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultHospitalId =
    import.meta.env.VITE_USE_MOCKS === 'true' ? 'hosp-001' : '3256d42a-2dfe-4e1f-9d9d-867997d53d2a';
  const hospitalId = user?.hospitalId || defaultHospitalId;
  const sessionReady = Boolean(isAuthenticated && !isLoading && hospitalId);
  const tabFromUrl = (searchParams.get('tab') as HospitalTab) || 'wards';
  const [activeTab, setActiveTab] = useState<HospitalTab>(tabFromUrl);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const canManageStaff = user?.role === 'HOSPITAL_ADMIN' || user?.role === 'CITY_ADMIN';

  useEffect(() => {
    const t = (searchParams.get('tab') as HospitalTab) || 'wards';
    if (t !== activeTab) setActiveTab(t);
  }, [searchParams]);

  const changeTab = (tab: HospitalTab) => {
    setActiveTab(tab);
    if (tab === 'wards') setSearchParams({});
    else setSearchParams({ tab });
  };

  const { data: beds = [], isLive, lastUpdated, pulseWard, refetch: refreshBeds } =
    useLiveBeds(sessionReady ? hospitalId : undefined);
  const updatedAgo = useElapsedTime(lastUpdated);

  const { data: hospital } = useQuery({
    queryKey: ['hospital', hospitalId],
    queryFn: () => hospitalsApi.getHospitalById(hospitalId),
    staleTime: 60_000,
    enabled: sessionReady,
  });

  const { data: queue = [], refetch: refetchQueue } = useQuery({
    queryKey: ['hospital-queue', hospitalId],
    queryFn: () => bedsApi.getHospitalQueue(hospitalId),
    staleTime: 0,
    refetchInterval: sessionReady ? 750 : false,
    refetchOnWindowFocus: sessionReady,
    refetchIntervalInBackground: sessionReady,
    enabled: sessionReady,
  });

  const { data: equipment = [], refetch: refetchEquipment } = useQuery({
    queryKey: ['hospital-equipment', hospitalId],
    queryFn: () => equipmentApi.getHospitalEquipment(hospitalId),
    staleTime: 5_000,
    refetchInterval: sessionReady ? 5_000 : false,
    enabled: sessionReady,
  });

  const { data: forecastData } = useQuery({
    queryKey: ['forecast', hospitalId, 'ICU'],
    queryFn: () => forecastApi.getWardForecast(hospitalId, 'ICU'),
    staleTime: 30_000,
    enabled: sessionReady,
  });

  useEffect(() => {
    if (!sessionReady || !hospitalId) return;
    const unsub = socketManager.on('request:update', (payload) => {
      if (!payload || payload.hospitalId === hospitalId) {
        refetchQueue();
        refreshBeds();
      }
    });
    return unsub;
  }, [sessionReady, hospitalId, refetchQueue, refreshBeds]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const totalBeds = beds.reduce((sum, b) => sum + (b.total || 0), 0);
  const totalOccupied = beds.reduce((sum, b) => sum + (b.occupied || 0), 0);
  const totalFree = beds.reduce(
    (sum, b) =>
      sum + Math.max(0, b.total - (b.occupied + b.reserved + b.cleaning + b.maintenance)),
    0
  );
  const occupancyRate = totalBeds > 0 ? Math.round((totalOccupied / totalBeds) * 100) : 0;
  const pendingQueue = queue.filter((r: any) => r.status === 'PENDING').length;
  const expectedFree3h = forecastData?.horizons?.h3?.expectedFree ?? 0;

  const tabs: { id: HospitalTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'wards', label: 'Wards', icon: <BedDouble className="w-4.5 h-4.5" /> },
    {
      id: 'queue',
      label: 'Queue',
      icon: <Clock className="w-4.5 h-4.5" />,
      badge: pendingQueue || undefined,
    },
    { id: 'equipment', label: 'Equipment', icon: <Stethoscope className="w-4.5 h-4.5" /> },
    { id: 'forecast', label: 'Forecast', icon: <Activity className="w-4.5 h-4.5" /> },
    ...(canManageStaff
      ? [{ id: 'staff' as const, label: 'Staff', icon: <UserPlus className="w-4.5 h-4.5" /> }]
      : []),
  ];

  return (
    <div className="max-w-6xl mx-auto pb-10 text-left space-y-6">
      {/* Command header */}
      <section className="rounded-[28px] overflow-hidden border border-white/20 shadow-[0_16px_48px_rgba(11,61,26,0.18)]">
        <div className="ll-glass-dark text-white px-5 sm:px-7 py-6 sm:py-7">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand-lime)]">
                Hospital operations
              </p>
              <h1 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold tracking-tight truncate">
                {hospital?.name || 'Ward command'}
              </h1>
              <p className="mt-2 text-sm text-white/70 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="truncate max-w-[280px]">
                  {hospital?.address || 'Bhubaneswar, Odisha'}
                </span>
                <span className="text-white/30">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <StatusDot color={isLive ? 'green' : 'orange'} size="sm" pulse={isLive} />
                  {isLive ? 'Live' : 'Syncing…'}
                </span>
                <span className="text-white/30">·</span>
                <span className="font-mono text-xs text-white/60">{updatedAgo}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => refreshBeds()}
                className="h-10 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold inline-flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => setShowShortcuts(true)}
                className="h-10 px-3.5 rounded-xl bg-[var(--color-brand-lime)] text-[var(--color-brand-forest)] text-xs font-bold inline-flex items-center gap-1.5 hover:brightness-105 transition"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Shortcuts
              </button>
            </div>
          </div>

          {/* Metric strip */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden bg-white/10 border border-white/10">
            {[
              { label: 'Total beds', value: String(totalBeds), hint: 'Configured' },
              { label: 'Occupied', value: String(totalOccupied), hint: `${occupancyRate}% full` },
              {
                label: 'Free now',
                value: String(totalFree),
                hint: totalFree > 0 ? 'Ready' : 'Full',
                accent: true,
              },
              { label: '~3h free', value: `+${expectedFree3h}`, hint: 'Expected' },
            ].map((m) => (
              <div key={m.label} className="bg-[var(--color-brand-forest)]/80 px-4 py-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">{m.label}</p>
                <p
                  className={`mt-1 font-display text-2xl font-extrabold ${
                    m.accent ? 'text-[var(--color-brand-lime)]' : 'text-white'
                  }`}
                >
                  {m.value}
                </p>
                <p className="text-[11px] text-white/45 mt-0.5">{m.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <nav className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1" aria-label="Hospital sections">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => changeTab(tab.id)}
              className={`relative shrink-0 h-11 px-4 rounded-2xl text-xs font-bold inline-flex items-center gap-2 transition ${
                active
                  ? 'bg-[var(--color-brand-forest)]/90 backdrop-blur-md text-[var(--color-brand-lime)] border border-white/15 shadow-[0_8px_20px_rgba(11,61,26,0.18)]'
                  : 'll-glass text-muted border border-white/50 hover:text-ink'
              }`}
            >
              {tab.icon}
              {tab.label}
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span
                  className={`ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold inline-flex items-center justify-center ${
                    active
                      ? 'bg-[var(--color-brand-lime)] text-[var(--color-brand-forest)]'
                      : 'bg-red text-white'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {activeTab === 'wards' && (
        <section className="space-y-4">
          <div className="rounded-[24px] ll-glass border border-white/55 px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg sm:text-xl font-extrabold text-ink tracking-tight">
                Ward bed counters
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Live to the city grid — add capacity, then move beds between states.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider">
              <span className="inline-flex items-center gap-1.5 ll-glass border border-white/55 px-2.5 py-1 rounded-full text-ink">
                <span className="w-2 h-2 rounded-full bg-[#A8E017]" /> Free
              </span>
              <span className="inline-flex items-center gap-1.5 ll-glass border border-white/55 px-2.5 py-1 rounded-full text-ink">
                <span className="w-2 h-2 rounded-full bg-[#0B3D1A]" /> Occupied
              </span>
              <span className="inline-flex items-center gap-1.5 ll-glass border border-white/55 px-2.5 py-1 rounded-full text-ink">
                <span className="w-2 h-2 rounded-full bg-orange" /> Hold / clean
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
            {beds.length === 0 ? (
              <div className="col-span-full py-16 text-center text-muted rounded-[24px] ll-glass border border-dashed border-white/50">
                No ward telemetry for this hospital yet.
              </div>
            ) : (
              beds.map((ward) => (
                <WardAdjustCard
                  key={ward.wardType || (ward as any).ward_type || ward.id}
                  ward={ward}
                  hospitalId={hospitalId}
                  isPulsing={pulseWard === ward.wardType}
                  onShortcutsClick={() => setShowShortcuts(true)}
                  onUpdated={() => refreshBeds()}
                />
              ))
            )}
          </div>
        </section>
      )}

      {activeTab === 'queue' && (
        <section className="space-y-3">
          <RequestQueueTable
            requests={queue}
            onDecided={() => {
              refetchQueue();
              refreshBeds();
            }}
          />
        </section>
      )}

      {activeTab === 'equipment' && (
        <section className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">Critical equipment</h2>
            <p className="text-xs text-muted mt-0.5">
              MRI, CT, ventilators, dialysis, incubators, OT readiness.
            </p>
          </div>
          <EquipmentManagerTable
            hospitalId={hospitalId}
            equipment={equipment}
            onUpdated={() => refetchEquipment()}
          />
        </section>
      )}

      {activeTab === 'forecast' && (
        <section className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">Expected discharges</h2>
            <p className="text-xs text-muted mt-0.5">Beds likely to free in the next windows.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(
              [
                { key: 'h1', label: 'Next 1 hour', fallback: 2 },
                { key: 'h3', label: 'Next 3 hours', fallback: 5 },
                { key: 'h6', label: 'Next 6 hours', fallback: 9 },
              ] as const
            ).map(({ key, label, fallback }) => {
              const h = forecastData?.horizons?.[key];
              return (
                <div
                  key={key}
                  className="rounded-2xl ll-glass-strong border border-white/55 p-5 hover:border-[var(--color-brand-forest)]/25 transition"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
                  <p className="mt-3 font-display text-3xl font-extrabold text-ink">
                    +{h?.expectedFree ?? fallback}
                    <span className="text-sm font-semibold text-muted ml-1.5">beds</span>
                  </p>
                  <p className="mt-3 text-[11px] text-muted">
                    Confidence{' '}
                    <span className="font-bold text-ink">{h?.confidence ?? 'MEDIUM'}</span>
                  </p>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted leading-relaxed max-w-2xl">
            Forecasts use historical length-of-stay and rounding windows. During surge, escalate to
            City Command or divert via GetMyHospital dispatch.
          </p>
        </section>
      )}

      {activeTab === 'staff' && canManageStaff && (
        <section className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">Staff & admin access</h2>
            <p className="text-xs text-muted mt-0.5">
              Pre-register Gmail accounts — role applies on first Google sign-in.
            </p>
          </div>
          <StaffPreRegForm
            hospitals={
              hospital
                ? [{ ...(hospital as any), id: hospitalId, name: hospital.name }]
                : [{ id: hospitalId, name: 'Your hospital' } as any]
            }
          />
        </section>
      )}

      <ShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
};
