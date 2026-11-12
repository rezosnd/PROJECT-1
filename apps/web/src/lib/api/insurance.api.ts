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

export interface HospitalInsuranceNetwork {
  insurerId: string;
  code: string;
  name: string;
  type: string;
  logoUrl?: string | null;
  active?: boolean;
  cashless: boolean;
  discountPercent: number;
  benefits: string[];
  planLabel?: string | null;
  notes?: string | null;
}

export interface HospitalNetworkInput {
  insurerId: string;
  cashless?: boolean;
  discountPercent?: number;
  benefits?: string[];
  planLabel?: string | null;
  notes?: string | null;
}

export interface DirectoryDoctor {
  id: string;
  name: string;
  email?: string;
  specialty: string;
  licenseNo?: string | null;
  pictureUrl?: string | null;
  hospitalId?: string | null;
  hospitalName?: string | null;
  hospitalAddress?: string | null;
  city?: string | null;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  ratingAvg?: number | null;
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

  async getHospitalNetwork(hospitalId: string): Promise<HospitalInsuranceNetwork[]> {
    const res = await apiClient.get(`/insurance/hospitals/${hospitalId}`);
    return res.data.data || [];
  },

  async saveHospitalNetwork(
    hospitalId: string,
    networks: HospitalNetworkInput[]
  ): Promise<HospitalInsuranceNetwork[]> {
    const res = await apiClient.put(`/insurance/hospitals/${hospitalId}`, { networks });
    return res.data.data || [];
  },

  async listDoctors(limit = 40): Promise<DirectoryDoctor[]> {
    const res = await apiClient.get('/insurance/doctors', { params: { limit } });
    return res.data.data || [];
  },
};
