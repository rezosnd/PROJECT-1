import { apiClient } from './client';

export type InsuranceCoverageLevel =
  | 'COVERED'
  | 'NO_OVERLAP'
  | 'HOSPITAL_UNKNOWN'
  | 'NONE_DECLARED';

export interface Insurer {
  id: string;
  code: string;
  name: string;
  type: string;
  logoUrl?: string | null;
  active: boolean;
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
  isPrimary?: boolean;
}

export interface InsurancePolicyInput {
  insurerId: string;
  policyNumber?: string | null;
  memberId?: string | null;
  planName?: string | null;
  validUntil?: string | null;
  isPrimary?: boolean;
}

export const insuranceApi = {
  async listInsurers(): Promise<Insurer[]> {
    const res = await apiClient.get('/insurance');
    return res.data.data || [];
  },

  async getMine(): Promise<PatientInsurancePolicy[]> {
    const res = await apiClient.get('/insurance/me');
    return res.data.data || [];
  },

  async saveMine(policies: InsurancePolicyInput[]): Promise<PatientInsurancePolicy[]> {
    const res = await apiClient.put('/insurance/me', { policies });
    return res.data.data || [];
  },
};
