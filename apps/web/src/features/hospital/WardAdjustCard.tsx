import React, { useState } from 'react';
import { WardInventory, bedsApi } from '../../lib/api/beds.api';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { useToast } from '../../components/ui/Toast';
import { Plus, Minus, HelpCircle, Activity } from 'lucide-react';

interface WardAdjustCardProps {
  ward: WardInventory;
  hospitalId: string;
  isPulsing?: boolean;
  onShortcutsClick?: () => void;
  onUpdated?: () => void;
}

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

  // Sync external ward changes when updated via socket
  React.useEffect(() => {
    setLocalWard(ward);
  }, [ward]);

  const handleAdjust = async (field: 'occupied' | 'reserved' | 'cleaning' | 'maintenance', delta: number) => {
    // Distributed Invariant: Cannot adjust below zero
    if (localWard[field] + delta < 0) return;

    const previousState = { ...localWard };

    // 1. Optimistic local update
    const nextFieldVal = localWard[field] + delta;
    const nextState = { ...localWard, [field]: nextFieldVal };
    nextState.free = Math.max(
      0,
      nextState.total - (nextState.occupied + nextState.reserved + nextState.cleaning + nextState.maintenance)
    );
    setLocalWard(nextState);
    setIsUpdating(true);

    // 2. Network mutation with rollback on failure
    try {
      const wardType = (localWard.wardType || (ward as any).ward_type) as WardInventory['wardType'];
      if (!wardType) {
        throw new Error('Ward type missing on this card — refresh the dashboard');
      }

      // Backend adjust schema: { occupied: +1|-1, reserved, cleaning, maintenance }
      await bedsApi.adjustBedInventory(hospitalId, wardType, {
        [field]: delta,
        reason: 'STAFF_WARD_ADJUSTMENT',
      });
      if (onUpdated) onUpdated();
    } catch (err: any) {
      // Rollback optimistic state
      setLocalWard(previousState);
      const msg = err.response?.data?.error?.message || 'Bed adjustment failed on server';
      addToast({
        type: 'error',
        title: 'Adjustment Rollback',
        message: msg
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const freeStatus = localWard.free > 2 ? 'green' : localWard.free > 0 ? 'orange' : 'red';

  return (
    <Card variant="surface" className="text-left ll-glass-strong border border-white/55 relative overflow-hidden hover:border-[var(--color-brand-forest)]/25 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-lg text-ink">
              {localWard.wardType}
            </h3>
            <Chip variant={freeStatus} dot pulse={isPulsing}>
              <span className={isPulsing ? 'animate-number-pulse font-bold' : ''}>
                {localWard.free} free
              </span>
            </Chip>
          </div>
          <p className="text-xs text-muted mt-0.5">
            {localWard.total} beds
            {localWard.hasVentilatorBeds ? ` · ${localWard.hasVentilatorBeds} vent` : ''}
          </p>
        </div>

        {onShortcutsClick && (
          <button
            onClick={onShortcutsClick}
            className="text-muted hover:text-ink p-1 rounded-full hover:bg-card-soft transition-colors"
            title="Keyboard Shortcuts"
            aria-label="Ward adjustment shortcuts"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Adjuster Columns Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { key: 'occupied' as const, label: 'Occupied', count: localWard.occupied, color: 'text-red' },
          { key: 'reserved' as const, label: 'Reserved (Holds)', count: localWard.reserved, color: 'text-orange' },
          { key: 'cleaning' as const, label: 'Cleaning', count: localWard.cleaning, color: 'text-teal' },
          { key: 'maintenance' as const, label: 'Maintenance', count: localWard.maintenance, color: 'text-muted' }
        ].map((item) => (
          <div
            key={item.key}
            className="p-3 bg-card rounded-2xl border border-hairline/60 flex flex-col items-center justify-between gap-2 text-center"
          >
            <span className="text-[11px] font-semibold text-muted uppercase tracking-tight">
              {item.label}
            </span>

            {/* Counter display */}
            <span className={`font-display font-extrabold text-2xl ${item.color}`}>
              {item.count}
            </span>

            {/* Plus / Minus Buttons */}
            <div className="flex items-center gap-1.5 w-full">
              <button
                type="button"
                onClick={() => handleAdjust(item.key, -1)}
                disabled={item.count <= 0 || isUpdating}
                className="flex-1 h-9 rounded-pill bg-white text-ink font-bold flex items-center justify-center border border-hairline shadow-xs hover:bg-card-soft active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all"
                aria-label={`Decrease ${item.label}`}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleAdjust(item.key, 1)}
                disabled={isUpdating}
                className="flex-1 h-9 rounded-pill bg-[var(--color-brand-forest)] text-[var(--color-brand-lime)] font-bold flex items-center justify-center shadow-xs hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all"
                aria-label={`Increase ${item.label}`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Derived Formula Verification Strip */}
      <div className="mt-3.5 pt-2.5 border-t border-hairline/60 flex items-center justify-between text-[11px] text-muted">
        <span>
          Derived Free = {localWard.total} - ({localWard.occupied} + {localWard.reserved} + {localWard.cleaning} + {localWard.maintenance}) = <strong className="text-ink font-bold">{localWard.free}</strong>
        </span>
        <span className="font-mono text-[10px]">v{localWard.version}</span>
      </div>
    </Card>
  );
};

