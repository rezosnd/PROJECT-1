import { apiClient } from './client';

export type WardType =
  | 'ICU'
  | 'NICU'
  | 'PICU'
  | 'HDU'
  | 'CCU'
  | 'GENERAL'
  | 'SEMI_PRIVATE'
  | 'PRIVATE'
  | 'EMERGENCY'
  | 'ISOLATION';

export interface WardInventory {
  id: string;
  hospitalId: string;
  wardType: WardType;
  total: number;
  occupied: number;
  reserved: number;
  cleaning: number;
  maintenance: number;
  hasVentilatorBeds: number;
  free: number; // Strictly derived: total - occupied - reserved - cleaning - maintenance
  version: number;
  updatedAt: string;
}

export type BedRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ADMITTED' | 'EXPIRED';

export interface BedRequest {
  id: string;
  hospitalId: string;
  patientId: string;
  patientName?: string;
  wardType: WardType;
  urgency: 'IMMEDIATE' | 'HIGH' | 'MODERATE';
  status: BedRequestStatus;
  note?: string;
  shareAbha: boolean;
  maskedAbha?: string;
  holdExpiresAt?: string;
  admittedAt?: string;
  createdAt: string;
}

function normalizeWard(row: any): WardInventory {
  const total = Number(row.total ?? 0);
  const occupied = Number(row.occupied ?? 0);
  const reserved = Number(row.reserved ?? 0);
  const cleaning = Number(row.cleaning ?? 0);
  const maintenance = Number(row.maintenance ?? 0);
  return {
    id: row.id,
    hospitalId: row.hospital_id || row.hospitalId,
    wardType: (row.ward_type || row.wardType) as WardType,
    total,
    occupied,
    reserved,
    cleaning,
    maintenance,
    hasVentilatorBeds: Number(row.has_ventilator_beds ?? row.hasVentilatorBeds ?? 0),
    free: Number(
      row.free ?? Math.max(0, total - occupied - reserved - cleaning - maintenance)
    ),
    version: Number(row.version ?? 1),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

export const bedsApi = {
  async getHospitalBeds(hospitalId: string): Promise<WardInventory[]> {
    const res = await apiClient.get(`/hospitals/${hospitalId}/beds`);
    const raw = Array.isArray(res.data.data) ? res.data.data : res.data.data?.items || [];
    return raw.map(normalizeWard);
  },

  async adjustBedInventory(
    hospitalId: string,
    wardType: WardType,
    adjustments: {
      occupied?: number;
      reserved?: number;
      cleaning?: number;
      maintenance?: number;
      total?: number;
      reason?: string;
    }
  ): Promise<WardInventory> {
    if (!wardType) {
      throw new Error('Ward type is required for bed adjustment');
    }
    // API expects delta integers named occupied/reserved/... (not deltaOccupied)
    const res = await apiClient.post(
      `/hospitals/${hospitalId}/beds/${encodeURIComponent(wardType)}/adjust`,
      { ...adjustments, reason: adjustments.reason || 'STAFF_WARD_ADJUSTMENT' }
    );
    return normalizeWard(res.data.data);
  },

  async requestBed(payload: {
    hospitalId: string;
    wardType: WardType;
    urgency: 'IMMEDIATE' | 'HIGH' | 'MODERATE';
    note?: string;
    shareAbha?: boolean;
    idempotencyKey?: string;
  }): Promise<BedRequest> {
    const headers: Record<string, string> = {};
    if (payload.idempotencyKey) {
      headers['Idempotency-Key'] = payload.idempotencyKey;
    }
    const res = await apiClient.post('/bed-requests', payload, { headers });
    return res.data.data;
  },

  async getMyRequests(): Promise<BedRequest[]> {
    const res = await apiClient.get('/bed-requests/me');
    return res.data.data;
  },

  async getHospitalQueue(hospitalId: string): Promise<BedRequest[]> {
    const res = await apiClient.get(`/hospitals/${hospitalId}/bed-requests`);
    return res.data.data;
  },

  async decideBedRequest(
    requestId: string,
    decision: 'APPROVED' | 'REJECTED' | 'ADMITTED' | 'APPROVE' | 'REJECT' | 'ADMIT'
  ): Promise<BedRequest> {
    const normalized =
      decision === 'APPROVED' || decision === 'APPROVE'
        ? 'APPROVE'
        : decision === 'REJECTED' || decision === 'REJECT'
        ? 'REJECT'
        : 'ADMIT';
    const res = await apiClient.patch(`/bed-requests/${requestId}/decision`, {
      decision: normalized,
    });
    return res.data.data;
  },

  async getCitySummary() {
    const res = await apiClient.get('/city-summary');
    return res.data.data;
  }
};

