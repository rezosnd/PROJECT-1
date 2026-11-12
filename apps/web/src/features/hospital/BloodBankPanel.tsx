import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bloodApi, BloodGroup, BloodComponent } from '../../lib/api/blood.api';
import { Droplets, Save, Phone } from 'lucide-react';

const GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const COMPONENTS: { code: BloodComponent; label: string }[] = [
  { code: 'PRBC', label: 'Packed RBC' },
  { code: 'WHOLE_BLOOD', label: 'Whole blood' },
  { code: 'FFP', label: 'FFP' },
  { code: 'PLATELETS', label: 'Platelets' },
  { code: 'CRYOPRECIPITATE', label: 'Cryo' },
];

export const BloodBankPanel: React.FC<{ hospitalId: string }> = ({ hospitalId }) => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['hospital-blood', hospitalId],
    queryFn: () => bloodApi.getHospital(hospitalId),
    refetchInterval: 8000,
  });

  const [hasBank, setHasBank] = useState(true);
  const [phone, setPhone] = useState('');
  const [hours, setHours] = useState('');
  const [editGroup, setEditGroup] = useState<BloodGroup>('O+');
  const [editComponent, setEditComponent] = useState<BloodComponent>('PRBC');
  const [unitsTotal, setUnitsTotal] = useState(10);
  const [msg, setMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (!data) return;
    setHasBank(Boolean(data.hasBloodBank));
    setPhone(data.bloodBankPhone || '');
    setHours(data.bloodBankHours || '');
  }, [data?.hasBloodBank, data?.bloodBankPhone, data?.bloodBankHours]);

  const settingsMut = useMutation({
    mutationFn: () =>
      bloodApi.updateSettings(hospitalId, {
        hasBloodBank: hasBank,
        bloodBankPhone: phone || null,
        bloodBankHours: hours || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hospital-blood', hospitalId] });
      setMsg('Blood bank settings saved');
    },
    onError: (e: any) => setMsg(e.response?.data?.error?.message || e.message),
  });

  const stockMut = useMutation({
    mutationFn: () =>
      bloodApi.upsertStock(hospitalId, {
        bloodGroup: editGroup,
        component: editComponent,
        unitsTotal,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hospital-blood', hospitalId] });
      setMsg(`Updated ${editGroup} ${editComponent}`);
    },
    onError: (e: any) => setMsg(e.response?.data?.error?.message || e.message),
  });

  const matrix = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of data?.stock || []) {
      map.set(`${s.bloodGroup}|${s.component}`, s.unitsAvailable);
    }
    return map;
  }, [data?.stock]);

  if (isLoading) {
    return <div className="p-6 text-sm text-muted">Loading blood bank…</div>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[24px] bg-[#0B3D1A] text-[#B9F84B] p-5 flex flex-wrap gap-4 items-start justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
            <Droplets className="w-4 h-4" /> Blood bank desk
          </div>
          <h2 className="mt-2 text-2xl font-display font-extrabold text-white">
            {data?.name || 'Hospital'} inventory
          </h2>
          <p className="mt-1 text-sm text-white/70 max-w-xl">
            Reception holds units for 30 minutes. Approve after screening, then Issue after crossmatch.
          </p>
        </div>
        <div className="text-right text-white">
          <div className="text-3xl font-extrabold">{data?.summary?.totalAvailable ?? 0}</div>
          <div className="text-xs text-white/60">units available now</div>
        </div>
      </div>

      {msg && (
        <div className="rounded-2xl border border-[#D8E0D4] bg-white px-4 py-3 text-sm text-ink">{msg}</div>
      )}

      <div className="rounded-[22px] border border-[#D8E0D4] bg-white p-5 space-y-4">
        <h3 className="font-bold text-ink">Bank settings</h3>
        <label className="flex items-center gap-3 text-sm font-semibold text-ink">
          <input type="checkbox" checked={hasBank} onChange={(e) => setHasBank(e.target.checked)} />
          This hospital operates a blood bank
        </label>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-xs font-bold text-muted uppercase">
            Blood bank phone
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-[#D8E0D4] px-3 py-2">
              <Phone className="w-4 h-4 text-muted" />
              <input
                className="flex-1 outline-none text-sm text-ink"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91…"
              />
            </div>
          </label>
          <label className="text-xs font-bold text-muted uppercase">
            Hours
            <input
              className="mt-1 w-full rounded-xl border border-[#D8E0D4] px-3 py-2 text-sm text-ink outline-none"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="24x7 Emergency"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => settingsMut.mutate()}
          disabled={settingsMut.isPending}
          className="inline-flex items-center gap-2 rounded-full bg-[#B9F84B] px-4 py-2 text-sm font-bold text-[#0B3D1A]"
        >
          <Save className="w-4 h-4" /> Save settings
        </button>
      </div>

      <div className="rounded-[22px] border border-[#D8E0D4] bg-white p-5 space-y-4">
        <h3 className="font-bold text-ink">Update stock</h3>
        <div className="flex flex-wrap gap-2">
          {GROUPS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setEditGroup(g)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                editGroup === g
                  ? 'bg-[#0B3D1A] text-[#B9F84B] border-[#0B3D1A]'
                  : 'bg-white text-ink border-[#D8E0D4]'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {COMPONENTS.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => setEditComponent(c.code)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                editComponent === c.code
                  ? 'bg-[#0B3D1A] text-[#B9F84B] border-[#0B3D1A]'
                  : 'bg-white text-ink border-[#D8E0D4]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-bold text-muted uppercase">
            Units total
            <input
              type="number"
              min={0}
              className="mt-1 block w-28 rounded-xl border border-[#D8E0D4] px-3 py-2 text-sm"
              value={unitsTotal}
              onChange={(e) => setUnitsTotal(Number(e.target.value))}
            />
          </label>
          <button
            type="button"
            onClick={() => stockMut.mutate()}
            disabled={stockMut.isPending || !hasBank}
            className="rounded-full bg-[#0B3D1A] px-4 py-2 text-sm font-bold text-[#B9F84B] disabled:opacity-50"
          >
            Save stock row
          </button>
        </div>
      </div>

      <div className="rounded-[22px] border border-[#D8E0D4] bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#F4F7F2] text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Group</th>
              {COMPONENTS.map((c) => (
                <th key={c.code} className="px-3 py-3">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((g) => (
              <tr key={g} className="border-t border-[#E8EEE6]">
                <td className="px-4 py-2.5 font-bold text-ink">{g}</td>
                {COMPONENTS.map((c) => {
                  const n = matrix.get(`${g}|${c.code}`) ?? 0;
                  return (
                    <td key={c.code} className="px-3 py-2.5">
                      <span
                        className={`inline-flex min-w-[2rem] justify-center rounded-lg px-2 py-1 text-xs font-bold ${
                          n > 5
                            ? 'bg-emerald-50 text-emerald-700'
                            : n > 0
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-50 text-slate-400'
                        }`}
                      >
                        {n}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
