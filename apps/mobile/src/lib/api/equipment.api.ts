import { apiClient } from './client';

export interface EquipmentItem {
  id: string;
  hospitalId: string;
  name: string;
  type: string;
  status: 'OPERATIONAL' | 'MAINTENANCE' | 'OFFLINE';
  inUse: boolean;
  availableAt: string | null;
}

export const equipmentApi = {
  async getHospitalEquipment(hospitalId: string): Promise<EquipmentItem[]> {
    const res = await apiClient.get(`/hospitals/${hospitalId}/equipment`);
    const rawItems = Array.isArray(res.data.data) ? res.data.data : res.data.data?.items || [];
    return rawItems.map((e: any) => ({
      id: e.id,
      hospitalId: e.hospital_id || hospitalId,
      name: e.name || e.type,
      type: e.type,
      status: e.status === 'MAINTENANCE' ? 'MAINTENANCE' : e.status === 'OFFLINE' ? 'OFFLINE' : 'OPERATIONAL',
      inUse: e.status === 'IN_USE',
      availableAt: e.available_at || null,
    }));
  },

  async getAllEquipment(type?: string): Promise<EquipmentItem[]> {
    const res = await apiClient.get('/equipment', { params: { type } });
    const rawItems = Array.isArray(res.data.data) ? res.data.data : res.data.data?.items || [];
    return rawItems.map((e: any) => ({
      id: e.id,
      hospitalId: e.hospital_id || e.hospitalId,
      name: e.name || e.type,
      type: e.type,
      status: e.status === 'MAINTENANCE' ? 'MAINTENANCE' : e.status === 'OFFLINE' ? 'OFFLINE' : 'OPERATIONAL',
      inUse: e.status === 'IN_USE',
      availableAt: e.available_at || null,
    }));
  },
};
