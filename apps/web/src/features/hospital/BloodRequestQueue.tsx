import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bloodApi, BloodRequest } from '../../lib/api/blood.api';
import { Check, X, PackageCheck, Droplets } from 'lucide-react';

function HoldCountdown({ expiresAt }: { expiresAt?: string }) {
  const [left, setLeft] = useState(() => {
    if (!expiresAt) return 0;
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  });
  React.useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => {
      setLeft(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  if (!expiresAt) return null;
  const m = Math.floor(left / 60);
  const s = left % 60;
  return (
    <span className={`text-xs font-bold ${left < 120 ? 'text-red-600' : 'text-amber-700'}`}>
      Hold {m}:{String(s).padStart(2, '0')}
    </span>
  );
}

export const BloodRequestQueue: React.FC<{ hospitalId: string }> = ({ hospitalId }) => {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['blood-queue', hospitalId],
    queryFn: () => bloodApi.getHospitalQueue(hospitalId),
    refetchInterval: 2000,
  });

  const decideMut = useMutation({
    mutationFn: ({
      id,
      decision,
      reason,
    }: {
      id: string;
      decision: 'APPROVE' | 'REJECT' | 'ISSUE';
      reason?: string;
    }) => bloodApi.decide(id, decision, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blood-queue', hospitalId] });
      qc.invalidateQueries({ queryKey: ['hospital-blood', hospitalId] });
    },
  });

  const pending = rows.filter((r) => r.status === 'PENDING' || r.status === 'APPROVED');

  if (isLoading) return <div className="p-6 text-sm text-muted">Loading blood requests…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-extrabold text-ink">Reception · blood holds</h2>
          <p className="text-sm text-muted">
            Patient holds units at the desk. Crossmatch, then Issue. {pending.length} active.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#B9F84B] px-3 py-1 text-xs font-bold text-[#0B3D1A]">
          <Droplets className="w-3.5 h-3.5" /> Blood queue
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-[#D8E0D4] bg-white p-10 text-center text-sm text-muted">
          No blood requests yet. Patients hold units from Find Blood.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <BloodRow
              key={r.id}
              request={r}
              busy={decideMut.isPending}
              onDecide={(decision, reason) => decideMut.mutate({ id: r.id, decision, reason })}
            />
          ))}
        </div>
      )}
    </div>
  );
};

function BloodRow({
  request: r,
  busy,
  onDecide,
}: {
  request: BloodRequest;
  busy: boolean;
  onDecide: (d: 'APPROVE' | 'REJECT' | 'ISSUE', reason?: string) => void;
}) {
  const actionable = r.status === 'PENDING' || r.status === 'APPROVED';
  return (
    <div className="rounded-[20px] border border-[#D8E0D4] bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-bold text-ink text-lg">{r.patientName || 'Patient'}</div>
          <div className="text-sm text-muted mt-0.5">
            Needs <span className="font-bold text-ink">{r.unitsRequested}× {r.bloodGroup} {r.component}</span>
            {r.patientBloodGroup ? ` · patient type ${r.patientBloodGroup}` : ''}
          </div>
          <div className="text-xs text-muted mt-1">
            {r.urgency} · {r.patientMobile || 'no phone'} · {r.doctorName || 'no referring doctor'}
          </div>
          {r.reason ? <p className="text-sm text-ink mt-2">{r.reason}</p> : null}
        </div>
        <div className="text-right space-y-1">
          <span className="inline-block rounded-full bg-[#F4F7F2] px-2.5 py-1 text-[10px] font-extrabold text-ink">
            {r.status}
          </span>
          {(r.status === 'PENDING' || r.status === 'APPROVED') && (
            <div>
              <HoldCountdown expiresAt={r.holdExpiresAt} />
            </div>
          )}
        </div>
      </div>

      {actionable && (
        <div className="flex flex-wrap gap-2 pt-1">
          {r.status === 'PENDING' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onDecide('APPROVE')}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#B9F84B] px-3 py-1.5 text-xs font-bold text-[#0B3D1A]"
            >
              <Check className="w-3.5 h-3.5" /> Approve hold
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => onDecide('ISSUE', 'Issued after crossmatch')}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0B3D1A] px-3 py-1.5 text-xs font-bold text-[#B9F84B]"
          >
            <PackageCheck className="w-3.5 h-3.5" /> Issue units
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              const reason = window.prompt('Rejection reason') || 'Rejected at reception';
              onDecide('REJECT', reason);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700"
          >
            <X className="w-3.5 h-3.5" /> Reject
          </button>
        </div>
      )}
    </div>
  );
}
