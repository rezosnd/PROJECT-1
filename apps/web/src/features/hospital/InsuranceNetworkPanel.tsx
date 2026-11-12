import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  insuranceApi,
  HospitalInsuranceNetwork,
  HospitalNetworkInput,
  Insurer,
} from '../../lib/api/insurance.api';
import { BadgePercent, Check, Save, Shield } from 'lucide-react';

type Draft = {
  insurerId: string;
  cashless: boolean;
  discountPercent: number;
  benefitsText: string;
  planLabel: string;
  notes: string;
};

function toDraft(n: HospitalInsuranceNetwork): Draft {
  return {
    insurerId: n.insurerId,
    cashless: n.cashless !== false,
    discountPercent: Number(n.discountPercent) || 0,
    benefitsText: (n.benefits || []).join(', '),
    planLabel: n.planLabel || '',
    notes: n.notes || '',
  };
}

export const InsuranceNetworkPanel: React.FC<{ hospitalId: string }> = ({ hospitalId }) => {
  const qc = useQueryClient();
  const { data: insurers = [], isLoading: loadingInsurers } = useQuery({
    queryKey: ['insurers'],
    queryFn: () => insuranceApi.listInsurers(),
    staleTime: 300_000,
  });

  const { data: saved = [], isLoading: loadingNetwork } = useQuery({
    queryKey: ['hospital-insurance', hospitalId],
    queryFn: () => insuranceApi.getHospitalNetwork(hospitalId),
    enabled: Boolean(hospitalId),
    staleTime: 15_000,
  });

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setDrafts(saved.map(toDraft));
  }, [saved]);

  const selected = useMemo(() => new Set(drafts.map((d) => d.insurerId)), [drafts]);

  const toggleInsurer = (ins: Insurer) => {
    setDrafts((prev) => {
      if (prev.some((d) => d.insurerId === ins.id)) {
        return prev.filter((d) => d.insurerId !== ins.id);
      }
      return [
        ...prev,
        {
          insurerId: ins.id,
          cashless: true,
          discountPercent: ins.type === 'SCHEME' ? 100 : 10,
          benefitsText:
            ins.type === 'SCHEME'
              ? 'Cashless IP, Package rates, Emergency cover'
              : 'Cashless IP, Pre/post hospitalisation, Pharmacy',
          planLabel: ins.type === 'SCHEME' ? 'Scheme desk' : 'Cashless empanelment',
          notes: '',
        },
      ];
    });
  };

  const updateDraft = (insurerId: string, patch: Partial<Draft>) => {
    setDrafts((prev) => prev.map((d) => (d.insurerId === insurerId ? { ...d, ...patch } : d)));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const networks: HospitalNetworkInput[] = drafts.map((d) => ({
        insurerId: d.insurerId,
        cashless: d.cashless,
        discountPercent: Math.min(100, Math.max(0, Number(d.discountPercent) || 0)),
        benefits: d.benefitsText
          .split(',')
          .map((b) => b.trim())
          .filter(Boolean)
          .slice(0, 24),
        planLabel: d.planLabel.trim() || null,
        notes: d.notes.trim() || null,
      }));
      return insuranceApi.saveHospitalNetwork(hospitalId, networks);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['hospital-insurance', hospitalId] });
      setMsg('Insurance network saved — patients see coverage, benefits, and discounts on match.');
    },
    onError: (e: any) => {
      setMsg(e.response?.data?.error?.message || e.message || 'Save failed');
    },
  });

  const loading = loadingInsurers || loadingNetwork;
  const byType = useMemo(() => {
    const map = new Map<string, Insurer[]>();
    for (const ins of insurers) {
      const key = ins.type || 'PRIVATE';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ins);
    }
    return [...map.entries()];
  }, [insurers]);

  return (
    <section className="space-y-4">
      <div className="rounded-[24px] ll-glass border border-white/55 px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-2xl bg-[#0B3D1A] text-[#A8E017] inline-flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </span>
          <div>
            <h2 className="font-display text-lg sm:text-xl font-extrabold text-ink tracking-tight">
              Insurance network
            </h2>
            <p className="text-xs text-muted mt-0.5 max-w-xl">
              Empanel insurers, set cashless flags, patient-facing benefits, and package discount %.
              Matching ranks covered patients higher automatically.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={saveMutation.isPending || loading}
          onClick={() => {
            setMsg(null);
            saveMutation.mutate();
          }}
          className="h-11 px-4 rounded-xl bg-[var(--color-brand-forest)] text-[var(--color-brand-lime)] text-xs font-bold inline-flex items-center gap-2 hover:brightness-105 transition disabled:opacity-60"
        >
          <Save className="w-3.5 h-3.5" />
          {saveMutation.isPending ? 'Saving…' : 'Save network'}
        </button>
      </div>

      {msg && (
        <p className="text-xs font-semibold text-[#0B3D1A] rounded-2xl bg-[#A8E017]/20 border border-[#A8E017]/35 px-4 py-3">
          {msg}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted py-8 text-center">Loading insurers…</p>
      ) : (
        <>
          <div className="space-y-4">
            {byType.map(([type, list]) => (
              <div key={type} className="rounded-[24px] ll-glass-strong border border-white/55 p-4 sm:p-5 space-y-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted">{type}</p>
                <div className="flex flex-wrap gap-2">
                  {list.map((ins) => {
                    const on = selected.has(ins.id);
                    return (
                      <button
                        key={ins.id}
                        type="button"
                        onClick={() => toggleInsurer(ins)}
                        className={`rounded-full px-3.5 py-2 text-xs font-extrabold border transition inline-flex items-center gap-1.5 ${
                          on
                            ? 'bg-[#0B3D1A] text-[#A8E017] border-[#0B3D1A]'
                            : 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0] hover:border-[#0B3D1A]/30'
                        }`}
                      >
                        {on && <Check className="w-3 h-3" />}
                        {ins.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {drafts.length === 0 ? (
            <div className="py-12 text-center text-muted rounded-[24px] ll-glass border border-dashed border-white/50 text-sm">
              Select insurers above to publish your cashless network and discounts.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              {drafts.map((d) => {
                const ins = insurers.find((i) => i.id === d.insurerId);
                if (!ins) return null;
                return (
                  <article
                    key={d.insurerId}
                    className="rounded-[24px] ll-glass-strong border border-white/55 p-4 sm:p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display font-bold text-ink">{ins.name}</h3>
                        <p className="text-[11px] text-muted mt-0.5">{ins.code} · {ins.type}</p>
                      </div>
                      <label className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-ink">
                        <input
                          type="checkbox"
                          checked={d.cashless}
                          onChange={(e) => updateDraft(d.insurerId, { cashless: e.target.checked })}
                          className="accent-[#0B3D1A]"
                        />
                        Cashless
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-muted inline-flex items-center gap-1">
                          <BadgePercent className="w-3 h-3" /> Discount %
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={d.discountPercent}
                          onChange={(e) =>
                            updateDraft(d.insurerId, {
                              discountPercent: Number(e.target.value),
                            })
                          }
                          className="w-full h-10 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-sm font-semibold text-ink"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
                          Plan label
                        </span>
                        <input
                          value={d.planLabel}
                          onChange={(e) => updateDraft(d.insurerId, { planLabel: e.target.value })}
                          placeholder="e.g. Cashless IP"
                          className="w-full h-10 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-sm font-semibold text-ink"
                        />
                      </label>
                    </div>

                    <label className="block space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
                        Benefits (comma-separated)
                      </span>
                      <textarea
                        value={d.benefitsText}
                        onChange={(e) => updateDraft(d.insurerId, { benefitsText: e.target.value })}
                        rows={2}
                        className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm font-semibold text-ink resize-y"
                        placeholder="Cashless IP, ICU included, Pharmacy"
                      />
                    </label>

                    <label className="block space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
                        Internal notes
                      </span>
                      <input
                        value={d.notes}
                        onChange={(e) => updateDraft(d.insurerId, { notes: e.target.value })}
                        className="w-full h-10 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-sm font-semibold text-ink"
                        placeholder="TPA desk / pre-auth contact"
                      />
                    </label>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
};
