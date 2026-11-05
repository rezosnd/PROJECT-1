import React from 'react';

interface SeveritySliderProps {
  value: number;
  onChange: (val: number) => void;
  className?: string;
}

export const SeveritySlider: React.FC<SeveritySliderProps> = ({ value, onChange, className = '' }) => {
  const levels = [
    { level: 1, label: 'Mild / Stable', color: 'bg-green text-green', border: 'border-green' },
    { level: 2, label: 'Moderate', color: 'bg-teal text-teal', border: 'border-teal' },
    { level: 3, label: 'Serious', color: 'bg-orange text-orange', border: 'border-orange' },
    { level: 4, label: 'Severe', color: 'bg-orange text-orange', border: 'border-orange' },
    { level: 5, label: 'Critical / Resuscitation', color: 'bg-red text-red', border: 'border-red' }
  ];

  const current = levels.find((l) => l.level === value) || levels[2];

  return (
    <div className={`w-full flex flex-col gap-2.5 text-left ${className}`}>
      <div className="flex items-center justify-between">
        <label htmlFor="severity-range" className="text-xs font-semibold uppercase tracking-wider text-muted">
          Patient Severity / Acuity Level
        </label>
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-pill bg-white border ${current.border} shadow-xs`}>
          Level {value}: {current.label}
        </span>
      </div>

      <div className="relative py-2">
        <input
          id="severity-range"
          type="range"
          min="1"
          max="5"
          step="1"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-valuemin={1}
          aria-valuemax={5}
          aria-valuenow={value}
          aria-valuetext={`Level ${value} - ${current.label}`}
          className="w-full h-2.5 bg-card-soft rounded-pill appearance-none cursor-pointer accent-ink focus-visible:outline-blue"
        />

        {/* Ticks & Labels */}
        <div className="flex justify-between mt-2 px-1">
          {levels.map((l) => {
            const isSelected = l.level === value;
            return (
              <button
                key={l.level}
                type="button"
                onClick={() => onChange(l.level)}
                className={`text-[11px] font-semibold transition-colors flex flex-col items-center ${
                  isSelected ? 'text-ink font-bold' : 'text-muted hover:text-ink'
                }`}
              >
                <span className={`w-2 h-2 rounded-full mb-1 ${isSelected ? l.color.split(' ')[0] : 'bg-hairline'}`} />
                <span className="hidden sm:inline">{l.label.split('/')[0].trim()}</span>
                <span className="sm:hidden">{l.level}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

