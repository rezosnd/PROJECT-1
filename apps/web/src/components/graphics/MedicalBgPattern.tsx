import React from 'react';

export const MedicalBgPattern: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none opacity-40 ${className}`}
      aria-hidden="true"
    >
      {/* Subtle modern medical grid + heartbeat pulse SVG */}
      <svg
        className="absolute top-0 right-0 w-[600px] h-[600px] text-blue-500/5 -translate-y-12 translate-x-24"
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="200" cy="200" r="180" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 6" />
        <circle cx="200" cy="200" r="120" stroke="currentColor" strokeWidth="1" />
        <circle cx="200" cy="200" r="60" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" />
        <path
          d="M60 200 H140 L160 160 L180 240 L200 170 L215 210 L230 195 L245 200 H340"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Soft emerald radial ambient light in top-left */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-100/30 rounded-full blur-3xl" />
      <div className="absolute top-48 right-10 w-80 h-80 bg-blue-100/25 rounded-full blur-3xl" />
    </div>
  );
};

