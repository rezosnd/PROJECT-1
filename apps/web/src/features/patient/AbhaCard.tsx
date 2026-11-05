import React, { useMemo, useState } from 'react';
import { AbhaProfile } from '../../lib/api/abha.api';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { Modal } from '../../components/ui/Modal';
import { ShieldCheck, Trash2, CheckCircle2, Maximize2 } from 'lucide-react';

interface AbhaCardProps {
  profile: AbhaProfile;
  onUnlink: () => Promise<void>;
  className?: string;
}

function fallbackQrUrl(profile: AbhaProfile) {
  const payload =
    profile.qrPayload ||
    JSON.stringify({
      type: 'ABHA',
      number: profile.maskedNumber || '',
      address: profile.abhaAddress || '',
      name: profile.name || '',
      yob: profile.yearOfBirth || (profile.dob ? String(profile.dob).slice(0, 4) : ''),
      source: 'GetMyHospital',
    });
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=${encodeURIComponent(payload)}`;
}

export const AbhaCard: React.FC<AbhaCardProps> = ({ profile, onUnlink, className = '' }) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);

  const qrUri = useMemo(
    () => profile.qrImageUrl || fallbackQrUrl(profile),
    [profile.qrImageUrl, profile.qrPayload, profile.maskedNumber, profile.abhaAddress, profile.name]
  );

  const handleConfirmUnlink = async () => {
    setIsUnlinking(true);
    try {
      await onUnlink();
      setIsConfirmOpen(false);
    } finally {
      setIsUnlinking(false);
    }
  };

  return (
    <>
      <div
        className={`w-full max-w-md mx-auto bg-gradient-to-br from-[#0B2A5B] to-[#1E3A6C] text-white rounded-3xl p-6 shadow-float border border-white/10 relative overflow-hidden text-left ${className}`}
      >
        <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />

        <div className="flex items-start justify-between gap-3 mb-5 relative z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            {profile.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={profile.name || 'ABHA'}
                className="w-12 h-12 rounded-full object-cover border-2 border-emerald-300/70 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20 shrink-0">
                <ShieldCheck className="w-5 h-5 text-green-300" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                National Health Authority · ABDM
              </p>
              <h3 className="font-display font-extrabold text-base tracking-tight text-white truncate">
                {profile.name || 'Ayushman Bharat Health Card'}
              </h3>
            </div>
          </div>

          <Chip variant="green" className="text-[10px] uppercase font-bold tracking-wider shrink-0">
            {profile.badge || 'Verified'}
          </Chip>
        </div>

        <div className="mb-5 relative z-10">
          <span className="text-[11px] font-medium text-white/70 block uppercase tracking-wider mb-1">
            ABHA Number
          </span>
          <span className="font-mono font-bold text-2xl tracking-widest text-white block">
            {profile.maskedNumber}
          </span>
        </div>

        <div className="flex items-end justify-between gap-4 pt-4 border-t border-white/15 relative z-10">
          <div className="space-y-1.5 min-w-0">
            <div>
              <span className="text-[10px] text-white/60 uppercase block">ABHA Address</span>
              <span className="text-xs font-semibold text-teal-200 block truncate max-w-[200px]">
                {profile.abhaAddress || '—'}
              </span>
            </div>
            {(profile.gender || profile.dob) && (
              <div className="flex gap-3">
                {profile.gender && (
                  <div>
                    <span className="text-[10px] text-white/60 uppercase block">Gender</span>
                    <span className="text-xs font-semibold text-white">{profile.gender}</span>
                  </div>
                )}
                {profile.dob && (
                  <div>
                    <span className="text-[10px] text-white/60 uppercase block">DOB</span>
                    <span className="text-xs font-semibold text-white">
                      {String(profile.dob).slice(0, 10)}
                    </span>
                  </div>
                )}
              </div>
            )}
            {profile.mobile && (
              <div>
                <span className="text-[10px] text-white/60 uppercase block">Mobile</span>
                <span className="text-xs font-semibold text-white">{profile.mobile}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setQrOpen(true)}
            className="relative w-[72px] h-[72px] bg-white rounded-xl p-1.5 flex items-center justify-center shrink-0 shadow-soft hover:scale-[1.03] transition"
            aria-label="Enlarge ABHA QR"
          >
            <img src={qrUri} alt="ABHA QR" className="w-full h-full object-contain" />
            <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-50 text-navy flex items-center justify-center">
              <Maximize2 className="w-2.5 h-2.5" />
            </span>
          </button>
        </div>

        <div className="mt-4 pt-3 flex items-center justify-between text-xs text-white/80 border-t border-white/10">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            QR saved · Active Digital Health ID
          </span>
          <button
            onClick={() => setIsConfirmOpen(true)}
            className="inline-flex items-center gap-1 text-[11px] text-red-200 hover:text-white transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Unlink
          </button>
        </div>
      </div>

      <Modal
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        title="Scan ABHA QR"
        description={profile.abhaAddress || profile.maskedNumber}
      >
        <div className="flex flex-col items-center gap-3 py-2">
          <img src={qrUri} alt="ABHA QR large" className="w-56 h-56 bg-white rounded-xl p-2 border border-hairline" />
          <p className="text-xs text-muted text-center">
            Show this at hospital intake. QR payload is stored with your GetMyHospital ABHA link.
          </p>
          <Button variant="outline" size="sm" onClick={() => setQrOpen(false)}>
            Close
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Unlink ABHA Account"
        description="Remove ABHA identity from GetMyHospital?"
      >
        <p className="text-xs text-muted leading-relaxed mb-4">
          Unlinking deletes your encrypted ABHA credentials and stored QR from this platform.
        </p>
        <div className="flex items-center justify-end gap-2.5">
          <Button variant="outline" size="sm" onClick={() => setIsConfirmOpen(false)} disabled={isUnlinking}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={handleConfirmUnlink} isLoading={isUnlinking}>
            Confirm Unlink
          </Button>
        </div>
      </Modal>
    </>
  );
};
