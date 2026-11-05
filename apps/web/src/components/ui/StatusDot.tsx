import React from 'react';

export interface StatusDotProps {
  color?: 'green' | 'orange' | 'red' | 'teal' | 'blue' | 'muted';
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusDot: React.FC<StatusDotProps> = ({
  color = 'green',
  pulse = false,
  size = 'md',
  className = ''
}) => {
  const colorMap = {
    green: 'bg-green text-green',
    orange: 'bg-orange text-orange',
    red: 'bg-red text-red',
    teal: 'bg-teal text-teal',
    blue: 'bg-blue text-blue',
    muted: 'bg-muted text-muted'
  };

  const sizeMap = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5'
  };

  return (
    <span className={`relative inline-flex items-center justify-center shrink-0 ${sizeMap[size]} ${className}`}>
      {pulse && (
        <span
          className={`absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping ${colorMap[color].split(' ')[0]}`}
        />
      )}
      <span className={`relative inline-flex rounded-full ${sizeMap[size]} ${colorMap[color].split(' ')[0]}`} />
    </span>
  );
};

