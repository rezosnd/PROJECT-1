import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { bedsApi, WardType, WardInventory } from '../../lib/api/beds.api';
import { useToast } from '../../components/ui/Toast';
import { useLiveBeds } from '../../hooks/useLiveBeds';
import { useQuery } from '@tanstack/react-query';
import { forecastApi } from '../../lib/api/forecast.api';
import { Clock, ShieldCheck, AlertCircle, BedDouble, ArrowRight } from 'lucide-react';

interface RequestBedModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospitalId: string;
  hospitalName: string;
  defaultWardType?: WardType | string;
  onSuccess?: (requestId: string) => void;
}

function plainChance(p: number) {
  const pct = Math.round((p || 0) * 100);
  if (pct >= 70) return { pct, label: 'Likely free', tone: 'text-[#3F7A1E]' };
  if (pct >= 40) return { pct, label: 'Possible', tone: 'text-orange' };
  return { pct, label: 'Unlikely', tone: 'text-red' };
}

export const RequestBedModal: React.FC<RequestBedModalProps> = ({
  isOpen,
  onClose,
  hospitalId,
  hospitalName,
  defaultWardType = 'ICU',
  onSuccess,
}) => {
  const { addToast } = useToast();
  const { data: beds = [] } = useLiveBeds(hospitalId);

  const [wardType, setWardType] = useState<WardType>((defaultWardType as WardType) || 'ICU');
  const [urgency, setUrgency] = useState<'IMMEDIATE' | 'HIGH' | 'MODERATE'>('IMMEDIATE');
  const [note, setNote] = useState('');
  const [shareAbha, setShareAbha] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (defaultWardType) setWardType(defaultWardType as WardType);
  }, [defaultWardType, isOpen]);

  const selectedWard: WardInventory | undefined = useMemo(
    () => beds.find((b) => b.wardType === wardType),
    [beds, wardType]
  );

  const freeNow = selectedWard?.free ?? 0;

  const { data: wardForecast } = useQuery({
    queryKey: ['request-modal-forecast', hospitalId, wardType],
    queryFn: () => forecastApi.getWardForecast(hospitalId, wardType),
    enabled: Boolean(isOpen && hospitalId && wardType),
    staleTime: 30000,
  });

  const chance3h = plainChance(
    wardForecast?.horizons?.h3?.probabilityAtLeastOneFree ??
      wardForecast?.horizons?.['3h']?.probabilityAtLeastOneFree ??
      (freeNow > 0 ? 0.85 : 0.35)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const idempotencyKey =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `req-${Date.now()}`;
      const apiUrgency =
        urgency === 'IMMEDIATE' ? 'CRITICAL' : urgency === 'HIGH' ? 'URGENT' : 'NORMAL';
      const res = await bedsApi.requestBed({
        hospitalId,
        wardType,
        urgency: apiUrgency as any,
        note: note.trim() || undefined,
        shareAbha,
        idempotencyKey,
      });
      addToast({
        type: 'success',
        title: 'Bed reservation placed',
        message: `${wardType}: hospital has 15 minutes to approve your hold.`,
      });
      onClose();
      if (onSuccess) onSuccess(res.id);
    } catch (err: any) {
      const details = err.response?.data?.error?.details;
      const detailStr = Array.isArray(details)
        ? details.map((d: any) => `${d.path}: ${d.message}`).join(', ')
        : '';
      addToast({
        type: 'error',
        title: 'Reservation request failed',
        message: detailStr
          ? `${err.response?.data?.error?.message || 'Validation error'}: ${detailStr}`
          : err.response?.data?.error?.message || 'Failed to submit bed reservation request',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const wardOptions = [
    'ICU',
    'NICU',
    'PICU',
    'HDU',
    'CCU',
    'GENERAL',
    'EMERGENCY',
    'ISOLATION',
  ] as WardType[];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request emergency bed"
      description={`15-minute hold at ${hospitalName}`}
      maxWidth="4xl"
      compact
    >
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">
        {/* Top: bed types + availability side by side */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-7">
            <label className="block text-[10px] font-bold text-muted uppercase tracking-[0.12em] mb-1.5">
              Bed type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {wardOptions.map((w) => {
                const inv = beds.find((b) => b.wardType === w);
                const free = inv ? inv.free : null;
                const selected = wardType === w;
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWardType(w)}
                    className={`text-left px-2.5 py-2 rounded-xl border transition-all min-h-[52px] ${
                      selected
                        ? 'bg-[#0B3D1A]/92 text-white border-white/15 backdrop-blur-md'
                        : 'll-glass border-white/55 text-ink hover:bg-white/70'
                    }`}
                  >
                    <div className="text-[11px] font-extrabold tracking-wide">{w}</div>
                    <div
                      className={`text-[10px] font-bold mt-0.5 ${
                        selected
                          ? 'text-[#A8E017]'
                          : free === 0
                            ? 'text-red'
                            : free != null && free > 0
                              ? 'text-[#3F7A1E]'
                              : 'text-muted'
                      }`}
                    >
                      {free === null ? '—' : free === 0 ? 'Full' : `${free} free`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-5 rounded-2xl ll-glass border border-white/55 p-3.5 relative overflow-hidden">
            <div
              className="pointer-events-none absolute -top-8 -right-6 w-28 h-28 rounded-full opacity-45"
              style={{
                background: 'radial-gradient(circle, rgba(168,224,23,0.4), transparent 70%)',
              }}
            />
            <div className="relative flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-lg ll-glass-dark flex items-center justify-center border border-white/15">
                <BedDouble className="w-3.5 h-3.5 text-[#A8E017]" />
              </span>
              <span className="text-xs font-bold text-ink">{wardType} availability</span>
            </div>
            <div className="relative flex items-end gap-3">
              <div>
                <div className="font-display text-3xl font-extrabold text-ink leading-none">{freeNow}</div>
                <div className="text-[10px] text-muted mt-1">
                  {freeNow === 1 ? 'bed free now' : 'beds free now'}
                </div>
              </div>
              <p
                className={`text-[11px] font-bold pb-0.5 ${
                  freeNow > 2 ? 'text-[#3F7A1E]' : freeNow > 0 ? 'text-orange' : 'text-red'
                }`}
              >
                {freeNow > 2
                  ? 'Good — request a hold'
                  : freeNow > 0
                    ? 'Limited — act fast'
                    : 'Full — chance below'}
              </p>
            </div>
            <div className="relative mt-3 rounded-xl bg-white/45 border border-white/55 px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[9px] uppercase font-bold tracking-wider text-muted">
                  ~3h chance
                </span>
                <span className={`text-[10px] font-bold ${chance3h.tone}`}>{chance3h.label}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl font-extrabold text-ink">{chance3h.pct}%</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/60 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#0B3D1A] to-[#A8E017]"
                    style={{ width: `${Math.max(6, chance3h.pct)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Urgency */}
        <div>
          <label className="block text-[10px] font-bold text-muted uppercase tracking-[0.12em] mb-1.5">
            Clinical urgency
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'IMMEDIATE', label: 'Immediate', desc: 'Critical / 112' },
              { id: 'HIGH', label: 'High', desc: '< 1 Hour' },
              { id: 'MODERATE', label: 'Moderate', desc: '< 3 Hours' },
            ].map((u) => {
              const on = urgency === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setUrgency(u.id as any)}
                  className={`px-2 py-2 rounded-xl border text-center transition-all min-h-[48px] ${
                    on
                      ? 'bg-[#0B3D1A]/92 text-white border-white/15'
                      : 'll-glass border-white/55 text-ink hover:bg-white/70'
                  }`}
                >
                  <div className="text-[11px] font-bold">{u.label}</div>
                  <div className={`text-[9px] ${on ? 'text-white/75' : 'text-muted'}`}>{u.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Note + ABHA in one row on wide screens */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[10px] font-bold text-muted uppercase tracking-[0.12em] mb-1.5">
              Note for triage (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={240}
              rows={2}
              className="w-full rounded-xl px-3 py-2 text-xs text-ink bg-white/50 backdrop-blur-md border border-white/60 focus:outline-none focus:ring-2 focus:ring-[#A8E017]/35 resize-none placeholder:text-muted/70 min-h-[64px]"
              placeholder="Symptoms, transfer ETA, referring doctor…"
            />
          </div>

          <label className="flex items-start gap-2.5 p-3 rounded-xl ll-glass border border-white/55 cursor-pointer hover:bg-white/65 transition md:mt-[22px] min-h-[64px]">
            <input
              type="checkbox"
              checked={shareAbha}
              onChange={(e) => setShareAbha(e.target.checked)}
              className="mt-0.5 accent-[#0B3D1A] w-4 h-4 shrink-0"
            />
            <span className="text-[11px] text-ink leading-snug">
              <span className="font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#3F7A1E]" /> Share ABHA with hospital
              </span>
              <span className="text-muted block mt-0.5">
                Faster triage with your linked health ID.
              </span>
            </span>
          </label>
        </div>

        {freeNow === 0 && (
          <div className="flex items-start gap-2 text-[11px] text-amber-900 bg-amber-50/70 border border-amber-200/60 rounded-xl px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            No {wardType} free now — you can still request from expected discharges.
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-0.5">
          <p className="flex items-center gap-1.5 text-[10px] text-muted sm:flex-1">
            <Clock className="w-3.5 h-3.5" />
            Hold expires in 15 minutes if not approved
          </p>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto sm:min-w-[260px] h-12 px-5 rounded-2xl bg-[#0B3D1A]/92 text-[#A8E017] text-sm font-extrabold inline-flex items-center justify-center gap-2 hover:bg-[#0B3D1A] transition border border-white/15 shadow-[0_10px_24px_rgba(11,61,26,0.2)] disabled:opacity-60"
          >
            {isSubmitting ? 'Submitting…' : `Request ${wardType} bed hold`}
            {!isSubmitting && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </Modal>
  );
};
