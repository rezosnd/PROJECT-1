import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wider text-muted">
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-4 flex items-center pointer-events-none text-muted">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full h-12 bg-white text-ink text-sm rounded-pill border border-hairline transition-all duration-150 placeholder:text-muted/60 focus:border-blue focus:ring-2 focus:ring-blue/20 focus:outline-none ${
              leftIcon ? 'pl-11' : 'pl-4'
            } ${rightIcon ? 'pr-11' : 'pr-4'} ${
              error ? 'border-red focus:border-red focus:ring-red/20' : ''
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-4 flex items-center text-muted">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <span className="text-xs font-medium text-red pl-3">{error}</span>}
        {!error && hint && <span className="text-xs text-muted pl-3">{hint}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';

