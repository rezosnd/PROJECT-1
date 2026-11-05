import { apiClient } from './client';

export interface Hospital {
  id: string;
  name: string;
  type: 'GOVERNMENT' | 'PRIVATE' | 'TRUST';
  registrationNo: string;
  address: string;
  city: string;
  pin: string;
  phone: string;
  email: string;
  emergency24x7: boolean;
  traumaLevel: number;
  ratingAvg: number;
  status: 'VERIFIED' | 'PENDING' | 'REJECTED';
  photoUrl?: string;
  specialties: string[];
  facilities: string[];
  latitude: number;
  longitude: number;
  distanceKm?: number;
  etaMinutes?: number;
  totalBeds?: number;
  freeBeds?: number;
}

export interface CreateHospitalPayload {
  name: string;
  type: 'GOVERNMENT' | 'PRIVATE' | 'TRUST';
  registrationNo: string;
  address: string;
  city?: string;
  pin: string;
  latitude: number;
  longitude: number;
  phone: string;
  email: string;
  emergency24x7?: boolean;
  traumaLevel?: number;
  specialties?: string[];
  facilities?: string[];
}

export const hospitalsApi = {
  async getHospitals(params?: {
    lat?: number;
    lng?: number;
    radiusKm?: number;
    specialty?: string;
    type?: string;
    verifiedOnly?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ items: Hospital[]; total: number } | Hospital[]> {
    const res = await apiClient.get('/hospitals', { params });
    const raw = res.data.data;
    if (Array.isArray(raw)) {
      // Normalize so callers expecting either raw array or { items } succeed
      const wrapped = [...raw] as any;
      wrapped.items = raw;
      wrapped.total = raw.length;
      return wrapped;
    }
    return raw;
  },

  async getHospitalById(id: string) {
    const res = await apiClient.get(`/hospitals/${id}`);
    return res.data.data;
  },

  async createHospital(data: CreateHospitalPayload): Promise<Hospital> {
    const res = await apiClient.post('/hospitals', data);
    return res.data.data;
  },

  async verifyHospital(id: string, status: 'VERIFIED' | 'REJECTED', reason?: string) {
    const res = await apiClient.patch(`/hospitals/${id}/verify`, { status, reason });
    return res.data.data;
  }
};

