import React from 'react';
import { StatusDot } from './StatusDot';

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'green' | 'orange' | 'red' | 'teal' | 'blue';
  dot?: boolean;
  pulse?: boolean;
  icon?: React.ReactNode;
}

export const Chip: React.FC<ChipProps> = ({
  variant = 'neutral',
  dot = false,
  pulse = false,
  icon,
  children,
  className = '',
  ...props
}) => {
  const variantStyles = {
    neutral: 'bg-white text-ink border border-hairline/80 shadow-xs',
    green: 'bg-green-light text-green border border-green/20',
    orange: 'bg-orange-light text-orange border border-orange/20',
    red: 'bg-red-light text-red border border-red/20',
    teal: 'bg-teal-light text-teal border border-teal/20',
    blue: 'bg-blue-light text-blue border border-blue/20'
  };

  const dotColorMap = {
    neutral: 'muted' as const,
    green: 'green' as const,
    orange: 'orange' as const,
    red: 'red' as const,
    teal: 'teal' as const,
    blue: 'blue' as const
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-semibold select-none ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {dot && <StatusDot color={dotColorMap[variant]} pulse={pulse} size="sm" />}
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

