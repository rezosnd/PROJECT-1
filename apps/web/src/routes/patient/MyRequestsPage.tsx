import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { bedsApi, BedRequest, BedRequestStatus } from '../../lib/api/beds.api';
import { referralsApi, PatientReferral } from '../../lib/api/referrals.api';
import { bloodApi, BloodRequest } from '../../lib/api/blood.api';
import { useAuthStore } from '../../lib/auth/auth-store';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  Clock,
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  BedDouble,
  XCircle,
  Timer,
  Stethoscope,
  Droplets,
} from 'lucide-react';

function hospitalLabel(r: { hospitalName?: string | null; hospitalId?: string }) {
  if (r.hospitalName) return r.hospitalName;
  if (r.hospitalId) return `Hospital · ${String(r.hospitalId).slice(0, 8)}`;
  return 'Hospital';
}

const STATUS_META: Record<
  BedRequestStatus,
  { label: string; tone: string; chip: string; icon: React.ElementType }
> = {
  APPROVED: {
    label: 'Reserved',
    tone: 'text-[#3F7A1E]',
    chip: 'bg-[#A8E017]/25 text-[#0B3D1A] border-[#A8E017]/40',
    icon: CheckCircle2,
  },
  PENDING: {
    label: 'Awaiting',
    tone: 'text-orange',
    chip: 'bg-amber-50/90 text-amber-900 border-amber-200/70',
    icon: Timer,
  },
  REJECTED: {
    label: 'Declined',
    tone: 'text-red',
    chip: 'bg-red-50/90 text-red-700 border-red-200/70',
    icon: XCircle,
  },
  ADMITTED: {
    label: 'Admitted',
    tone: 'text-[#0B3D1A]',
    chip: 'bg-[#0B3D1A]/10 text-[#0B3D1A] border-[#0B3D1A]/15',
    icon: CheckCircle2,
  },
  DISCHARGED: {
    label: 'Left hospital',
    tone: 'text-sky-800',
    chip: 'bg-sky-50 text-sky-800 border-sky-200',
    icon: CheckCircle2,
  },
  EXPIRED: {
    label: 'Expired',
    tone: 'text-muted',
    chip: 'bg-white/60 text-muted border-white/70',
    icon: AlertCircle,
  },
  CANCELLED: {
    label: 'Cancelled',
    tone: 'text-muted',
    chip: 'bg-white/60 text-muted border-white/70',
    icon: XCircle,
  },
};

function HoldCountdown({ expiresAt }: { expiresAt: string | undefined }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;

    const tick = () => {
      const diffSec = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      if (diffSec <= 0) {
        setTimeLeft('0:00');
        setExpired(true);
        return;
      }
      setExpired(false);
      const mins = Math.floor(diffSec / 60);
      const secs = diffSec % 60;
      setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border ${
        expired
          ? 'bg-red-50/90 text-red-700 border-red-200/70'
          : 'bg-[#0B3D1A]/90 text-[#A8E017] border-white/15'
      }`}
    >
      <Clock className={`w-3.5 h-3.5 ${expired ? '' : 'animate-pulse'}`} />
      {expired ? (
        <span>Hold expired</span>
      ) : (
        <span>
          Expires <span className="font-mono tabular-nums">{timeLeft}</span>
        </span>
      )}
    </div>
  );
}

function statusMessage(r: BedRequest) {
  switch (r.status) {
    case 'APPROVED':
      return 'Bed reserved — arrive within 15 minutes while the hold is active.';
    case 'PENDING':
      return 'Request received — ward staff are reviewing your hold.';
    case 'ADMITTED':
      return 'Patient admitted. Hospital can mark leave when you go.';
    case 'DISCHARGED':
      return 'You left the hospital — your bed was released back to the ward.';
    case 'REJECTED':
      return 'Hospital declined this request. Try another ward or facility.';
    case 'EXPIRED':
      return 'Hold window ended without admission.';
    default:
      return `Request ${String(r.status).toLowerCase()}.`;
  }
}

export const MyRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['my-bed-requests'],
    queryFn: () => bedsApi.getMyRequests(),
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });

  const { data: bloodRequests = [], isLoading: loadingBlood } = useQuery({
    queryKey: ['my-blood-requests'],
    queryFn: () => bloodApi.myRequests(),
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });

  const { data: referrals = [], isLoading: loadingReferrals } = useQuery({
    queryKey: ['my-referrals'],
    queryFn: () => referralsApi.listMine(),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const { active, history } = useMemo(() => {
    const activeStatuses: BedRequestStatus[] = ['PENDING', 'APPROVED'];
    return {
      active: requests.filter((r) => activeStatuses.includes(r.status)),
      history: requests.filter((r) => !activeStatuses.includes(r.status)),
    };
  }, [requests]);

  if (!isAuthenticated) {
    return (
      <EmptyState
        title="Sign in required"
        description="Sign in with Google to track live bed holds."
        actionLabel="Sign in"
        onAction={() => navigate('/login')}
      />
    );
  }

  const renderCard = (r: BedRequest) => {
    const meta = STATUS_META[r.status] || STATUS_META.EXPIRED;
    const StatusIcon = meta.icon;
    return (
      <article
        key={r.id}
        className="relative overflow-hidden rounded-[24px] ll-glass-strong border border-white/60 p-4 sm:p-5 shadow-[0_10px_32px_rgba(11,61,26,0.06)]"
      >
        <div
          className="pointer-events-none absolute -top-12 -right-10 w-32 h-32 rounded-full opacity-35"
          style={{
            background:
              r.status === 'APPROVED'
                ? 'radial-gradient(circle, rgba(168,224,23,0.45), transparent 70%)'
                : 'radial-gradient(circle, rgba(11,61,26,0.1), transparent 70%)',
          }}
        />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0 flex items-start gap-3">
            <span className="w-11 h-11 rounded-2xl ll-glass-dark border border-white/15 flex items-center justify-center shrink-0">
              <BedDouble className="w-5 h-5 text-[#A8E017]" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-bold text-base text-ink tracking-tight">
                  {r.wardType} bed
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${meta.chip}`}
                >
                  <StatusIcon className="w-3 h-3" />
                  {meta.label}
                </span>
              </div>
              <p className="text-xs text-muted mt-1 flex items-center gap-1.5 min-w-0">
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{hospitalLabel(r)}</span>
              </p>
              <p className="text-[11px] text-muted/90 mt-0.5">
                Requested{' '}
                {new Date(r.createdAt).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          {r.status === 'APPROVED' && <HoldCountdown expiresAt={r.holdExpiresAt} />}
        </div>

        <div
          className={`relative mt-3.5 rounded-2xl px-3.5 py-3 text-xs leading-relaxed border flex items-start gap-2 ${
            r.status === 'APPROVED'
              ? 'bg-[#A8E017]/15 border-[#A8E017]/30 text-[#0B3D1A]'
              : r.status === 'PENDING'
                ? 'bg-amber-50/70 border-amber-200/60 text-amber-950'
                : 'bg-white/45 border-white/55 text-ink/80'
          }`}
        >
          <StatusIcon className={`w-4 h-4 shrink-0 mt-0.5 ${meta.tone}`} />
          <span>{statusMessage(r)}</span>
        </div>

        {r.shareAbha && (
          <div className="relative mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#3F7A1E]">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            ABHA shared with triage
          </div>
        )}
      </article>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 sm:space-y-6 text-left pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            My bed requests
          </h1>
          <p className="text-sm text-muted mt-1">
            Live holds and 15-minute expiry countdown.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/results')}
          className="h-10 px-4 rounded-2xl bg-[#0B3D1A]/92 text-[#A8E017] text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#0B3D1A] transition border border-white/15"
        >
          Find beds
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton variant="card" className="h-36 rounded-[24px]" />
          <Skeleton variant="card" className="h-36 rounded-[24px]" />
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-[28px] ll-glass-strong border border-white/60 p-8 text-center">
          <EmptyState
            title="No requests yet"
            description="Search nearby hospitals and place a 15-minute bed hold."
            actionLabel="Find emergency beds"
            onAction={() => navigate('/results')}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A8E017] animate-pulse" />
                <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B3D1A]">
                  Active · {active.length}
                </h2>
              </div>
              {active.map(renderCard)}
            </section>
          )}

          {history.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                History · {history.length}
              </h2>
              {history.map(renderCard)}
            </section>
          )}
        </div>
      )}

      <BloodHoldsSection requests={bloodRequests} loading={loadingBlood} />
      <ReferralsSection referrals={referrals} loading={loadingReferrals} />
    </div>
  );
};

function BloodHoldsSection({
  requests,
  loading,
}: {
  requests: BloodRequest[];
  loading: boolean;
}) {
  const navigate = useNavigate();
  if (loading) {
    return (
      <section className="space-y-3 pt-2">
        <Skeleton variant="card" className="h-24 rounded-[24px]" />
      </section>
    );
  }
  return (
    <section className="space-y-3 pt-4 border-t border-black/[0.06]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B3D1A] flex items-center gap-2">
          <Droplets className="w-3.5 h-3.5" />
          Blood holds · {requests.length}
        </h2>
        <button
          type="button"
          onClick={() => navigate('/blood')}
          className="text-xs font-bold text-[#0B3D1A]"
        >
          Find blood
        </button>
      </div>
      {!requests.length ? (
        <p className="text-xs text-muted">No blood holds yet. Reserve units at a hospital blood bank.</p>
      ) : (
        requests.map((r) => (
          <article
            key={r.id}
            className="rounded-[20px] ll-glass border border-white/60 px-4 py-3.5 text-left"
          >
            <p className="text-sm font-bold text-ink">
              {r.unitsRequested}× {r.bloodGroup} {r.component}
            </p>
            <p className="text-xs text-muted mt-1">
              {r.hospitalName || 'Blood bank'} · {r.status}
              {r.holdExpiresAt && (r.status === 'PENDING' || r.status === 'APPROVED')
                ? ' · 30-min hold'
                : ''}
            </p>
          </article>
        ))
      )}
    </section>
  );
}

function ReferralsSection({
  referrals,
  loading,
}: {
  referrals: PatientReferral[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <section className="space-y-3 pt-2">
        <Skeleton variant="card" className="h-24 rounded-[24px]" />
      </section>
    );
  }

  if (!referrals.length) return null;

  return (
    <section className="space-y-3 pt-4 border-t border-black/[0.06]">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B3D1A] flex items-center gap-2">
        <Stethoscope className="w-3.5 h-3.5" />
        Doctor referrals · {referrals.length}
      </h2>
      <p className="text-xs text-muted -mt-1">
        Created when a doctor scans your Care QR in the Doctor app.
      </p>
      {referrals.map((ref) => (
        <article
          key={ref.id}
          className="rounded-[20px] ll-glass border border-white/60 px-4 py-3.5 text-left"
        >
          <p className="text-sm font-bold text-ink">
            {ref.toHospitalName || 'Hospital referral'}
            {ref.recommendedWard ? ` · ${ref.recommendedWard}` : ''}
          </p>
          <p className="text-xs text-muted mt-1">
            Dr. {ref.doctorName || '—'}
            {ref.doctorSpecialty ? ` (${ref.doctorSpecialty})` : ''}
            {ref.toDepartmentName ? ` → ${ref.toDepartmentName}` : ''}
          </p>
          <p className="text-[11px] text-muted mt-1">
            {ref.status}
            {' · '}
            {new Date(ref.createdAt).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
            {ref.bedRequestId ? ' · bed hold linked' : ''}
          </p>
        </article>
      ))}
    </section>
  );
}
