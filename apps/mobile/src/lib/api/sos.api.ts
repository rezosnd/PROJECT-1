import { apiClient } from './client';

export interface SosRequest {
  id: string;
  status: string;
  severity: string;
  note?: string | null;
  notifiedCount?: number;
  notifiedAmbulances?: number;
  createdAt?: string;
  guidance?: string;
  ambulance?: {
    callSign?: string;
    vehicleNo?: string;
    type?: string;
    phone?: string;
    driverName?: string;
  } | null;
  nearbyPreview?: Array<{ callSign: string; distanceKm: number; type: string }>;
  emergencyNumber?: string;
}

export const sosApi = {
  async create(body: {
    latitude: number;
    longitude: number;
    note?: string;
    severity?: 'URGENT' | 'CRITICAL';
  }): Promise<SosRequest> {
    const res = await apiClient.post('/sos', body);
    return res.data.data;
  },
  async listMine(): Promise<SosRequest[]> {
    const res = await apiClient.get('/sos/me');
    return res.data.data;
  },
  async getById(id: string): Promise<SosRequest> {
    const res = await apiClient.get(`/sos/${id}`);
    return res.data.data;
  },
  async cancel(id: string, reason?: string): Promise<SosRequest> {
    const res = await apiClient.post(`/sos/${id}/cancel`, { reason });
    return res.data.data;
  },
  async registerPushToken(body: {
    token: string;
    provider?: string;
    platform?: string;
    appSlug?: string;
  }) {
    const res = await apiClient.post('/sos/push-token', body);
    return res.data.data;
  },
};
