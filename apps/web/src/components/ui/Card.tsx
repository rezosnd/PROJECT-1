import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'surface' | 'soft';
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', interactive = false, className = '', children, ...props }, ref) => {
    const variantStyles = {
      default: 'bg-card border border-hairline/80 shadow-soft',
      surface: 'bg-surface border border-hairline/80 shadow-soft',
      soft: 'bg-card-soft border border-hairline/50'
    };

    const interactiveStyles = interactive
      ? 'cursor-pointer hover:shadow-float hover:-translate-y-0.5 transition-all duration-200'
      : '';

    return (
      <div
        ref={ref}
        className={`rounded-card p-5 ${variantStyles[variant]} ${interactiveStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

