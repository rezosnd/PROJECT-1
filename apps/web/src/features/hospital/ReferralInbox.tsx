import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { referralsApi } from '../../lib/api/referrals.api';
import { Stethoscope, AlertTriangle, BedDouble } from 'lucide-react';

export const ReferralInbox: React.FC<{ hospitalId: string }> = ({ hospitalId }) => {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['hospital-referrals', hospitalId],
    queryFn: () => referralsApi.hospitalInbox(hospitalId),
    refetchInterval: 5000,
    enabled: Boolean(hospitalId),
  });

  if (isLoading) return <p className="text-sm text-muted py-8 text-center">Loading doctor referrals…</p>;
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-hairline py-12 text-center text-sm text-muted">
        No inbound doctor referrals yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((r: any) => {
        const emergency = /emerg|critical|trauma|cardiac|stroke/i.test(
          `${r.priority || ''} ${r.reason || ''} ${r.clinicalNotes || ''}`
        );
        return (
          <article
            key={r.id}
            className={`rounded-2xl border bg-white p-4 ${
              emergency ? 'border-red/40 shadow-[0_8px_24px_rgba(185,28,28,0.12)]' : 'border-hairline'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#0B3D1A] flex items-center gap-1">
                  <Stethoscope className="w-3.5 h-3.5" /> Referred by doctor
                </p>
                <h3 className="font-display font-bold text-ink mt-1 truncate">
                  {r.patientName || 'Patient'} · {r.departmentName || r.toDepartmentName || 'Department'}
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Dr. {r.doctorName || '—'} · {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}
                </p>
              </div>
              {emergency && (
                <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red text-white text-[10px] font-extrabold uppercase">
                  <AlertTriangle className="w-3 h-3" /> Emergency
                </span>
              )}
            </div>
            {(r.reason || r.clinicalNotes) && (
              <p className="mt-3 text-sm text-ink">{r.reason || r.clinicalNotes}</p>
            )}
            {(r.bedHoldId || r.wardType) && (
              <p className="mt-2 text-xs font-bold text-[#0B3D1A] inline-flex items-center gap-1">
                <BedDouble className="w-3.5 h-3.5" />
                Bed hold {r.wardType || ''} · {r.status || r.bedHoldStatus || 'HELD'}
              </p>
            )}
            {Array.isArray(r.patientSnapshot?.insurance) && r.patientSnapshot.insurance.length > 0 && (
              <p className="mt-2 text-xs font-semibold text-ink">
                Insurance:{' '}
                {r.patientSnapshot.insurance
                  .map((p: any) => p.insurerName || p.name || p.insurerId)
                  .filter(Boolean)
                  .join(', ')}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
};
