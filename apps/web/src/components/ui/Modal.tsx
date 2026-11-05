import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  /** Tighter header + less padding for dense one-screen forms */
  compact?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
  compact = false,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
  };

  const node = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-3 md:p-4"
    >
      <button
        type="button"
        aria-label="Close overlay"
        className="absolute inset-0 bg-[#0B3D1A]/40 backdrop-blur-md"
        onClick={onClose}
      />

      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className={`relative z-10 w-full ${maxWidthStyles[maxWidth]} max-h-[min(94dvh,920px)] overscroll-contain rounded-t-[24px] sm:rounded-[28px] ll-glass-strong border border-white/60 shadow-[0_24px_80px_rgba(11,61,26,0.22)] text-left overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
          compact ? 'p-4 sm:p-5' : 'p-5 sm:p-6'
        }`}
      >
        <div
          className="pointer-events-none absolute -top-16 -right-10 w-48 h-48 rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(168,224,23,0.35), transparent 70%)' }}
        />

        <div className={`relative flex items-start justify-between gap-3 ${compact ? 'mb-3' : 'mb-4'}`}>
          <div className="min-w-0 pr-2">
            <h2
              id="modal-title"
              className={`font-bold font-display text-ink tracking-tight ${
                compact ? 'text-lg sm:text-xl' : 'text-xl'
              }`}
            >
              {title}
            </h2>
            {description && (
              <p className={`text-muted leading-snug ${compact ? 'text-xs mt-0.5' : 'text-sm mt-1'}`}>
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full ll-glass border border-white/55 flex items-center justify-center text-muted hover:text-ink hover:bg-white/70 transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="relative">{children}</div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
};
