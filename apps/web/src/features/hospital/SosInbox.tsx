import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { sosApi } from '../../lib/api/sos.api';
import { Siren, Truck } from 'lucide-react';

export const SosInbox: React.FC<{ hospitalId: string }> = ({ hospitalId }) => {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['hospital-sos', hospitalId],
    queryFn: () => sosApi.hospitalInbox(hospitalId),
    refetchInterval: 4000,
    enabled: Boolean(hospitalId),
  });

  if (isLoading) return <p className="text-sm text-muted py-8 text-center">Loading SOS…</p>;
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-hairline py-12 text-center text-sm text-muted">
        No nearby / inbound SOS events.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((s) => (
        <article key={s.id} className="rounded-2xl border border-red/25 bg-[#FFF8F8] p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-red flex items-center gap-1">
              <Siren className="w-3.5 h-3.5" /> SOS · {s.status}
            </p>
            <span className="text-xs text-muted">{s.createdAt ? new Date(s.createdAt).toLocaleString() : ''}</span>
          </div>
          <p className="mt-2 font-bold text-ink">{s.note || 'Patient emergency SOS'}</p>
          {s.ambulance?.callSign ? (
            <p className="mt-2 text-sm font-semibold text-[#0B3D1A] inline-flex items-center gap-1.5">
              <Truck className="w-4 h-4" />
              {s.ambulance.callSign} · {s.ambulance.vehicleNo} · {s.ambulance.driverName || 'driver'}
            </p>
          ) : (
            <p className="mt-2 text-sm text-orange font-semibold">Awaiting ambulance accept…</p>
          )}
        </article>
      ))}
    </div>
  );
};
