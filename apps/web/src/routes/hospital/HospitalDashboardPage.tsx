import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';
import { useLiveBeds } from '../../hooks/useLiveBeds';
import { useElapsedTime } from '../../hooks/useElapsedTime';
import { WardAdjustCard } from '../../features/hospital/WardAdjustCard';
import { RequestQueueTable } from '../../features/hospital/RequestQueueTable';
import { EquipmentManagerTable } from '../../features/hospital/EquipmentManagerTable';
import { ShortcutsModal } from '../../features/hospital/ShortcutsModal';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
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
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultHospitalId = import.meta.env.VITE_USE_MOCKS === 'true' ? 'hosp-001' : '3256d42a-2dfe-4e1f-9d9d-867997d53d2a';
  const hospitalId = user?.hospitalId || defaultHospitalId;
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

  // Live beds hook with tenant isolation
  const { data: beds = [], isLive, lastUpdated, pulseWard, refetch: refreshBeds } = useLiveBeds(hospitalId);
  const updatedAgo = useElapsedTime(lastUpdated);

  // Hospital details query
  const { data: hospital } = useQuery({
    queryKey: ['hospital', hospitalId],
    queryFn: () => hospitalsApi.getHospitalById(hospitalId),
    staleTime: 60_000,
  });

  // Bed Request Queue query
  const { data: queue = [], refetch: refetchQueue } = useQuery({
    queryKey: ['hospital-queue', hospitalId],
    queryFn: () => bedsApi.getHospitalQueue(hospitalId),
    staleTime: 10_000,
  });

  // Equipment query
  const { data: equipment = [], refetch: refetchEquipment } = useQuery({
    queryKey: ['hospital-equipment', hospitalId],
    queryFn: () => equipmentApi.getHospitalEquipment(hospitalId),
    staleTime: 10_000,
  });

  // Ward forecast query
  const { data: forecastData } = useQuery({
    queryKey: ['forecast', hospitalId, 'ICU'],
    queryFn: () => forecastApi.getWardForecast(hospitalId, 'ICU'),
    staleTime: 30_000,
  });

  // Real-time synchronization: listen for new patient bed requests and admissions
  useEffect(() => {
    if (!hospitalId) return;
    const unsub = socketManager.on('request:update', (payload) => {
      if (!payload || payload.hospitalId === hospitalId) {
        refetchQueue();
        refreshBeds();
      }
    });
    return unsub;
  }, [hospitalId, refetchQueue, refreshBeds]);

  // Global keyboard shortcut listener for '?'
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
  const totalFree = beds.reduce((sum, b) => sum + Math.max(0, b.total - (b.occupied + b.reserved + b.cleaning + b.maintenance)), 0);
  const occupancyRate = totalBeds > 0 ? Math.round((totalOccupied / totalBeds) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Hospital Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-hairline shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-heading text-ink">
              {hospital?.name || 'Hospital Operations Dashboard'}
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue/10 text-blue font-mono font-medium">
              ID: {hospitalId}
            </span>
          </div>
          <p className="text-sm text-muted mt-1 flex items-center gap-2">
            <span>{hospital?.address || 'Bhubaneswar, Odisha'}</span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <StatusDot color={isLive ? 'green' : 'orange'} size="sm" pulse={isLive} />
              {isLive ? 'Real-time telemetry connected' : 'Connecting to live updates...'}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs text-muted block">Live Sync</span>
            <span className="text-xs font-mono font-medium text-ink flex items-center gap-1">
              <Clock className="w-3 h-3 text-muted" /> {updatedAgo}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => refreshBeds()}
            leftIcon={<RefreshCw className="w-4 h-4" />}
            title="Force refresh data"
          >
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShortcuts(true)}
            leftIcon={<HelpCircle className="w-4 h-4" />}
          >
            Shortcuts (?)
          </Button>
        </div>
      </div>

      {/* Quick Summary Metrics — plain language for staff */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white">
          <div className="text-xs font-medium text-muted uppercase tracking-wider">Total Beds</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-heading text-ink">{totalBeds}</span>
            <BedDouble className="w-5 h-5 text-muted opacity-50" />
          </div>
          <div className="mt-1 text-xs text-muted">All configured beds in this hospital</div>
        </Card>

        <Card className="p-4 bg-white">
          <div className="text-xs font-medium text-muted uppercase tracking-wider">Patients in Beds</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-heading text-navy">{totalOccupied}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-ink">
              {occupancyRate}% full
            </span>
          </div>
          <div className="mt-1 text-xs text-muted">Currently occupied by patients</div>
        </Card>

        <Card className="p-4 bg-white border-green/20">
          <div className="text-xs font-medium text-muted uppercase tracking-wider">Beds Free Now</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-heading text-green">{totalFree}</span>
            <StatusDot color="green" size="sm" />
          </div>
          <div className="mt-1 text-xs text-muted">
            {totalFree > 0 ? 'Ready for new patients right now' : 'No free beds — triage queue carefully'}
          </div>
        </Card>

        <Card className="p-4 bg-white">
          <div className="text-xs font-medium text-muted uppercase tracking-wider">Freeing in ~3 Hours</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-heading text-teal">
              +{forecastData?.horizons?.h3?.expectedFree ?? 4}
            </span>
            <Activity className="w-5 h-5 text-teal opacity-50" />
          </div>
          <div className="mt-1 text-xs text-muted">Expected discharges opening beds</div>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-hairline">
        <Tabs
          tabs={[
            { id: 'wards', label: 'Wards & Bed Adjustments', icon: <BedDouble className="w-4 h-4" /> },
            { id: 'queue', label: 'Bed Request Queue (15m Holds)', icon: <Clock className="w-4 h-4" /> },
            { id: 'equipment', label: 'Equipment & Diagnostics', icon: <Stethoscope className="w-4 h-4" /> },
            { id: 'forecast', label: 'Expected Discharges & Surge', icon: <Activity className="w-4 h-4" /> },
            ...(canManageStaff
              ? [{ id: 'staff', label: 'Staff & Admins', icon: <UserPlus className="w-4 h-4" /> }]
              : []),
          ]}
          activeTab={activeTab}
          onChange={(tab) => changeTab(tab as HospitalTab)}
        />
      </div>

      {/* Tab Contents */}
      {activeTab === 'wards' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-heading text-ink">Ward Bed Counters</h2>
              <p className="text-xs text-muted">
                Changes update in-memory telemetry immediately and sync with central registry.
              </p>
            </div>
            <div className="text-xs text-muted flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green" /> Free (derived)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-navy" /> Occupied
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange" /> Reserved / Cleaning
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {beds.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted bg-white rounded-2xl border border-dashed border-hairline">
                No ward telemetry records found for this hospital.
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
        </div>
      )}

      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-heading text-ink">Incoming Bed Reservation Requests</h2>
              <p className="text-xs text-muted">
                Patient reservations hold a 15-minute freeze on inventory before automatically expiring.
              </p>
            </div>
          </div>
          <RequestQueueTable
            requests={queue}
            onDecided={() => {
              refetchQueue();
              refreshBeds();
            }}
          />
        </div>
      )}

      {activeTab === 'equipment' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-heading text-ink">Diagnostic & Critical Equipment</h2>
              <p className="text-xs text-muted">
                Manage operational readiness of key equipment (MRI, CT, Ventilator, Dialysis, Incubator, OT).
              </p>
            </div>
          </div>
          <EquipmentManagerTable
            hospitalId={hospitalId}
            equipment={equipment}
            onUpdated={() => refetchEquipment()}
          />
        </div>
      )}

      {activeTab === 'forecast' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-heading text-ink">Discharge Forecaster & Inflow Rate</h2>
              <p className="text-xs text-muted">
                Poisson arrival prediction model for next 1h, 3h, and 6h intervals.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-5 bg-white border border-hairline">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Next 1 Hour (+1h)</span>
              <div className="mt-3">
                <span className="text-3xl font-bold font-heading text-ink">
                  +{forecastData?.horizons?.h1?.expectedFree ?? 2}
                </span>
                <span className="text-sm text-muted ml-2">beds expected free</span>
              </div>
              <div className="mt-3 text-xs text-muted bg-slate-50 p-2.5 rounded-lg border border-hairline">
                Confidence: <strong className="text-ink">{forecastData?.horizons?.h1?.confidence ?? 'HIGH'}</strong> based on scheduled morning rounds.
              </div>
            </Card>

            <Card className="p-5 bg-white border border-hairline">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Next 3 Hours (+3h)</span>
              <div className="mt-3">
                <span className="text-3xl font-bold font-heading text-ink">
                  +{forecastData?.horizons?.h3?.expectedFree ?? 5}
                </span>
                <span className="text-sm text-muted ml-2">beds expected free</span>
              </div>
              <div className="mt-3 text-xs text-muted bg-slate-50 p-2.5 rounded-lg border border-hairline">
                Confidence: <strong className="text-ink">{forecastData?.horizons?.h3?.confidence ?? 'MEDIUM'}</strong> factoring post-op stepdowns.
              </div>
            </Card>

            <Card className="p-5 bg-white border border-hairline">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Next 6 Hours (+6h)</span>
              <div className="mt-3">
                <span className="text-3xl font-bold font-heading text-ink">
                  +{forecastData?.horizons?.h6?.expectedFree ?? 9}
                </span>
                <span className="text-sm text-muted ml-2">beds expected free</span>
              </div>
              <div className="mt-3 text-xs text-muted bg-slate-50 p-2.5 rounded-lg border border-hairline">
                Confidence: <strong className="text-ink">{forecastData?.horizons?.h6?.confidence ?? 'LOW'}</strong> evening discharge wave.
              </div>
            </Card>
          </div>

          <Card className="p-5 bg-white">
            <h3 className="text-sm font-bold text-ink mb-2">Clinical Triage Note</h3>
            <p className="text-sm text-muted leading-relaxed">
              Discharge prediction is derived from historical admission duration distributions and daily physician rounding windows.
              In emergencies where critical bed demand surges, contact the City Health Command Center or divert triage via LifeLink dispatch.
            </p>
          </Card>
        </div>
      )}

      {activeTab === 'staff' && canManageStaff && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold font-heading text-ink">Hospital staff & admin access</h2>
            <p className="text-xs text-muted">
              Pre-register Gmail accounts for ward staff or hospital admins. They receive the role on first Google sign-in (web).
            </p>
          </div>
          <StaffPreRegForm
            hospitals={
              hospital
                ? [{ ...(hospital as any), id: hospitalId, name: hospital.name }]
                : [{ id: hospitalId, name: 'Your hospital' } as any]
            }
          />
        </div>
      )}

      {/* Keyboard Shortcuts Dialog */}
      <ShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
};
