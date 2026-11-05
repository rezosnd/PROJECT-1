import React from 'react';
import { WardType } from '../../lib/api/beds.api';
import { Button } from '../../components/ui/Button';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';

export interface FilterState {
  radiusKm: number;
  wardType: string;
  emergencyOnly: boolean;
  sortBy: 'score' | 'distance' | 'beds';
}

interface ResultsFilterDrawerProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
  className?: string;
}

const WARD_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All Ward Types' },
  { value: 'ICU', label: 'ICU (Intensive Care)' },
  { value: 'NICU', label: 'NICU (Neonatal ICU)' },
  { value: 'PICU', label: 'PICU (Pediatric ICU)' },
  { value: 'HDU', label: 'HDU (High Dependency)' },
  { value: 'CCU', label: 'CCU (Cardiac Care)' },
  { value: 'GENERAL', label: 'General Ward' },
  { value: 'EMERGENCY', label: 'Emergency Observation' },
  { value: 'ISOLATION', label: 'Isolation' }
];

export const ResultsFilterDrawer: React.FC<ResultsFilterDrawerProps> = ({
  filters,
  onChange,
  onReset,
  className = ''
}) => {
  return (
    <div className={`p-4 bg-white rounded-card border border-hairline/80 shadow-xs space-y-4 text-left ${className}`}>
      <div className="flex items-center justify-between pb-2 border-b border-hairline/60">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-ink" />
          <h4 className="text-sm font-bold text-ink">Filters & Preferences</h4>
        </div>
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      {/* Distance Radius Slider */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-muted uppercase tracking-wider">
            Search Radius
          </label>
          <span className="text-xs font-bold text-ink bg-card-soft px-2 py-0.5 rounded-pill">
            {filters.radiusKm} km
          </span>
        </div>
        <input
          type="range"
          min="2"
          max="50"
          step="1"
          value={filters.radiusKm}
          onChange={(e) => onChange({ ...filters, radiusKm: Number(e.target.value) })}
          className="w-full h-2 bg-card-soft rounded-pill appearance-none cursor-pointer accent-ink"
        />
        <div className="flex justify-between text-[10px] text-muted mt-1">
          <span>2 km</span>
          <span>25 km</span>
          <span>50 km</span>
        </div>
      </div>

      {/* Ward Type Selector */}
      <div>
        <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
          Ward Preference
        </label>
        <select
          value={filters.wardType}
          onChange={(e) => onChange({ ...filters, wardType: e.target.value as WardType })}
          className="w-full h-11 bg-card text-ink text-xs font-semibold rounded-pill px-4 border border-hairline/80 focus:border-blue focus:outline-none"
        >
          {WARD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Emergency 24x7 Switch */}
      <label className="flex items-center justify-between p-2 rounded-2xl bg-card-soft/60 cursor-pointer select-none">
        <span className="text-xs font-semibold text-ink">24x7 Emergency Service Only</span>
        <input
          type="checkbox"
          checked={filters.emergencyOnly}
          onChange={(e) => onChange({ ...filters, emergencyOnly: e.target.checked })}
          className="w-4 h-4 rounded text-ink focus:ring-blue accent-ink"
        />
      </label>

      {/* Sort By Toggle */}
      <div>
        <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
          Sort Hospitals By
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: 'score', label: 'Best Match' },
            { id: 'distance', label: 'Fastest ETA' },
            { id: 'beds', label: 'Most Free' }
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => onChange({ ...filters, sortBy: s.id as any })}
              className={`py-1.5 px-2 text-xs font-semibold rounded-pill transition-all ${
                filters.sortBy === s.id
                  ? 'bg-ink text-white shadow-soft'
                  : 'bg-card text-muted hover:text-ink'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

