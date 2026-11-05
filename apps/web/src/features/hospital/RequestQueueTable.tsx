import React, { useState, useEffect } from 'react';
import { BedRequest, bedsApi } from '../../lib/api/beds.api';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { useToast } from '../../components/ui/Toast';
import { Volume2, VolumeX, Clock, ShieldCheck, Check, X, UserCheck } from 'lucide-react';

interface RequestQueueTableProps {
  requests: BedRequest[];
  onDecided?: () => void;
  className?: string;
}

function HoldTimer({ expiresAt }: { expiresAt: string | undefined }) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!expiresAt) return;

    const calc = () => {
      const now = new Date().getTime();
      const target = new Date(expiresAt).getTime();
      const diffSec = Math.max(0, Math.floor((target - now) / 1000));

      if (diffSec <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const m = Math.floor(diffSec / 60);
      const s = diffSec % 60;
      setTimeLeft(`${m}:${s < 10 ? '0' : ''}${s}`);
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt) return <span className="text-muted text-xs">—</span>;

  const isExpiringSoon = timeLeft !== 'Expired' && Number(timeLeft.split(':')[0]) < 3;

  return (
    <span
      className={`font-mono text-xs font-bold px-2 py-0.5 rounded-pill ${
        timeLeft === 'Expired'
          ? 'bg-red-light text-red'
          : isExpiringSoon
          ? 'bg-orange-light text-orange animate-pulse'
          : 'bg-blue-light text-blue'
      }`}
    >
      {timeLeft}
    </span>
  );
}

export const RequestQueueTable: React.FC<RequestQueueTableProps> = ({
  requests,
  onDecided,
  className = ''
}) => {
  const { addToast } = useToast();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleDecision = async (id: string, decision: 'APPROVED' | 'REJECTED' | 'ADMITTED') => {
    setProcessingId(id);
    try {
      await bedsApi.decideBedRequest(id, decision);
      addToast({
        type: decision === 'APPROVED' ? 'success' : decision === 'ADMITTED' ? 'info' : 'warning',
        title: `Request ${decision.toLowerCase()}`,
        message: `Patient bed request was successfully updated.`
      });
      if (onDecided) onDecided();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Action Failed',
        message: err.response?.data?.error?.message || 'Could not update request status'
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className={`bg-white rounded-card border border-hairline/80 shadow-soft overflow-hidden text-left ${className}`}>
      {/* Table Action Header */}
      <div className="p-4 border-b border-hairline/60 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-bold text-base text-ink">
            Live Emergency Bed Queue ({requests.length})
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Incoming reservations require immediate triage decisions within 15-minute hold windows.
          </p>
        </div>

        {/* Audio Alert Toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-semibold border transition-all ${
            soundEnabled
              ? 'bg-blue-light text-blue border-blue/20'
              : 'bg-card text-muted border-hairline'
          }`}
          title={soundEnabled ? 'Mute request alerts' : 'Enable audio alerts'}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span>{soundEnabled ? 'Audio Alerts ON' : 'Muted'}</span>
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="p-8 text-center text-muted text-xs">
          No pending bed requests at this time. Live queue automatically refreshes via WebSockets.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-card-soft text-muted font-semibold uppercase tracking-wider text-[10px] border-b border-hairline/60">
              <tr>
                <th className="py-3 px-4">Patient / ABHA</th>
                <th className="py-3 px-4">Ward</th>
                <th className="py-3 px-4">Urgency</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Hold Timer</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline/60 text-ink">
              {requests.map((r) => {
                const isProcessing = processingId === r.id;
                return (
                  <tr key={r.id} className="hover:bg-card-soft/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-ink block">{r.patientName || 'Emergency Citizen'}</span>
                      {r.patientEmail && (
                        <span className="text-[11px] text-muted block truncate max-w-[200px]">{r.patientEmail}</span>
                      )}
                      {r.shareAbha && (r.maskedAbha || (r as any).abha?.maskedNumber) ? (
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[10px] text-teal font-mono bg-teal/10 px-2 py-0.5 rounded-md font-bold">
                            <ShieldCheck className="w-3.5 h-3.5 text-teal" />
                            {r.maskedAbha || (r as any).abha?.maskedNumber}
                          </span>
                          <span className="text-[10px] bg-green/10 text-green px-1.5 py-0.5 rounded-full font-bold">
                            Zero-Paperwork Triage
                          </span>
                          {(r as any).abha?.abhaAddress && (
                            <span className="text-[10px] text-slate-500 font-mono block">
                              {(r as any).abha.abhaAddress}
                            </span>
                          )}
                        </div>
                      ) : r.shareAbha ? (
                        <span className="text-[10px] text-teal block mt-0.5 font-semibold">Consent Shared (ABHA linking pending)</span>
                      ) : (
                        <span className="text-[10px] text-muted block mt-0.5">ABHA Not Shared (Standard Admission)</span>
                      )}
                      {(r as any).patientProfile && (
                        <div className="mt-1.5 text-[10px] text-slate-600 space-y-0.5 max-w-[240px]">
                          {(r as any).patientProfile.bloodGroup && (
                            <div><span className="font-semibold">Blood:</span> {(r as any).patientProfile.bloodGroup}
                              {(r as any).patientProfile.gender ? ` · ${(r as any).patientProfile.gender}` : ''}
                              {(r as any).patientProfile.ageYears != null ? ` · Age ${(r as any).patientProfile.ageYears}` : ''}
                            </div>
                          )}
                          {(r as any).patientProfile.emergencyContactPhone && (
                            <div>
                              <span className="font-semibold">Emergency:</span>{' '}
                              {(r as any).patientProfile.emergencyContactName || 'Contact'} · {(r as any).patientProfile.emergencyContactPhone}
                            </div>
                          )}
                          {(r as any).patientProfile.allergies && (
                            <div className="text-orange font-semibold">Allergies: {(r as any).patientProfile.allergies}</div>
                          )}
                          {(r as any).patientProfile.addressLine && (
                            <div className="truncate">{(r as any).patientProfile.cityName || ''} · {(r as any).patientProfile.addressLine}</div>
                          )}
                        </div>
                      )}
                      {r.note && <p className="text-[11px] text-muted mt-1 italic max-w-xs">&ldquo;{r.note}&rdquo;</p>}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-ink">{r.wardType}</td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold px-2 py-0.5 rounded-pill text-[10px] ${
                          r.urgency === 'IMMEDIATE'
                            ? 'bg-red-light text-red'
                            : r.urgency === 'HIGH'
                            ? 'bg-orange-light text-orange'
                            : 'bg-card-soft text-muted'
                        }`}
                      >
                        {r.urgency}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`font-bold px-2 py-0.5 rounded-pill text-[10px] ${
                          r.status === 'APPROVED'
                            ? 'bg-green-light text-green'
                            : r.status === 'PENDING'
                            ? 'bg-orange-light text-orange'
                            : r.status === 'ADMITTED'
                            ? 'bg-blue-light text-blue'
                            : 'bg-card-soft text-muted'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {r.status === 'APPROVED' ? (
                        <HoldTimer expiresAt={r.holdExpiresAt} />
                      ) : (
                        <span className="text-muted text-[11px]">
                          {r.status === 'ADMITTED' ? 'Patient Admitted' : '—'}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {r.status === 'PENDING' && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={isProcessing}
                            onClick={() => handleDecision(r.id, 'APPROVED')}
                            leftIcon={<Check className="w-3 h-3" />}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isProcessing}
                            onClick={() => handleDecision(r.id, 'REJECTED')}
                            leftIcon={<X className="w-3 h-3 text-red" />}
                          >
                            Decline
                          </Button>
                        </>
                      )}

                      {r.status === 'APPROVED' && (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={isProcessing}
                          onClick={() => handleDecision(r.id, 'ADMITTED')}
                          leftIcon={<UserCheck className="w-3 h-3" />}
                        >
                          Admit Patient
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

