import { apiClient } from './client';

export interface PatientCareQr {
  patientId?: string;
  token: string;
  payload: string;
  imageUrl: string;
}

export interface PatientReferral {
  id: string;
  patientId: string;
  patientName?: string | null;
  doctorId: string;
  doctorName?: string | null;
  doctorSpecialty?: string | null;
  fromHospitalId?: string | null;
  toHospitalId: string;
  toHospitalName?: string | null;
  toDepartmentId?: string | null;
  toDepartmentName?: string | null;
  conditionId?: string | null;
  conditionName?: string | null;
  urgency?: string | null;
  reason?: string | null;
  clinicalNotes?: string | null;
  recommendedWard?: string | null;
  status: string;
  bedRequestId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export const referralsApi = {
  async getMyQr(): Promise<PatientCareQr> {
    const res = await apiClient.get('/referrals/my-qr');
    return res.data.data;
  },

  async listMine(): Promise<PatientReferral[]> {
    const res = await apiClient.get('/referrals/me');
    return res.data.data || [];
  },

  async hospitalInbox(hospitalId: string): Promise<PatientReferral[]> {
    const res = await apiClient.get(`/referrals/hospital/${hospitalId}`);
    return res.data.data || [];
  },
};
