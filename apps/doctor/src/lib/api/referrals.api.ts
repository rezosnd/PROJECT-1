import { apiClient } from './client';

export interface ScannedPatient {
  id: string;
  name: string;
  email: string;
  pictureUrl?: string | null;
  profileComplete: boolean;
  profile: Record<string, any>;
  insurance: Array<{
    insurerId: string;
    insurerName: string;
    insurerCode: string;
    policyNumber?: string | null;
    isPrimary: boolean;
  }>;
  abha: { linked: boolean; abhaAddress?: string };
}

export interface Referral {
  id: string;
  patientId: string;
  patientName?: string;
  toHospitalId: string;
  toHospitalName?: string;
  toDepartmentId?: string | null;
  toDepartmentName?: string | null;
  urgency: string;
  reason?: string | null;
  status: string;
  bedRequestId?: string | null;
  recommendedWard?: string | null;
  createdAt: string;
}

export interface Department {
  id: string;
  hospitalId: string;
  code: string;
  name: string;
  specialty?: string;
  wardHint?: string;
}

export const referralsApi = {
  async scan(qrPayload: string): Promise<ScannedPatient> {
    const res = await apiClient.post('/referrals/scan', { qrPayload });
    return res.data.data;
  },

  async create(body: {
    patientId: string;
    toHospitalId: string;
    toDepartmentId?: string | null;
    conditionId?: string | null;
    urgency?: 'NORMAL' | 'URGENT' | 'CRITICAL';
    reason?: string;
    clinicalNotes?: string;
    recommendedWard?: string;
    createHold?: boolean;
  }): Promise<Referral> {
    const res = await apiClient.post('/referrals', body);
    return res.data.data;
  },

  async listMine(): Promise<Referral[]> {
    const res = await apiClient.get('/referrals/me');
    return res.data.data || [];
  },

  async departments(hospitalId: string): Promise<Department[]> {
    const res = await apiClient.get(`/referrals/hospitals/${hospitalId}/departments`);
    return res.data.data || [];
  },
};

export const hospitalsApi = {
  async search(params: { q?: string; lat?: number; lng?: number; limit?: number } = {}) {
    const res = await apiClient.get('/hospitals', {
      params: { ...params, limit: params.limit || 20 },
    });
    const raw = res.data.data;
    if (Array.isArray(raw)) return raw;
    return raw?.items || raw?.hospitals || [];
  },
};

export const conditionsApi = {
  async search(q: string) {
    const res = await apiClient.get('/conditions', { params: { q, limit: 12 } });
    return res.data.data || [];
  },
};
