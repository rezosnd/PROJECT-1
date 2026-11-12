import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  insuranceApi,
  Insurer,
  PatientInsurancePolicy,
  InsurancePolicyInput,
} from '../../lib/api/insurance.api';
import { useAuthStore } from '../../lib/auth/auth-store';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { Shield, Check } from 'lucide-react';

interface InsuranceEditorProps {
  className?: string;
  compact?: boolean;
}

type DraftPolicy = {
  insurerId: string;
  policyNumber: string;
  isPrimary: boolean;
};

export const InsuranceEditor: React.FC<InsuranceEditorProps> = ({
  className = '',
  compact = false,
}) => {
  const { user, checkSession } = useAuthStore();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const { data: insurers = [], isLoading: loadingInsurers } = useQuery({
    queryKey: ['insurers'],
    queryFn: () => insuranceApi.listInsurers(),
    staleTime: 300_000,
  });

  const { data: saved = [], isLoading: loadingMine } = useQuery({
    queryKey: ['my-insurance'],
    queryFn: () => insuranceApi.getMine(),
    enabled: user?.role === 'PATIENT',
    staleTime: 60_000,
  });

  const [selfPay, setSelfPay] = useState(false);
  const [drafts, setDrafts] = useState<DraftPolicy[]>([]);

  useEffect(() => {
    if (!saved.length) {
      setSelfPay(true);
      setDrafts([]);
      return;
    }
    setSelfPay(false);
    setDrafts(
      saved.map((p) => ({
        insurerId: p.insurerId,
        policyNumber: p.policyNumber || '',
        isPrimary: Boolean(p.isPrimary),
      }))
    );
  }, [saved]);

  const selectedIds = useMemo(() => new Set(drafts.map((d) => d.insurerId)), [drafts]);

  const toggleInsurer = (insurer: Insurer) => {
    setSelfPay(false);
    setDrafts((prev) => {
      if (prev.some((d) => d.insurerId === insurer.id)) {
        const next = prev.filter((d) => d.insurerId !== insurer.id);
        if (next.length && !next.some((d) => d.isPrimary)) next[0].isPrimary = true;
        return next;
      }
      const isFirst = prev.length === 0;
      return [...prev, { insurerId: insurer.id, policyNumber: '', isPrimary: isFirst }];
    });
  };

  const setPolicyNumber = (insurerId: string, policyNumber: string) => {
    setDrafts((prev) => prev.map((d) => (d.insurerId === insurerId ? { ...d, policyNumber } : d)));
  };

  const setPrimary = (insurerId: string) => {
    setDrafts((prev) =>
      prev.map((d) => ({ ...d, isPrimary: d.insurerId === insurerId }))
    );
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const policies: InsurancePolicyInput[] = selfPay
        ? []
        : drafts.map((d) => ({
            insurerId: d.insurerId,
            policyNumber: d.policyNumber.trim() || null,
            isPrimary: d.isPrimary,
          }));
      return insuranceApi.saveMine(policies);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-insurance'] });
      await checkSession();
      addToast({ type: 'success', title: 'Insurance updated', message: 'Saved to your care profile.' });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || err.message || 'Could not save insurance';
      addToast({ type: 'error', title: 'Save failed', message: msg });
    },
  });

  const loading = loadingInsurers || loadingMine;

  return (
    <section className={`rounded-[28px] ll-glass-strong p-5 sm:p-6 space-y-4 ${className}`}>
      <div className="flex items-start gap-3">
        <Shield className="w-5 h-5 text-[#0B3D1A] shrink-0 mt-0.5" />
        <div>
          <h2 className="font-display text-lg font-bold text-ink">Insurance</h2>
          {!compact && (
            <p className="text-sm text-muted mt-1">
              Used to rank hospitals that accept your insurer. Policy numbers are optional.
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading insurers…</p>
      ) : (
        <>
          <label className="flex items-center gap-2.5 rounded-2xl bg-[#F4F7F2] border border-[#D8E0D4] px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={selfPay}
              onChange={(e) => {
                setSelfPay(e.target.checked);
                if (e.target.checked) setDrafts([]);
              }}
              className="accent-[#0B3D1A] w-4 h-4"
            />
            <span className="text-sm font-semibold text-ink">Self-pay / no insurance on file</span>
          </label>

          {!selfPay && (
            <div className="space-y-3">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted">
                Your insurers (multi-select)
              </p>
              <div className="flex flex-wrap gap-2">
                {insurers.map((ins) => {
                  const on = selectedIds.has(ins.id);
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

              {drafts.map((d) => {
                const ins = insurers.find((i) => i.id === d.insurerId);
                if (!ins) return null;
                return (
                  <div
                    key={d.insurerId}
                    className="rounded-2xl border border-white/60 bg-white/45 px-4 py-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-ink">{ins.name}</span>
                      <button
                        type="button"
                        onClick={() => setPrimary(d.insurerId)}
                        className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border ${
                          d.isPrimary
                            ? 'bg-[#A8E017]/25 text-[#0B3D1A] border-[#A8E017]/40'
                            : 'text-muted border-[#E2E8F0]'
                        }`}
                      >
                        {d.isPrimary ? 'Primary' : 'Set primary'}
                      </button>
                    </div>
                    <input
                      className="w-full h-10 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-sm font-semibold text-ink"
                      placeholder="Policy number (optional)"
                      value={d.policyNumber}
                      onChange={(e) => setPolicyNumber(d.insurerId, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button
              type="button"
              variant="primary"
              size="md"
              isLoading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              Save insurance
            </Button>
          </div>

          {!selfPay && saved.length > 0 && (
            <SavedPoliciesList policies={saved} />
          )}
        </>
      )}
    </section>
  );
};

function SavedPoliciesList({ policies }: { policies: PatientInsurancePolicy[] }) {
  return (
    <div className="pt-2 border-t border-black/[0.06]">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted mb-2">On file</p>
      <ul className="space-y-1.5">
        {policies.map((p) => (
          <li key={p.id || p.insurerId} className="text-xs font-semibold text-ink">
            {p.insurerName || p.insurerId}
            {p.policyNumber ? ` · ${p.policyNumber}` : ''}
            {p.isPrimary ? (
              <span className="ml-1 text-[10px] font-bold text-[#0B3D1A]">PRIMARY</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
