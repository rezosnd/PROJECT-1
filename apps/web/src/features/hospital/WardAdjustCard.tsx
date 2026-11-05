import React, { useState } from 'react';
import { WardInventory, bedsApi } from '../../lib/api/beds.api';
import { useToast } from '../../components/ui/Toast';
import { Plus, Minus, HelpCircle, Wind } from 'lucide-react';

interface WardAdjustCardProps {
  ward: WardInventory;
  hospitalId: string;
  isPulsing?: boolean;
  onShortcutsClick?: () => void;
  onUpdated?: () => void;
}

type AdjustField = 'occupied' | 'reserved' | 'cleaning' | 'maintenance' | 'total';

export const WardAdjustCard: React.FC<WardAdjustCardProps> = ({
  ward,
  hospitalId,
  isPulsing = false,
  onShortcutsClick,
  onUpdated,
}) => {
  const { addToast } = useToast();
  const [localWard, setLocalWard] = useState<WardInventory>(ward);
  const [isUpdating, setIsUpdating] = useState(false);

  React.useEffect(() => {
    setLocalWard(ward);
  }, [ward]);

  const allocated =
    localWard.occupied + localWard.reserved + localWard.cleaning + localWard.maintenance;
  const freePct = localWard.total > 0 ? Math.round((localWard.free / localWard.total) * 100) : 0;

  const handleAdjust = async (field: AdjustField, delta: number) => {
    if (field === 'total') {
      const nextTotal = localWard.total + delta;
      if (nextTotal < allocated || nextTotal < 1) return;
    } else {
      if (localWard[field] + delta < 0) return;
      if (delta > 0 && localWard.free <= 0) {
        addToast({
          type: 'error',
          title: 'No free beds',
          message: 'Add capacity first, then move beds into this state.',
        });
        return;
      }
    }

    const previousState = { ...localWard };
    const nextState = { ...localWard, [field]: localWard[field] + delta };
    nextState.free = Math.max(
      0,
      nextState.total -
        (nextState.occupied + nextState.reserved + nextState.cleaning + nextState.maintenance)
    );
    setLocalWard(nextState);
    setIsUpdating(true);

    try {
      const wardType = (localWard.wardType || (ward as any).ward_type) as WardInventory['wardType'];
      if (!wardType) throw new Error('Ward type missing — refresh the dashboard');

      await bedsApi.adjustBedInventory(hospitalId, wardType, {
        [field]: delta,
        reason: field === 'total' ? 'STAFF_CAPACITY_CHANGE' : 'STAFF_WARD_ADJUSTMENT',
      });
      onUpdated?.();
    } catch (err: any) {
      setLocalWard(previousState);
      addToast({
        type: 'error',
        title: 'Adjustment rolled back',
        message: err.response?.data?.error?.message || 'Bed adjustment failed on server',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const freeTone =
    localWard.free > 2
      ? 'text-[#A8E017]'
      : localWard.free > 0
        ? 'text-amber-200'
        : 'text-red-300';

  const counters = [
    { key: 'occupied' as const, label: 'Occupied', count: localWard.occupied, tone: 'text-red' },
    {
      key: 'reserved' as const,
      label: 'Holds',
      count: localWard.reserved,
      tone: 'text-orange',
    },
    { key: 'cleaning' as const, label: 'Cleaning', count: localWard.cleaning, tone: 'text-teal' },
    {
      key: 'maintenance' as const,
      label: 'Maint.',
      count: localWard.maintenance,
      tone: 'text-muted',
    },
  ];

  return (
    <article className="relative overflow-hidden rounded-[26px] ll-glass-strong border border-white/60 p-4 sm:p-5 text-left shadow-[0_12px_36px_rgba(11,61,26,0.07)] hover:border-[var(--color-brand-forest)]/30 transition-colors">
      <div
        className="pointer-events-none absolute -top-14 -right-10 w-36 h-36 rounded-full opacity-40"
        style={{
          background:
            localWard.free > 0
              ? 'radial-gradient(circle, rgba(168,224,23,0.4), transparent 70%)'
              : 'radial-gradient(circle, rgba(220,38,38,0.18), transparent 70%)',
        }}
      />

      <div className="relative flex items-start justify-between gap-2 mb-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-extrabold text-lg text-ink tracking-tight">
              {localWard.wardType}
            </h3>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                localWard.free > 2
                  ? 'bg-[#A8E017]/20 text-[#0B3D1A] border-[#A8E017]/35'
                  : localWard.free > 0
                    ? 'bg-amber-50 text-amber-900 border-amber-200/70'
                    : 'bg-red-50 text-red-700 border-red-200/70'
              } ${isPulsing ? 'animate-number-pulse' : ''}`}
            >
              {localWard.free} free
            </span>
          </div>
          <p className="text-[11px] text-muted mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-ink/70">{localWard.total} capacity</span>
            {localWard.hasVentilatorBeds > 0 && (
              <>
                <span className="text-muted/40">·</span>
                <span className="inline-flex items-center gap-1">
                  <Wind className="w-3 h-3" />
                  {localWard.hasVentilatorBeds} vent
                </span>
              </>
            )}
            <span className="text-muted/40">·</span>
            <span>{freePct}% open</span>
          </p>
        </div>

        {onShortcutsClick && (
          <button
            type="button"
            onClick={onShortcutsClick}
            className="w-9 h-9 rounded-xl ll-glass border border-white/55 text-muted hover:text-ink flex items-center justify-center transition shrink-0"
            title="Keyboard shortcuts"
            aria-label="Ward adjustment shortcuts"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Utilization bar */}
      <div className="relative h-2 rounded-full bg-white/50 border border-white/55 overflow-hidden mb-3.5">
        <div
          className="absolute inset-y-0 left-0 bg-[#0B3D1A]/85 transition-all duration-500"
          style={{
            width: `${localWard.total ? Math.min(100, (localWard.occupied / localWard.total) * 100) : 0}%`,
          }}
        />
        <div
          className="absolute inset-y-0 bg-orange/80 transition-all duration-500"
          style={{
            left: `${localWard.total ? Math.min(100, (localWard.occupied / localWard.total) * 100) : 0}%`,
            width: `${
              localWard.total
                ? Math.min(
                    100,
                    ((localWard.reserved + localWard.cleaning + localWard.maintenance) /
                      localWard.total) *
                      100
                  )
                : 0
            }%`,
          }}
        />
      </div>

      {/* Capacity control */}
      <div className="relative mb-3 rounded-2xl ll-glass-dark border border-white/15 px-3 py-2.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#A8E017]/90">
            Ward capacity
          </p>
          <p className={`font-display text-2xl font-extrabold tabular-nums leading-none mt-0.5 ${freeTone}`}>
            {localWard.total}
            <span className="text-xs font-semibold text-white/50 ml-1.5">beds</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => handleAdjust('total', -1)}
            disabled={isUpdating || localWard.total <= allocated || localWard.total <= 1}
            className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 text-white flex items-center justify-center hover:bg-white/15 active:scale-95 disabled:opacity-35 disabled:pointer-events-none transition"
            aria-label="Decrease capacity"
            title="Remove 1 bed from capacity"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleAdjust('total', 1)}
            disabled={isUpdating}
            className="h-10 px-3.5 rounded-xl bg-[#A8E017] text-[#0B3D1A] text-xs font-extrabold inline-flex items-center gap-1.5 hover:brightness-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition"
            aria-label="Add capacity"
            title="Add 1 bed to capacity"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
          <button
            type="button"
            onClick={() => handleAdjust('total', 5)}
            disabled={isUpdating}
            className="h-10 px-3 rounded-xl bg-white/10 border border-white/15 text-[#A8E017] text-xs font-extrabold hover:bg-white/15 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition"
            aria-label="Add 5 beds"
            title="Add 5 beds"
          >
            +5
          </button>
        </div>
      </div>

      {/* State counters */}
      <div className="relative grid grid-cols-2 gap-2">
        {counters.map((item) => (
          <div
            key={item.key}
            className="rounded-2xl bg-white/50 border border-white/60 px-2.5 py-2.5 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
                {item.label}
              </span>
              <span className={`font-display text-xl font-extrabold tabular-nums leading-none ${item.tone}`}>
                {item.count}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleAdjust(item.key, -1)}
                disabled={item.count <= 0 || isUpdating}
                className="flex-1 h-9 rounded-xl bg-white border border-white/70 text-ink flex items-center justify-center hover:bg-white/90 active:scale-95 disabled:opacity-35 disabled:pointer-events-none transition"
                aria-label={`Decrease ${item.label}`}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleAdjust(item.key, 1)}
                disabled={isUpdating || localWard.free <= 0}
                className="flex-1 h-9 rounded-xl bg-[#0B3D1A] text-[#A8E017] flex items-center justify-center hover:brightness-110 active:scale-95 disabled:opacity-35 disabled:pointer-events-none transition"
                aria-label={`Increase ${item.label}`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="relative mt-3 pt-2.5 border-t border-white/50 flex items-center justify-between gap-2 text-[10px] text-muted">
        <span className="truncate">
          Free = {localWard.total} − {allocated} →{' '}
          <strong className="text-ink font-bold">{localWard.free}</strong>
        </span>
        <span className="font-mono shrink-0">v{localWard.version}</span>
      </div>
    </article>
  );
};
