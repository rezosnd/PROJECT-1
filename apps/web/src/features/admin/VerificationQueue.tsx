import React, { useState } from 'react';
import { Hospital, hospitalsApi } from '../../lib/api/hospitals.api';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { useToast } from '../../components/ui/Toast';
import { Building2, Check, X, ShieldAlert } from 'lucide-react';

interface VerificationQueueProps {
  hospitals: Hospital[];
  onUpdated?: () => void;
  className?: string;
}

export const VerificationQueue: React.FC<VerificationQueueProps> = ({
  hospitals,
  onUpdated,
  className = ''
}) => {
  const { addToast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const pending = hospitals.filter((h) => h.status === 'PENDING');

  const handleVerify = async (hospitalId: string, status: 'VERIFIED' | 'REJECTED') => {
    setProcessingId(hospitalId);
    try {
      await hospitalsApi.verifyHospital(hospitalId, status);
      addToast({
        type: status === 'VERIFIED' ? 'success' : 'warning',
        title: `Hospital ${status}`,
        message: `Hospital verification status successfully updated by City Admin.`
      });
      if (onUpdated) onUpdated();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Verification Failed',
        message: err.response?.data?.error?.message || 'Could not verify hospital'
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className={`bg-white rounded-card border border-hairline/80 shadow-soft p-5 text-left ${className}`}>
      <div className="flex items-center justify-between pb-3 border-b border-hairline/60 mb-4">
        <div>
          <h3 className="font-display font-bold text-base text-ink">
            Hospital Verification Queue ({pending.length})
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Evaluate credentials and clinical licenses before onboarding into live city routing.
          </p>
        </div>
      </div>

      {pending.length === 0 ? (
        <div className="p-8 text-center text-muted text-xs">
          No pending hospital verifications in queue.
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((h) => {
            const isProcessing = processingId === h.id;
            return (
              <div
                key={h.id}
                className="p-4 bg-card rounded-2xl border border-hairline/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-ink">{h.name}</span>
                    <Chip variant="orange" dot>
                      Pending Verification
                    </Chip>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    Reg No: {h.registrationNo} • Type: {h.type} • {h.city}
                  </p>
                  <p className="text-[11px] text-ink/80 mt-1">
                    Specialties: {h.specialties?.join(', ') || 'General Medicine'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => handleVerify(h.id, 'VERIFIED')}
                    leftIcon={<Check className="w-3.5 h-3.5" />}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => handleVerify(h.id, 'REJECTED')}
                    leftIcon={<X className="w-3.5 h-3.5 text-red" />}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

