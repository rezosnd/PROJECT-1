import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'line' | 'card' | 'circle' | 'button';
}

export const Skeleton: React.FC<SkeletonProps> = ({ variant = 'line', className = '', ...props }) => {
  const variantStyles = {
    line: 'h-4 w-full rounded-pill',
    card: 'h-36 w-full rounded-card',
    circle: 'w-12 h-12 rounded-full',
    button: 'h-12 w-32 rounded-pill'
  };

  return (
    <div
      aria-hidden="true"
      className={`animate-shimmer bg-card-soft ${variantStyles[variant]} ${className}`}
      {...props}
    />
  );
};

