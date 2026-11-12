import { apiClient } from './client';

export interface CareQr {
  patientId: string;
  token: string;
  payload: string;
  imageUrl: string;
}

export const referralsApi = {
  async getMyCareQr(): Promise<CareQr> {
    const res = await apiClient.get('/referrals/my-qr');
    return res.data.data;
  },
};
