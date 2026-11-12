import { apiClient } from './client';

export interface Insurer {
  id: string;
  code: string;
  name: string;
  type: string;
  logoUrl?: string | null;
  active?: boolean;
}

export interface PatientInsurancePolicy {
  id?: string;
  insurerId: string;
  insurerCode?: string;
  insurerName?: string;
  insurerType?: string;
  policyNumber?: string | null;
  memberId?: string | null;
  planName?: string | null;
  validUntil?: string | null;
  isPrimary: boolean;
}

export type InsurancePolicyInput = {
  insurerId: string;
  policyNumber?: string | null;
  memberId?: string | null;
  planName?: string | null;
  validUntil?: string | null;
  isPrimary?: boolean;
};

export const insuranceApi = {
  async listInsurers(): Promise<Insurer[]> {
    const res = await apiClient.get('/insurance');
    return res.data.data ?? [];
  },

  async getMyPolicies(): Promise<PatientInsurancePolicy[]> {
    const res = await apiClient.get('/insurance/me');
    return res.data.data ?? [];
  },

  async saveMyPolicies(policies: InsurancePolicyInput[]): Promise<PatientInsurancePolicy[]> {
    const res = await apiClient.put('/insurance/me', { policies });
    return res.data.data ?? [];
  },
};
