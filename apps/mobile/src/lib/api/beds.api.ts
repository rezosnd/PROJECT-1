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
  hospitalAddress?: string | null;
  hospitalPhone?: string | null;
  hospitalCity?: string | null;
  hospitalLatitude?: number | null;
  hospitalLongitude?: number | null;
  patientId?: string;
  patientName?: string;
  wardType: string;
  urgency: 'IMMEDIATE' | 'HIGH' | 'MODERATE';
  status:
    | 'PENDING'
    | 'HOLD'
    | 'APPROVED'
    | 'ADMITTED'
    | 'DISCHARGED'
    | 'REJECTED'
    | 'EXPIRED'
    | 'CANCELLED';
  note?: string | null;
  shareAbha?: boolean;
  maskedAbha?: string;
  holdExpiresAt?: string;
  remainingSeconds?: number;
  createdAt: string;
  reason?: string | null;
}

function normalizeWard(w: any, hospitalId: string): WardInventory {
  return {
    id: w.id,
    hospitalId: w.hospital_id || hospitalId,
    wardType: w.ward_type || w.wardType,
    total: Number(w.total) || 0,
    occupied: Number(w.occupied) || 0,
    reserved: Number(w.reserved) || 0,
    cleaning: Number(w.cleaning) || 0,
    maintenance: Number(w.maintenance) || 0,
    hasVentilatorBeds: Number(w.has_ventilator_beds ?? w.hasVentilatorBeds) || 0,
    free: Number(w.free) || 0,
    version: Number(w.version) || 1,
    updatedAt: w.updated_at || w.updatedAt || new Date().toISOString(),
  };
}

export const bedsApi = {
  async getHospitalBeds(hospitalId: string): Promise<WardInventory[]> {
    const res = await apiClient.get(`/hospitals/${hospitalId}/beds`);
    const raw = Array.isArray(res.data.data) ? res.data.data : [];
    return raw.map((w: any) => normalizeWard(w, hospitalId));
  },

  async syncHospitalBeds(
    hospitalId: string,
    etag: string | null
  ): Promise<{ notModified: boolean; beds?: WardInventory[]; etag: string | null }> {
    const res = await apiClient.get(`/hospitals/${hospitalId}/beds`, {
      headers: etag ? { 'If-None-Match': etag } : {},
      params: etag ? { v: etag } : {},
      validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
    });
    if (res.status === 304) return { notModified: true, etag };
    const nextEtag = (res.headers?.etag as string) || res.data?.meta?.etag || etag;
    const raw = Array.isArray(res.data.data) ? res.data.data : [];
    return {
      notModified: false,
      beds: raw.map((w: any) => normalizeWard(w, hospitalId)),
      etag: nextEtag || null,
    };
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
