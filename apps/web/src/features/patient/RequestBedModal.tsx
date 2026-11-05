import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { bedsApi, WardType, WardInventory } from '../../lib/api/beds.api';
import { useToast } from '../../components/ui/Toast';
import { useLiveBeds } from '../../hooks/useLiveBeds';
import { useQuery } from '@tanstack/react-query';
import { forecastApi } from '../../lib/api/forecast.api';
import { Clock, ShieldCheck, AlertCircle, BedDouble } from 'lucide-react';

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
  if (pct >= 70) return { pct, label: 'Likely free', tone: 'text-green' };
  if (pct >= 40) return { pct, label: 'Possible', tone: 'text-orange' };
  return { pct, label: 'Unlikely', tone: 'text-red' };
}

export const RequestBedModal: React.FC<RequestBedModalProps> = ({
  isOpen,
  onClose,
  hospitalId,
  hospitalName,
  defaultWardType = 'ICU',
  onSuccess
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
        idempotencyKey
      });

      addToast({
        type: 'success',
        title: 'Bed reservation placed',
        message: `${wardType}: hospital has 15 minutes to approve your hold.`
      });

      onClose();
      if (onSuccess) onSuccess(res.id);
    } catch (err: any) {
      const details = err.response?.data?.error?.details;
      const detailStr = Array.isArray(details)
        ? details.map((d: any) => `${d.path}: ${d.message}`).join(', ')
        : '';
      const errorMsg = detailStr
        ? `${err.response?.data?.error?.message || 'Validation error'}: ${detailStr}`
        : err.response?.data?.error?.message || 'Failed to submit bed reservation request';
      addToast({
        type: 'error',
        title: 'Reservation request failed',
        message: errorMsg
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const wardOptions = ['ICU', 'NICU', 'PICU', 'HDU', 'CCU', 'GENERAL', 'EMERGENCY', 'ISOLATION'] as WardType[];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request emergency bed"
      description={`Reserve a bed at ${hospitalName} during patient transit.`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.1fr] gap-3">
          {/* Left: ward picker with live free counts */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Bed type
            </label>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {wardOptions.map((w) => {
                const inv = beds.find((b) => b.wardType === w);
                const free = inv ? inv.free : null;
                const selected = wardType === w;
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWardType(w)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                      selected
                        ? 'border-ink bg-ink text-white shadow-soft'
                        : 'border-hairline bg-white hover:bg-card-soft text-ink'
                    }`}
                  >
                    <span className="text-sm font-bold">{w}</span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        selected
                          ? 'bg-white/15 text-white'
                          : free === null
                          ? 'bg-slate-100 text-muted'
                          : free > 2
                          ? 'bg-emerald-50 text-emerald-700'
                          : free > 0
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {free === null ? '—' : free === 0 ? 'Full' : `${free} free`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: plain-language availability for selected ward */}
          <div className="rounded-2xl border border-hairline bg-card-soft/60 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-navy" />
              <span className="text-sm font-bold text-ink">{wardType} availability</span>
            </div>
            <div>
              <div className="text-3xl font-extrabold font-display text-ink leading-none">
                {freeNow}
              </div>
              <div className="text-xs text-muted mt-1">
                {freeNow === 1 ? 'bed free right now' : 'beds free right now'}
              </div>
            </div>
            <p
              className={`text-xs font-semibold ${
                freeNow > 2 ? 'text-green' : freeNow > 0 ? 'text-orange' : 'text-red'
              }`}
            >
              {freeNow > 2
                ? 'Good — you can request a 15-minute hold'
                : freeNow > 0
                ? 'Limited — request quickly'
                : 'Full now — chance below may still open a bed'}
            </p>
            <div className="rounded-xl bg-white border border-hairline/60 px-3 py-2.5">
              <div className="text-[10px] uppercase font-semibold text-muted">Chance in ~3 hours</div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl font-extrabold text-ink">{chance3h.pct}%</span>
                <span className={`text-xs font-bold ${chance3h.tone}`}>{chance3h.label}</span>
              </div>
              <p className="text-[11px] text-muted mt-1 leading-snug">
                Easy read: about {chance3h.pct}% chance a {wardType} bed will be free in the next 3 hours.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
            Clinical urgency
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'IMMEDIATE', label: 'Immediate', desc: 'Critical / 112' },
              { id: 'HIGH', label: 'High', desc: '< 1 Hour' },
              { id: 'MODERATE', label: 'Moderate', desc: '< 3 Hours' }
            ].map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => setUrgency(u.id as any)}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  urgency === u.id
                    ? 'border-ink bg-ink text-white shadow-soft'
                    : 'border-hairline bg-white text-ink hover:bg-card-soft'
                }`}
              >
                <div className="text-xs font-bold">{u.label}</div>
                <div className={`text-[10px] ${urgency === u.id ? 'text-white/80' : 'text-muted'}`}>
                  {u.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
            Note for triage (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={240}
            rows={2}
            className="w-full bg-card rounded-2xl px-4 py-3 text-sm text-ink border border-hairline focus:border-blue focus:outline-none resize-none"
            placeholder="Symptoms, transfer ETA, referring doctor…"
          />
        </div>

        <label className="flex items-start gap-2.5 p-3 rounded-2xl border border-hairline bg-white cursor-pointer">
          <input
            type="checkbox"
            checked={shareAbha}
            onChange={(e) => setShareAbha(e.target.checked)}
            className="mt-0.5 accent-ink"
          />
          <span className="text-xs text-ink leading-relaxed">
            <span className="font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-green" /> Share ABHA with hospital
            </span>
            Lets clinical staff see your linked health ID for faster triage.
          </span>
        </label>

        <div className="flex items-center gap-2 text-[11px] text-muted">
          <Clock className="w-3.5 h-3.5" />
          Hold expires in 15 minutes if the hospital does not approve.
        </div>

        {freeNow === 0 && (
          <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl p-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            No {wardType} beds free right now. You can still request — hospital may approve from expected discharges.
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isSubmitting}>
          Request {wardType} bed hold
        </Button>
      </form>
    </Modal>
  );
};
