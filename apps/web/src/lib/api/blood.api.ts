import { apiClient } from './client';

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type BloodComponent = 'WHOLE_BLOOD' | 'PRBC' | 'FFP' | 'PLATELETS' | 'CRYOPRECIPITATE';

export interface BloodStockRow {
  id?: string;
  bloodGroup: BloodGroup;
  component: BloodComponent;
  unitsTotal: number;
  unitsReserved: number;
  unitsQuarantine: number;
  unitsAvailable: number;
  expiringWithin7d: number;
}

export interface BloodBankCard {
  hospitalId: string;
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  bloodBankPhone?: string | null;
  bloodBankHours?: string | null;
  distanceKm: number;
  totalUnitsAvailable: number;
  stock: BloodStockRow[];
  location?: { latitude: number; longitude: number };
}

export interface BloodRequest {
  id: string;
  hospitalId: string;
  hospitalName?: string;
  hospitalPhone?: string;
  patientName?: string;
  patientBloodGroup?: string;
  patientMobile?: string;
  bloodGroup: BloodGroup;
  component: BloodComponent;
  unitsRequested: number;
  urgency: 'NORMAL' | 'URGENT' | 'CRITICAL';
  reason?: string | null;
  doctorName?: string | null;
  note?: string | null;
  status: 'PENDING' | 'APPROVED' | 'ISSUED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  holdExpiresAt?: string;
  decisionReason?: string | null;
  createdAt: string;
}

export const bloodApi = {
  async catalog() {
    const res = await apiClient.get('/blood/catalog');
    return res.data.data;
  },

  async searchBanks(params: {
    lat: number;
    lng: number;
    bloodGroup?: BloodGroup;
    component?: BloodComponent;
    radiusKm?: number;
  }): Promise<{ banks: BloodBankCard[]; holdMinutes: number; compatibleDonors?: string[] }> {
    const res = await apiClient.get('/blood/banks', { params });
    return res.data.data;
  },

  async getHospital(hospitalId: string) {
    const res = await apiClient.get(`/blood/hospitals/${hospitalId}`);
    return res.data.data as {
      hospitalId: string;
      name: string;
      hasBloodBank: boolean;
      bloodBankPhone?: string | null;
      bloodBankHours?: string | null;
      stock: BloodStockRow[];
      summary: { groupsInStock: string[]; totalAvailable: number };
    };
  },

  async updateSettings(
    hospitalId: string,
    body: { hasBloodBank: boolean; bloodBankPhone?: string | null; bloodBankHours?: string | null }
  ) {
    const res = await apiClient.patch(`/blood/hospitals/${hospitalId}/settings`, body);
    return res.data.data;
  },

  async upsertStock(
    hospitalId: string,
    row: {
      bloodGroup: BloodGroup;
      component: BloodComponent;
      unitsTotal: number;
      unitsReserved?: number;
      unitsQuarantine?: number;
      expiringWithin7d?: number;
    }
  ) {
    const res = await apiClient.put(`/blood/hospitals/${hospitalId}/stock`, row);
    return res.data.data as BloodStockRow;
  },

  async getHospitalQueue(hospitalId: string): Promise<BloodRequest[]> {
    const res = await apiClient.get(`/blood/hospitals/${hospitalId}/requests`);
    return res.data.data || [];
  },

  async createRequest(body: {
    hospitalId: string;
    bloodGroup: BloodGroup;
    component?: BloodComponent;
    unitsRequested?: number;
    urgency?: 'NORMAL' | 'URGENT' | 'CRITICAL';
    reason?: string;
    doctorName?: string;
    note?: string;
  }): Promise<BloodRequest> {
    const res = await apiClient.post('/blood/requests', body, {
      headers: { 'Idempotency-Key': `blood-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` },
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

  async decide(id: string, decision: 'APPROVE' | 'REJECT' | 'ISSUE', reason?: string) {
    const res = await apiClient.post(`/blood/requests/${id}/decide`, { decision, reason });
    return res.data.data;
  },
};
