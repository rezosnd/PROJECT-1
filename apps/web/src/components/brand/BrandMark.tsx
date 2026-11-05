import React from 'react';
import { BRAND } from '../../lib/brand';

type BrandMarkProps = {
  variant?: 'mark' | 'full' | 'wordmark';
  className?: string;
  markClassName?: string;
  showTagline?: boolean;
  inverted?: boolean;
};

export const BrandMark: React.FC<BrandMarkProps> = ({
  variant = 'wordmark',
  className = '',
  markClassName = 'w-10 h-10',
  showTagline = false,
  inverted = false,
}) => {
  if (variant === 'mark') {
    return (
      <img
        src={BRAND.logoMark}
        alt={BRAND.name}
        className={`${markClassName} object-contain shrink-0 ${className}`}
      />
    );
  }

  if (variant === 'full') {
    return (
      <img
        src={BRAND.logoFull}
        alt={`${BRAND.name} — ${BRAND.tagline}`}
        className={`h-10 w-auto max-w-[220px] object-contain bg-transparent ${className}`}
      />
    );
  }

  return (
    <div className={`flex items-center gap-3 min-w-0 ${className}`}>
      <img
        src={BRAND.logoMark}
        alt=""
        className={`${markClassName} object-contain shrink-0 bg-transparent`}
      />
      <div className="min-w-0">
        <div
          className={`font-display text-[17px] font-extrabold leading-none truncate ${
            inverted ? 'text-white' : 'text-ink'
          }`}
        >
          <span className={inverted ? 'text-white' : 'text-[var(--color-brand-forest)]'}>GetMy</span>
          <span className={inverted ? 'text-[var(--color-brand-lime)]' : 'text-[var(--color-brand-lime-ink)]'}>
            Hospital
          </span>
        </div>
        {showTagline && (
          <div
            className={`text-[9px] font-bold uppercase tracking-[0.12em] mt-1 truncate ${
              inverted ? 'text-white/60' : 'text-muted'
            }`}
          >
            {BRAND.tagline}
          </div>
        )}
      </div>
    </div>
  );
};
