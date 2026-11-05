import React from 'react';
import { Chip } from '../ui/Chip';

export interface ConfidenceBadgeProps {
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  className?: string;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ confidence, className = '' }) => {
  const variantMap = {
    HIGH: 'green' as const,
    MEDIUM: 'orange' as const,
    LOW: 'neutral' as const
  };

  const labelMap = {
    HIGH: 'High Confidence',
    MEDIUM: 'Med Confidence',
    LOW: 'Low Confidence'
  };

  return (
    <Chip
      variant={variantMap[confidence]}
      dot
      className={`text-[10px] tracking-tight uppercase ${className}`}
      title={`Poisson prediction reliability based on historical 28-day hospital telemetry: ${labelMap[confidence]}`}
    >
      {labelMap[confidence]}
    </Chip>
  );
};

