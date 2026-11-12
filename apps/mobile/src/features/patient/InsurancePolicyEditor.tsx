import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import {
  insuranceApi,
  Insurer,
  InsurancePolicyInput,
  PatientInsurancePolicy,
} from '../../lib/api/insurance.api';
import { Check, Shield } from 'lucide-react-native';

export interface InsurancePolicyEditorProps {
  initialPolicies?: PatientInsurancePolicy[] | InsurancePolicyInput[];
  selfPayInitially?: boolean;
  onChange?: (policies: InsurancePolicyInput[], selfPay: boolean) => void;
  compact?: boolean;
}

function toInputs(policies: PatientInsurancePolicy[] | InsurancePolicyInput[] | undefined): InsurancePolicyInput[] {
  if (!policies?.length) return [];
  return policies.map((p) => ({
    insurerId: p.insurerId,
    policyNumber: p.policyNumber ?? null,
    memberId: p.memberId ?? null,
    planName: p.planName ?? null,
    validUntil: p.validUntil ? String(p.validUntil).slice(0, 10) : null,
    isPrimary: Boolean(p.isPrimary),
  }));
}

export const InsurancePolicyEditor: React.FC<InsurancePolicyEditorProps> = ({
  initialPolicies,
  selfPayInitially = false,
  onChange,
  compact = false,
}) => {
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [loadingInsurers, setLoadingInsurers] = useState(true);
  const [selfPay, setSelfPay] = useState(selfPayInitially);
  const [selected, setSelected] = useState<InsurancePolicyInput[]>(() => toInputs(initialPolicies));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await insuranceApi.listInsurers();
        if (!cancelled) setInsurers(list.filter((i) => i.active !== false));
      } catch {
        if (!cancelled) setInsurers([]);
      } finally {
        if (!cancelled) setLoadingInsurers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.insurerId)), [selected]);

  const emit = (next: InsurancePolicyInput[], nextSelfPay: boolean) => {
    onChange?.(nextSelfPay ? [] : next, nextSelfPay);
  };

  const toggleInsurer = (insurerId: string) => {
    if (selfPay) setSelfPay(false);
    const exists = selectedIds.has(insurerId);
    let next: InsurancePolicyInput[];
    if (exists) {
      next = selected.filter((s) => s.insurerId !== insurerId);
      if (next.length === 1) next = [{ ...next[0], isPrimary: true }];
    } else {
      const isFirst = selected.length === 0;
      next = [
        ...selected,
        {
          insurerId,
          policyNumber: null,
          memberId: null,
          planName: null,
          validUntil: null,
          isPrimary: isFirst,
        },
      ];
    }
    setSelected(next);
    emit(next, false);
  };

  const patchPolicy = (insurerId: string, patch: Partial<InsurancePolicyInput>) => {
    const next = selected.map((s) => (s.insurerId === insurerId ? { ...s, ...patch } : s));
    setSelected(next);
    emit(next, selfPay);
  };

  const setPolicyNumber = (insurerId: string, policyNumber: string) => {
    patchPolicy(insurerId, { policyNumber: policyNumber.trim() || null });
  };

  const setPrimary = (insurerId: string) => {
    const next = selected.map((s) => ({ ...s, isPrimary: s.insurerId === insurerId }));
    setSelected(next);
    emit(next, selfPay);
  };

  const toggleSelfPay = () => {
    const next = !selfPay;
    setSelfPay(next);
    if (next) {
      setSelected([]);
      emit([], true);
    } else {
      emit(selected, false);
    }
  };

  return (
    <View>
      <Pressable
        onPress={toggleSelfPay}
        style={[styles.selfPayRow, selfPay && styles.selfPayRowActive]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selfPay }}
      >
        <Shield size={16} color={selfPay ? '#0B3D1A' : '#64748B'} />
        <Text style={[styles.selfPayText, selfPay && styles.selfPayTextActive]}>
          I don&apos;t have insurance / Self-pay
        </Text>
        {selfPay ? <Check size={16} color="#0B3D1A" strokeWidth={3} /> : null}
      </Pressable>

      {loadingInsurers ? (
        <ActivityIndicator style={{ marginVertical: 16 }} color="#0B3D1A" />
      ) : (
        <>
          <Text style={styles.hint}>
            Select all plans you hold. Optional policy number. Mark one as primary for cashless matching.
          </Text>
          <View style={styles.chipRow}>
            {insurers.map((ins) => {
              const active = selectedIds.has(ins.id);
              return (
                <Pressable
                  key={ins.id}
                  onPress={() => !selfPay && toggleInsurer(ins.id)}
                  disabled={selfPay}
                  style={[
                    styles.chip,
                    active && styles.chipActive,
                    selfPay && styles.chipDisabled,
                  ]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{ins.name}</Text>
                  {!compact && ins.type ? (
                    <Text style={[styles.chipSub, active && styles.chipTextActive]}>{ins.type}</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          {!selfPay &&
            selected.map((pol) => {
              const meta = insurers.find((i) => i.id === pol.insurerId);
              return (
                <View key={pol.insurerId} style={styles.policyCard}>
                  <View style={styles.policyHeader}>
                    <Text style={styles.policyTitle}>{meta?.name || 'Policy'}</Text>
                    <Pressable
                      onPress={() => setPrimary(pol.insurerId)}
                      style={[styles.primaryPill, pol.isPrimary && styles.primaryPillOn]}
                    >
                      <Text style={[styles.primaryPillText, pol.isPrimary && styles.primaryPillTextOn]}>
                        {pol.isPrimary ? 'Primary' : 'Set primary'}
                      </Text>
                    </Pressable>
                  </View>
                  <Text style={styles.fieldLabel}>Policy number</Text>
                  <TextInput
                    style={styles.input}
                    value={pol.policyNumber || ''}
                    onChangeText={(t) => setPolicyNumber(pol.insurerId, t)}
                    placeholder="e.g. 12345678"
                    placeholderTextColor="#94A3B8"
                  />
                  <Text style={[styles.fieldLabel, { marginTop: 8 }]}>Member ID</Text>
                  <TextInput
                    style={styles.input}
                    value={pol.memberId || ''}
                    onChangeText={(t) =>
                      patchPolicy(pol.insurerId, { memberId: t.trim() || null })
                    }
                    placeholder="Beneficiary / member ID"
                    placeholderTextColor="#94A3B8"
                  />
                  <Text style={[styles.fieldLabel, { marginTop: 8 }]}>Plan name</Text>
                  <TextInput
                    style={styles.input}
                    value={pol.planName || ''}
                    onChangeText={(t) =>
                      patchPolicy(pol.insurerId, { planName: t.trim() || null })
                    }
                    placeholder="e.g. Gold Plus"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              );
            })}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  selfPayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
  },
  selfPayRowActive: {
    borderColor: '#0B3D1A',
    backgroundColor: '#ECFDF5',
  },
  selfPayText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#64748B' },
  selfPayTextActive: { color: '#0B3D1A' },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 10,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxWidth: '100%',
  },
  chipActive: { backgroundColor: '#111111', borderColor: '#111111' },
  chipDisabled: { opacity: 0.45 },
  chipText: { fontSize: 12, fontWeight: '800', color: '#475569' },
  chipTextActive: { color: '#FFFFFF' },
  chipSub: { fontSize: 10, fontWeight: '600', color: '#94A3B8', marginTop: 2 },
  policyCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#F4F7F2',
    borderWidth: 1,
    borderColor: '#D8E0D4',
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  policyTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', flex: 1 },
  primaryPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
  },
  primaryPillOn: { backgroundColor: '#0B3D1A' },
  primaryPillText: { fontSize: 10, fontWeight: '800', color: '#64748B' },
  primaryPillTextOn: { color: '#A8E017' },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  input: {
    height: 46,
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
  },
});
