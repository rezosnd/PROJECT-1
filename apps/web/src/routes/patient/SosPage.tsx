import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, Phone, MapPin, Siren, CheckCircle2, Truck, X } from 'lucide-react';
import { sosApi, SosRequest } from '../../lib/api/sos.api';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useAuthStore } from '../../lib/auth/auth-store';

export const SosPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const { lat, lng, error: geoError, detectLocation } = useGeolocation();
  const coords = { latitude: lat, longitude: lng };
  const [note, setNote] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: history = [] } = useQuery({
    queryKey: ['sos-mine'],
    queryFn: () => sosApi.listMine(),
    enabled: isAuthenticated,
    refetchInterval: 4000,
  });

  const active =
    history.find((s) => ['OPEN', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED'].includes(s.status)) ||
    (activeId ? history.find((s) => s.id === activeId) : null);

  const { data: live } = useQuery({
    queryKey: ['sos-live', active?.id || activeId],
    queryFn: () => sosApi.getById((active?.id || activeId)!),
    enabled: Boolean(active?.id || activeId),
    refetchInterval: 3000,
  });

  const current: SosRequest | undefined = live || active || undefined;

  const createMut = useMutation({
    mutationFn: () => {
      if (!coords) throw new Error('Location required');
      return sosApi.create({
        latitude: coords.latitude,
        longitude: coords.longitude,
        note: note.trim() || undefined,
        severity: 'CRITICAL',
      });
    },
    onSuccess: (data) => {
      setActiveId(data.id);
      qc.invalidateQueries({ queryKey: ['sos-mine'] });
    },
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => sosApi.cancel(id, 'Cancelled by patient'),
    onSuccess: () => {
      setActiveId(null);
      qc.invalidateQueries({ queryKey: ['sos-mine'] });
    },
  });

  useEffect(() => {
    detectLocation();
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <Siren className="w-10 h-10 text-red mx-auto" />
        <h1 className="font-display text-2xl font-extrabold text-ink">SOS Ambulance</h1>
        <p className="text-sm text-muted">Sign in as a patient to send an emergency SOS.</p>
        <Link to="/login" className="inline-flex h-11 px-5 rounded-2xl bg-[#0B3D1A] text-[#B9F84B] text-sm font-bold items-center">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-16 space-y-6">
      <section className="rounded-[28px] overflow-hidden border border-red/20 shadow-[0_16px_48px_rgba(180,40,40,0.18)]">
        <div className="bg-gradient-to-br from-[#7A1010] via-[#B91C1C] to-[#0B3D1A] text-white px-6 py-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Emergency · Bhubaneswar</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Siren className="w-8 h-8" /> SOS
          </h1>
          <p className="mt-2 text-sm text-white/80 max-w-md">
            Nearby ambulances notified instantly. First unit to accept wins. Also call{' '}
            <a href="tel:112" className="font-extrabold underline">112</a>.
          </p>
        </div>

        <div className="bg-white px-6 py-6 space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-hairline bg-[#FFF8F8] p-4">
            <MapPin className="w-5 h-5 text-red shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Your location</p>
              {coords ? (
                <p className="text-sm font-semibold text-ink mt-0.5">
                  {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
                </p>
              ) : (
                <p className="text-sm text-orange mt-0.5">{geoError || 'Waiting for GPS…'}</p>
              )}
              <button type="button" onClick={() => detectLocation()} className="mt-1 text-xs font-bold text-[#0B3D1A] underline">
                Refresh location
              </button>
            </div>
          </div>

          {!current || ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(current.status) ? (
            <>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="What happened? (optional)"
                className="w-full rounded-2xl border border-hairline px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red/30"
              />
              <button
                type="button"
                disabled={!coords || createMut.isPending}
                onClick={() => createMut.mutate()}
                className="w-full h-14 rounded-2xl bg-[#B91C1C] hover:bg-[#991B1B] disabled:opacity-50 text-white font-display text-lg font-extrabold inline-flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-5 h-5" />
                {createMut.isPending ? 'Notifying ambulances…' : 'SEND SOS'}
              </button>
            </>
          ) : (
            <SosLiveCard sos={current} onCancel={() => cancelMut.mutate(current.id)} cancelling={cancelMut.isPending} />
          )}

          <a href="tel:112" className="w-full h-12 rounded-2xl border-2 border-[#0B3D1A] text-[#0B3D1A] font-bold inline-flex items-center justify-center gap-2">
            <Phone className="w-4 h-4" /> Call 112 now
          </a>
        </div>
      </section>
    </div>
  );
};

function SosLiveCard({ sos, onCancel, cancelling }: { sos: SosRequest; onCancel: () => void; cancelling: boolean }) {
  const accepted = Boolean(sos.ambulance?.callSign);
  return (
    <div className="rounded-2xl border border-red/20 bg-[#FFF5F5] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-red">Live · {sos.status}</span>
        <span className="text-xs font-bold text-muted">{sos.notifiedAmbulances ?? sos.notifiedCount ?? 0} notified</span>
      </div>
      <p className="text-sm text-ink">{sos.guidance || 'Waiting for first ambulance…'}</p>
      {accepted ? (
        <div className="rounded-xl bg-white border border-[#0B3D1A]/15 p-4 space-y-1">
          <p className="text-xs font-bold text-[#0B3D1A] flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Accepted</p>
          <p className="font-display text-xl font-extrabold flex items-center gap-2"><Truck className="w-5 h-5" />{sos.ambulance?.callSign}</p>
          <p className="text-sm text-muted">Vehicle {sos.ambulance?.vehicleNo} · {sos.ambulance?.type}</p>
          {sos.ambulance?.driverName && <p className="text-sm font-semibold">Driver: {sos.ambulance.driverName}</p>}
          {sos.ambulance?.phone && (
            <a href={`tel:${sos.ambulance.phone}`} className="inline-flex items-center gap-1 text-sm font-bold text-[#0B3D1A]">
              <Phone className="w-3.5 h-3.5" />{sos.ambulance.phone}
            </a>
          )}
        </div>
      ) : (
        <p className="text-sm font-semibold text-orange">Broadcasting (first-come-first-serve)…</p>
      )}
      <button type="button" onClick={onCancel} disabled={cancelling} className="w-full h-10 rounded-xl border text-xs font-bold text-muted inline-flex items-center justify-center gap-1">
        <X className="w-3.5 h-3.5" /> Cancel SOS
      </button>
    </div>
  );
}
