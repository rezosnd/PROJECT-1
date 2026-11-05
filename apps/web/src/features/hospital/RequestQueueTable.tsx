import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BedRequest, bedsApi } from '../../lib/api/beds.api';
import { useToast } from '../../components/ui/Toast';
import {
  Volume2,
  VolumeX,
  Clock,
  ShieldCheck,
  Check,
  X,
  UserCheck,
  Zap,
  Radio,
  Phone,
  Mail,
} from 'lucide-react';

function resolvePatientMobile(r: BedRequest): string | null {
  const anyR = r as any;
  return (
    anyR.patientMobile ||
    anyR.abha?.mobile ||
    anyR.patientProfile?.mobile ||
    anyR.patientProfile?.emergencyContactPhone ||
    anyR.patientProfile?.mobilePhone ||
    null
  );
}

interface RequestQueueTableProps {
  requests: BedRequest[];
  onDecided?: () => void;
  className?: string;
}

function HoldTimer({ expiresAt }: { expiresAt: string | undefined }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;
    const calc = () => {
      const diffSec = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      if (diffSec <= 0) {
        setTimeLeft('0:00');
        setExpired(true);
        return;
      }
      setExpired(false);
      const m = Math.floor(diffSec / 60);
      const s = diffSec % 60;
      setTimeLeft(`${m}:${s < 10 ? '0' : ''}${s}`);
    };
    calc();
    const interval = setInterval(calc, 250);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt) return <span className="text-muted text-xs">—</span>;

  return (
    <span
      className={`font-mono text-xs font-extrabold px-2.5 py-1 rounded-full border tabular-nums ${
        expired
          ? 'bg-red-50 text-red-700 border-red-200'
          : Number(timeLeft.split(':')[0]) < 3
            ? 'bg-amber-50 text-amber-900 border-amber-200 animate-pulse'
            : 'bg-[#0B3D1A]/90 text-[#A8E017] border-white/15'
      }`}
    >
      {expired ? 'Expired' : timeLeft}
    </span>
  );
}

const STATUS_ORDER: Record<string, number> = {
  PENDING: 0,
  APPROVED: 1,
  ADMITTED: 2,
  REJECTED: 3,
  EXPIRED: 4,
};

export const RequestQueueTable: React.FC<RequestQueueTableProps> = ({
  requests,
  onDecided,
  className = '',
}) => {
  const { addToast } = useToast();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const seenIdsRef = useRef<Set<string>>(new Set());
  const primedRef = useRef(false);

  const sorted = useMemo(() => {
    return [...requests].sort((a, b) => {
      const sa = STATUS_ORDER[a.status] ?? 9;
      const sb = STATUS_ORDER[b.status] ?? 9;
      if (sa !== sb) return sa - sb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [requests]);

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  // Flash + optional beep when brand-new requests arrive
  useEffect(() => {
    const ids = requests.map((r) => r.id);
    if (!primedRef.current) {
      seenIdsRef.current = new Set(ids);
      primedRef.current = true;
      return;
    }
    const fresh = ids.filter((id) => !seenIdsRef.current.has(id));
    if (fresh.length === 0) {
      seenIdsRef.current = new Set(ids);
      return;
    }
    setFlashIds(new Set(fresh));
    if (soundEnabled) {
      try {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        if (Ctx) {
          const ctx = new Ctx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = 880;
          gain.gain.value = 0.04;
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.12);
        }
      } catch {
        /* ignore audio errors */
      }
    }
    const t = window.setTimeout(() => setFlashIds(new Set()), 2200);
    seenIdsRef.current = new Set(ids);
    return () => window.clearTimeout(t);
  }, [requests, soundEnabled]);

  const handleDecision = async (id: string, decision: 'APPROVED' | 'REJECTED' | 'ADMITTED') => {
    setProcessingId(id);
    try {
      await bedsApi.decideBedRequest(id, decision);
      addToast({
        type: decision === 'APPROVED' ? 'success' : decision === 'ADMITTED' ? 'info' : 'warning',
        title: `Request ${decision.toLowerCase()}`,
        message: 'Patient bed request updated.',
      });
      onDecided?.();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Action failed',
        message: err.response?.data?.error?.message || 'Could not update request status',
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="rounded-[24px] ll-glass-strong border border-white/60 px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-extrabold text-base sm:text-lg text-ink tracking-tight">
              Live bed queue
            </h3>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ll-glass border border-white/55 px-2.5 py-1 rounded-full text-[#0B3D1A]">
              <Radio className="w-3 h-3 text-[#3F7A1E]" />
              Live
              <span className="w-1.5 h-1.5 rounded-full bg-[#A8E017] animate-pulse" />
            </span>
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-[#0B3D1A] text-[#A8E017]">
                <Zap className="w-3 h-3" />
                {pendingCount} new
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-1">
            Newest requests rise to the top · 15-minute hold windows
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`inline-flex items-center gap-1.5 h-10 px-3.5 rounded-2xl text-xs font-bold border transition shrink-0 ${
            soundEnabled
              ? 'bg-[#0B3D1A]/90 text-[#A8E017] border-white/15'
              : 'll-glass text-muted border-white/55'
          }`}
          title={soundEnabled ? 'Mute alerts' : 'Enable audio alerts'}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          {soundEnabled ? 'Alerts on' : 'Muted'}
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-[24px] ll-glass border border-white/55 py-14 text-center text-sm text-muted">
          No bed requests yet — queue updates live the moment a patient holds a bed.
        </div>
      ) : (
        <div className="space-y-2.5">
          {sorted.map((r) => {
            const isProcessing = processingId === r.id;
            const isNew = flashIds.has(r.id);
            const isPending = r.status === 'PENDING';
            return (
              <article
                key={r.id}
                className={`relative overflow-hidden rounded-[22px] border p-4 sm:p-4.5 transition-all ${
                  isNew
                    ? 'll-glass-strong border-[#A8E017]/50 shadow-[0_0_0_2px_rgba(168,224,23,0.35),0_12px_32px_rgba(11,61,26,0.12)]'
                    : isPending
                      ? 'll-glass-strong border-white/65 shadow-[0_10px_28px_rgba(11,61,26,0.08)]'
                      : 'll-glass border-white/55'
                }`}
              >
                {isNew && (
                  <div
                    className="pointer-events-none absolute inset-0 opacity-30"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent, rgba(168,224,23,0.35), transparent)',
                    }}
                  />
                )}

                <div className="relative flex flex-col lg:flex-row lg:items-center gap-3.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isNew && (
                        <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#A8E017] text-[#0B3D1A]">
                          New
                        </span>
                      )}
                      <h4 className="font-display font-bold text-sm sm:text-base text-ink truncate">
                        {r.patientName || 'Emergency citizen'}
                      </h4>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                          r.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : r.status === 'APPROVED'
                              ? 'bg-[#A8E017]/25 text-[#0B3D1A] border-[#A8E017]/40'
                              : r.status === 'ADMITTED'
                                ? 'bg-[#0B3D1A]/10 text-[#0B3D1A] border-[#0B3D1A]/15'
                                : 'bg-white/60 text-muted border-white/70'
                        }`}
                      >
                        {r.status}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          r.urgency === 'IMMEDIATE' || String(r.urgency) === 'CRITICAL'
                            ? 'bg-red-50 text-red-700'
                            : r.urgency === 'HIGH' || String(r.urgency) === 'URGENT'
                              ? 'bg-orange-50 text-orange'
                              : 'bg-white/70 text-muted'
                        }`}
                      >
                        {r.urgency}
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                      <span className="font-bold text-ink">{r.wardType}</span>
                      <span>
                        {new Date(r.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {(() => {
                        const mobile = resolvePatientMobile(r);
                        return mobile ? (
                          <a
                            href={`tel:${String(mobile).replace(/\s/g, '')}`}
                            className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-[#0B3D1A] text-[#A8E017] hover:brightness-110 transition"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {mobile}
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white/55 border border-white/60 text-muted">
                            <Phone className="w-3 h-3" />
                            No mobile on file
                          </span>
                        );
                      })()}
                      {r.patientEmail && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted truncate max-w-[220px]">
                          <Mail className="w-3 h-3 shrink-0" />
                          {r.patientEmail}
                        </span>
                      )}
                      {r.shareAbha && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#3F7A1E]">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {r.maskedAbha || (r as any).abha?.maskedNumber || 'ABHA shared'}
                        </span>
                      )}
                    </div>
                    {r.note && (
                      <p className="mt-1.5 text-[11px] text-muted italic truncate max-w-xl">
                        “{r.note}”
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap lg:justify-end shrink-0">
                    {r.status === 'APPROVED' && (
                      <div className="inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-muted" />
                        <HoldTimer expiresAt={r.holdExpiresAt} />
                      </div>
                    )}

                    {r.status === 'PENDING' && (
                      <>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleDecision(r.id, 'APPROVED')}
                          className="h-10 px-3.5 rounded-xl bg-[#0B3D1A] text-[#A8E017] text-xs font-extrabold inline-flex items-center gap-1.5 hover:brightness-110 disabled:opacity-50 transition"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleDecision(r.id, 'REJECTED')}
                          className="h-10 px-3.5 rounded-xl ll-glass border border-white/60 text-red text-xs font-bold inline-flex items-center gap-1.5 hover:bg-red/5 disabled:opacity-50 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                          Decline
                        </button>
                      </>
                    )}

                    {r.status === 'APPROVED' && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleDecision(r.id, 'ADMITTED')}
                        className="h-10 px-3.5 rounded-xl bg-[#A8E017] text-[#0B3D1A] text-xs font-extrabold inline-flex items-center gap-1.5 hover:brightness-105 disabled:opacity-50 transition"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Admit
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
