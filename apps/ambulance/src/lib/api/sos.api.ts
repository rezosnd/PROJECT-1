import { Platform } from 'react-native';
import { apiClient } from './client';

export type SosSeverity = 'URGENT' | 'CRITICAL';
export type SosStatus =
  | 'OPEN'
  | 'ACCEPTED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export type AmbulanceUnitStatus = 'AVAILABLE' | 'BUSY' | 'EN_ROUTE' | 'OFFLINE';

export interface SosRequest {
  id: string;
  status: SosStatus;
  severity: SosSeverity;
  note?: string | null;
  patientPhone?: string | null;
  addressText?: string | null;
  latitude: number | null;
  longitude: number | null;
  notifiedCount?: number;
  createdAt: string;
  acceptedAt?: string | null;
  expiresAt?: string | null;
  patientName?: string | null;
  distanceM?: number;
  distanceKm?: number;
  ambulance?: {
    id: string;
    callSign?: string;
    vehicleNo?: string;
    type?: string;
    phone?: string;
    driverName?: string;
  } | null;
  destinationHospitalName?: string | null;
  emergencyNumber?: string;
}

export interface AmbulanceProfile {
  id: string;
  callSign: string;
  vehicleNo: string;
  type: string;
  phone?: string | null;
  status: AmbulanceUnitStatus;
  hospitalId?: string | null;
  hospitalName?: string | null;
  latitude: number | null;
  longitude: number | null;
  lastLocationAt?: string | null;
}

export interface CreateSosInput {
  latitude: number;
  longitude: number;
  note?: string;
  patientPhone?: string;
  addressText?: string;
  severity?: SosSeverity;
  radiusM?: number;
}

export const sosApi = {
  async create(body: CreateSosInput): Promise<SosRequest> {
    const res = await apiClient.post('/sos', body);
    return res.data.data;
  },

  async listOffers(): Promise<SosRequest[]> {
    const res = await apiClient.get('/sos/offers');
    return res.data.data || [];
  },

  async getById(id: string): Promise<SosRequest> {
    const res = await apiClient.get(`/sos/${id}`);
    return res.data.data;
  },

  async accept(id: string): Promise<SosRequest> {
    const res = await apiClient.post(`/sos/${id}/accept`);
    return res.data.data;
  },

  async updateStatus(
    id: string,
    status: 'EN_ROUTE' | 'ARRIVED' | 'COMPLETED' | 'CANCELLED',
    destinationHospitalId?: string
  ): Promise<SosRequest> {
    const res = await apiClient.patch(`/sos/${id}/status`, { status, destinationHospitalId });
    return res.data.data;
  },

  async heartbeat(body: {
    latitude: number;
    longitude: number;
    status?: AmbulanceUnitStatus;
  }): Promise<{ id: string; status: AmbulanceUnitStatus; latitude: number; longitude: number }> {
    const res = await apiClient.post('/sos/ambulance/heartbeat', body);
    return res.data.data;
  },

  async myAmbulance(): Promise<AmbulanceProfile | null> {
    const res = await apiClient.get('/sos/ambulance/me');
    return res.data.data ?? null;
  },

  async registerPushToken(token: string): Promise<void> {
    const platform =
      Platform.OS === 'ios' ? 'IOS' : Platform.OS === 'android' ? 'ANDROID' : 'UNKNOWN';
    await apiClient.post('/sos/push-token', {
      token,
      provider: 'EXPO',
      platform,
      appSlug: 'getmyhospital-ambulance',
    });
  },
};
