import { apiClient } from './client';

export type EquipmentType =
  | 'MRI'
  | 'CT'
  | 'X_RAY'
  | 'VENTILATOR'
  | 'DIALYSIS'
  | 'INCUBATOR'
  | 'OPERATION_THEATRE'
  | 'CATH_LAB'
  | 'ULTRASOUND';

export type EquipmentStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'OFFLINE';

export interface EquipmentItem {
  id: string;
  hospitalId: string;
  hospitalName?: string;
  hospitalAddress?: string;
  hospitalPhone?: string;
  type: EquipmentType;
  name: string;
  model?: string;
  serialNo: string;
  status: EquipmentStatus;
  criticality: 'NORMAL' | 'HIGH' | 'CRITICAL';
  availableAt?: string | null;
  distanceKm?: number;
  updatedAt: string;
}

export const equipmentApi = {
  async getHospitalEquipment(hospitalId: string): Promise<EquipmentItem[]> {
    const res = await apiClient.get(`/hospitals/${hospitalId}/equipment`);
    return res.data.data;
  },

  async searchEquipment(params?: {
    type?: string;
    status?: string;
    lat?: number;
    lng?: number;
    radiusKm?: number;
  }): Promise<{ items: EquipmentItem[]; count: number }> {
    const res = await apiClient.get('/equipment', { params });
    return res.data.data;
  },

  async updateEquipmentStatus(
    equipmentId: string,
    data: {
      status: EquipmentStatus;
      availableAt?: string | null;
      reason?: string;
    }
  ): Promise<EquipmentItem> {
    const res = await apiClient.patch(`/equipment/${equipmentId}/status`, data);
    return res.data.data;
  },

  async registerEquipment(
    hospitalId: string,
    data: {
      type: EquipmentType;
      name: string;
      model?: string;
      serialNo: string;
      criticality?: 'NORMAL' | 'HIGH' | 'CRITICAL';
    }
  ): Promise<EquipmentItem> {
    const res = await apiClient.post(`/hospitals/${hospitalId}/equipment`, data);
    return res.data.data;
  }
};

