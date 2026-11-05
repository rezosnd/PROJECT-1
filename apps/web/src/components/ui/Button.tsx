import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className = '',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-150 ease-out active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-ink disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 select-none';

    const sizeStyles = {
      sm: 'px-4 py-2 text-xs h-10 gap-1.5',
      md: 'px-5 py-3 text-sm h-11 gap-2 min-h-[44px]',
      lg: 'px-7 py-3.5 text-base h-[52px] gap-2.5 min-h-[52px]'
    };

    const variantStyles = {
      primary: 'bg-ink text-white hover:bg-ink-light shadow-soft',
      secondary: 'bg-white text-ink hover:bg-card-soft shadow-soft border border-hairline',
      outline: 'bg-transparent text-ink border border-hairline hover:bg-card-soft',
      ghost: 'bg-transparent text-ink hover:bg-card-soft',
      danger: 'bg-red text-white hover:bg-red/90 shadow-soft'
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {isLoading && (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {!isLoading && leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

