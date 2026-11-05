import { apiClient } from './client';

export interface WardInventory {
  id: string;
  hospitalId: string;
  wardType: 'ICU' | 'NICU' | 'PICU' | 'HDU' | 'CCU' | 'GENERAL' | 'PRIVATE' | 'EMERGENCY' | 'ISOLATION';
  total: number;
  occupied: number;
  reserved: number;
  cleaning: number;
  maintenance: number;
  hasVentilatorBeds: number;
  free: number;
  version: number;
  updatedAt: string;
}

export interface BedRequest {
  id: string;
  hospitalId: string;
  hospitalName?: string;
  patientId: string;
  patientName?: string;
  wardType: string;
  urgency: 'IMMEDIATE' | 'HIGH' | 'MODERATE';
  status: 'PENDING' | 'HOLD' | 'APPROVED' | 'ADMITTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  note?: string;
  shareAbha: boolean;
  maskedAbha?: string;
  holdExpiresAt: string;
  createdAt: string;
}

export const bedsApi = {
  async getHospitalBeds(hospitalId: string): Promise<WardInventory[]> {
    const res = await apiClient.get(`/hospitals/${hospitalId}/beds`);
    const raw = Array.isArray(res.data.data) ? res.data.data : [];
    return raw.map((w: any) => ({
      id: w.id,
      hospitalId: w.hospital_id || hospitalId,
      wardType: w.ward_type,
      total: Number(w.total) || 0,
      occupied: Number(w.occupied) || 0,
      reserved: Number(w.reserved) || 0,
      cleaning: Number(w.cleaning) || 0,
      maintenance: Number(w.maintenance) || 0,
      hasVentilatorBeds: Number(w.has_ventilator_beds) || 0,
      free: Number(w.free) || 0,
      version: Number(w.version) || 1,
      updatedAt: w.updated_at || new Date().toISOString(),
    }));
  },

  async requestBed(payload: {
    hospitalId: string;
    wardType: string;
    urgency: 'IMMEDIATE' | 'HIGH' | 'MODERATE';
    note?: string;
    shareAbha?: boolean;
    idempotencyKey: string;
  }): Promise<BedRequest> {
    const res = await apiClient.post('/bed-requests', payload, {
      headers: { 'Idempotency-Key': payload.idempotencyKey },
    });
    return res.data.data;
  },

  async getMyRequests(): Promise<BedRequest[]> {
    const res = await apiClient.get('/bed-requests/me');
    return res.data.data;
  },

  async cancelBedRequest(requestId: string): Promise<void> {
    await apiClient.post(`/bed-requests/${requestId}/cancel`);
  },
};
