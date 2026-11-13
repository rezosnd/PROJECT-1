import React from 'react';
import { QrCode, ScanLine } from 'lucide-react';
import type { PatientCareQr } from '../../lib/api/referrals.api';

interface CareQrCardProps {
  qr: PatientCareQr;
  className?: string;
}

export const CareQrCard: React.FC<CareQrCardProps> = ({ qr, className = '' }) => {
  return (
    <div
      className={`rounded-[28px] ll-glass-strong border border-[#A8E017]/25 p-5 space-y-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-2xl bg-[#0B3D1A]/92 text-[#A8E017] flex items-center justify-center shrink-0">
          <QrCode className="w-5 h-5" />
        </span>
        <div>
          <h3 className="font-display font-bold text-ink">Care QR</h3>
          <p className="text-sm text-muted mt-1 leading-relaxed">
            Show this code when a doctor uses the Doctor app to scan you in clinic. They can refer you
            to a hospital ward or place a 15-minute bed hold on your behalf.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="rounded-2xl bg-white p-3 border border-[#D8E0D4] shadow-sm">
          <img
            src={qr.imageUrl}
            alt="Patient Care QR for doctor scan"
            className="w-40 h-40 object-contain"
          />
        </div>
        <MotionHint />
      </div>

      <p className="text-[10px] font-semibold text-muted break-all rounded-xl bg-[#F4F7F2] border border-[#D8E0D4] px-3 py-2">
        Token · {(qr.token || '').slice(0, 8)}…
      </p>
    </div>
  );
};

function MotionHint() {
  return (
    <div className="flex-1 text-left space-y-2">
      <p className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B3D1A]">
        <ScanLine className="w-4 h-4" />
        For attending doctors only
      </p>
      <ul className="text-xs text-muted space-y-1.5 list-disc pl-4">
        <li>Opens your profile, insurance, and ABHA (if shared).</li>
        <li>Doctors must scan this Care QR — not your ABHA card QR.</li>
        <li>Referrals appear under My bed requests when a hold is created.</li>
      </ul>
    </div>
  );
}
