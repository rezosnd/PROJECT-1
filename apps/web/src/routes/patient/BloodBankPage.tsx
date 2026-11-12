import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bloodApi, BloodGroup, BloodComponent, BloodBankCard } from '../../lib/api/blood.api';
import { useAuthStore } from '../../lib/auth/auth-store';
import { Droplets, MapPin, Phone, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

const GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const COMPONENTS: { code: BloodComponent; label: string }[] = [
  { code: 'PRBC', label: 'Packed RBC' },
  { code: 'WHOLE_BLOOD', label: 'Whole blood' },
  { code: 'FFP', label: 'Plasma (FFP)' },
  { code: 'PLATELETS', label: 'Platelets' },
  { code: 'CRYOPRECIPITATE', label: 'Cryo' },
];

const BBSR = { lat: 20.2961, lng: 85.8245 };

export const BloodBankPage: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const qc = useQueryClient();
  const defaultGroup = (user?.profile?.bloodGroup as BloodGroup) || 'O+';
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>(
    GROUPS.includes(defaultGroup) ? defaultGroup : 'O+'
  );
  const [component, setComponent] = useState<BloodComponent>('PRBC');
  const [units, setUnits] = useState(1);
  const [urgency, setUrgency] = useState<'NORMAL' | 'URGENT' | 'CRITICAL'>('URGENT');
  const [reason, setReason] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [selected, setSelected] = useState<BloodBankCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['blood-banks', bloodGroup, component],
    queryFn: () =>
      bloodApi.searchBanks({
        lat: BBSR.lat,
        lng: BBSR.lng,
        bloodGroup,
        component,
        radiusKm: 30,
      }),
  });

  const holdMut = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('Select a blood bank');
      return bloodApi.createRequest({
        hospitalId: selected.hospitalId,
        bloodGroup,
        component,
        unitsRequested: units,
        urgency,
        reason: reason || undefined,
        doctorName: doctorName || undefined,
      });
    },
    onSuccess: (req) => {
      setOk(`30-min hold placed at ${req.hospitalName || selected?.name}. Reception will confirm.`);
      setError(null);
      setSelected(null);
      qc.invalidateQueries({ queryKey: ['my-blood-requests'] });
      refetch();
    },
    onError: (e: any) => {
      setOk(null);
      setError(e.response?.data?.error?.message || e.message || 'Could not hold units');
    },
  });

  const banks = data?.banks || [];
  const compatible = data?.compatibleDonors;

  const stockHint = useMemo(() => {
    if (!selected) return null;
    const row = selected.stock.find((s) => s.bloodGroup === bloodGroup && s.component === component);
    return row?.unitsAvailable ?? 0;
  }, [selected, bloodGroup, component]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <section className="rounded-[28px] bg-[#0B3D1A] p-6 md:p-8 text-white overflow-hidden relative">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold text-[#B9F84B]">
            <Droplets className="w-4 h-4" /> Blood bank · 30-min hold
          </div>
          <h1 className="mt-3 text-3xl md:text-4xl font-display font-extrabold tracking-tight">
            Find blood near you
          </h1>
          <p className="mt-2 text-sm text-white/75 leading-relaxed">
            See which hospitals have your group in stock. Hold units for reception — not a permanent
            booking. Crossmatch still required before transfusion.
          </p>
        </div>
      </section>

      <div className="rounded-[24px] border border-[#D8E0D4] bg-white p-5 space-y-4">
        <div className="text-xs font-bold uppercase text-muted">Blood group needed</div>
        <div className="flex flex-wrap gap-2">
          {GROUPS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setBloodGroup(g)}
              className={`px-3 py-1.5 rounded-full text-sm font-bold border ${
                bloodGroup === g
                  ? 'bg-[#0B3D1A] text-[#B9F84B] border-[#0B3D1A]'
                  : 'border-[#D8E0D4] text-ink'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        <div className="text-xs font-bold uppercase text-muted">Component</div>
        <div className="flex flex-wrap gap-2">
          {COMPONENTS.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => setComponent(c.code)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                component === c.code
                  ? 'bg-[#B9F84B] text-[#0B3D1A] border-[#B9F84B]'
                  : 'border-[#D8E0D4] text-ink'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        {compatible && (
          <p className="text-xs text-muted">
            Compatible donor groups for {bloodGroup}: {compatible.join(', ')}
          </p>
        )}
      </div>

      {(error || ok) && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm font-medium ${
            error ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
          }`}
        >
          {error || ok}{' '}
          {ok && (
            <Link to="/requests" className="underline font-bold">
              View my requests
            </Link>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-xl text-ink">
              {isFetching ? 'Searching…' : `${banks.length} blood banks`}
            </h2>
            <button type="button" onClick={() => refetch()} className="text-xs font-bold text-[#0B3D1A]">
              Refresh
            </button>
          </div>
          {banks.map((b) => {
            const avail =
              b.stock.find((s) => s.bloodGroup === bloodGroup && s.component === component)
                ?.unitsAvailable ?? 0;
            const on = selected?.hospitalId === b.hospitalId;
            return (
              <button
                key={b.hospitalId}
                type="button"
                onClick={() => setSelected(b)}
                className={`w-full text-left rounded-[22px] border p-4 transition ${
                  on ? 'border-[#0B3D1A] bg-[#F4F7F2] ring-2 ring-[#B9F84B]' : 'border-[#D8E0D4] bg-white'
                }`}
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <div className="font-bold text-ink">{b.name}</div>
                    <div className="text-xs text-muted mt-1 inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {b.distanceKm} km · {b.address}
                    </div>
                    {b.bloodBankPhone && (
                      <div className="text-xs text-muted mt-1 inline-flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> {b.bloodBankPhone}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-extrabold text-[#0B3D1A]">{avail}</div>
                    <div className="text-[10px] font-bold text-muted uppercase">
                      {bloodGroup} {component}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
          {!isFetching && banks.length === 0 && (
            <div className="rounded-[22px] border border-dashed border-[#D8E0D4] p-8 text-center text-sm text-muted">
              No bank with {bloodGroup} {component} in range. Try another component or widen search later.
            </div>
          )}
        </div>

        <aside className="lg:col-span-2">
          <div className="rounded-[24px] border border-[#D8E0D4] bg-white p-5 space-y-4 sticky top-20">
            <h3 className="font-display font-bold text-lg text-ink">Hold at reception</h3>
            {!selected ? (
              <p className="text-sm text-muted">Select a blood bank to place a 30-minute hold.</p>
            ) : (
              <>
                <p className="text-sm text-ink font-semibold">{selected.name}</p>
                <p className="text-xs text-muted">{stockHint} units available right now</p>
                <label className="block text-xs font-bold text-muted uppercase">
                  Units
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={units}
                    onChange={(e) => setUnits(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-[#D8E0D4] px-3 py-2 text-sm"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['NORMAL', 'URGENT', 'CRITICAL'] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUrgency(u)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                        urgency === u
                          ? 'bg-[#0B3D1A] text-[#B9F84B] border-[#0B3D1A]'
                          : 'border-[#D8E0D4]'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
                <input
                  className="w-full rounded-xl border border-[#D8E0D4] px-3 py-2 text-sm"
                  placeholder="Referring doctor (optional)"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                />
                <textarea
                  className="w-full rounded-xl border border-[#D8E0D4] px-3 py-2 text-sm min-h-[80px]"
                  placeholder="Clinical reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-900">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  Hold reserves stock for 30 minutes. Hospital reception must approve & issue after
                  crossmatch.
                </div>
                <button
                  type="button"
                  disabled={!isAuthenticated || holdMut.isPending}
                  onClick={() => holdMut.mutate()}
                  className="w-full rounded-full bg-[#B9F84B] py-3 text-sm font-extrabold text-[#0B3D1A] disabled:opacity-50"
                >
                  {!isAuthenticated
                    ? 'Sign in to hold'
                    : holdMut.isPending
                      ? 'Holding…'
                      : `Hold ${units}× ${bloodGroup}`}
                </button>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
