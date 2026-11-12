import { apiClient } from './client';

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type BloodComponent = 'WHOLE_BLOOD' | 'PRBC' | 'FFP' | 'PLATELETS' | 'CRYOPRECIPITATE';

export interface BloodBankCard {
  hospitalId: string;
  name: string;
  address?: string;
  phone?: string;
  bloodBankPhone?: string | null;
  bloodBankHours?: string | null;
  distanceKm: number;
  totalUnitsAvailable: number;
  stock: Array<{
    bloodGroup: BloodGroup;
    component: BloodComponent;
    unitsAvailable: number;
  }>;
}

export interface BloodRequest {
  id: string;
  hospitalId: string;
  hospitalName?: string;
  bloodGroup: BloodGroup;
  component: BloodComponent;
  unitsRequested: number;
  urgency: string;
  status: string;
  holdExpiresAt?: string;
  reason?: string | null;
  createdAt: string;
}

export const bloodApi = {
  async searchBanks(params: {
    lat: number;
    lng: number;
    bloodGroup?: BloodGroup;
    component?: BloodComponent;
    radiusKm?: number;
  }) {
    const res = await apiClient.get('/blood/banks', { params });
    return res.data.data as {
      banks: BloodBankCard[];
      holdMinutes: number;
      compatibleDonors?: string[];
    };
  },

  async getHospital(hospitalId: string) {
    const res = await apiClient.get(`/blood/hospitals/${hospitalId}`);
    return res.data.data;
  },

  async createRequest(body: {
    hospitalId: string;
    bloodGroup: BloodGroup;
    component?: BloodComponent;
    unitsRequested?: number;
    urgency?: 'NORMAL' | 'URGENT' | 'CRITICAL';
    reason?: string;
    doctorName?: string;
  }): Promise<BloodRequest> {
    const res = await apiClient.post('/blood/requests', body, {
      headers: { 'Idempotency-Key': `mblood-${Date.now()}` },
    });
    return res.data.data;
  },

  async myRequests(): Promise<BloodRequest[]> {
    const res = await apiClient.get('/blood/requests/me');
    return res.data.data || [];
  },

  async cancel(id: string) {
    const res = await apiClient.post(`/blood/requests/${id}/cancel`);
    return res.data.data;
  },
};
