import { apiClient } from './client';

export type EquipmentStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'OFFLINE';

export interface EquipmentItem {
  id: string;
  hospitalId: string;
  name: string;
  type: string;
  status: EquipmentStatus;
  criticality?: string;
  inUse: boolean;
  availableAt: string | null;
}

function mapRow(e: any, hospitalId: string): EquipmentItem {
  const status = (e.status || 'AVAILABLE') as EquipmentStatus;
  return {
    id: e.id,
    hospitalId: e.hospital_id || e.hospitalId || hospitalId,
    name: e.name || e.type,
    type: e.type,
    status,
    criticality: e.criticality,
    inUse: status === 'IN_USE',
    availableAt: e.available_at ?? e.availableAt ?? null,
  };
}

export const equipmentApi = {
  async getHospitalEquipment(hospitalId: string): Promise<EquipmentItem[]> {
    const res = await apiClient.get(`/hospitals/${hospitalId}/equipment`);
    const rawItems = Array.isArray(res.data.data) ? res.data.data : res.data.data?.items || [];
    return rawItems.map((e: any) => mapRow(e, hospitalId));
  },

  async getAllEquipment(type?: string): Promise<EquipmentItem[]> {
    const res = await apiClient.get('/equipment', { params: { type } });
    const rawItems = Array.isArray(res.data.data) ? res.data.data : res.data.data?.items || [];
    return rawItems.map((e: any) => mapRow(e, e.hospital_id || e.hospitalId || ''));
  },
};
