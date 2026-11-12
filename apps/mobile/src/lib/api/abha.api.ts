import { apiClient } from './client';

export interface AbhaProfile {
  maskedNumber: string;
  abhaAddress: string;
  name: string;
  gender: string;
  yearOfBirth: number;
  dob?: string | null;
  mobile?: string | null;
  photoUrl?: string | null;
  qrPayload?: string | null;
  qrImageUrl?: string | null;
  addressLine?: string | null;
  cityName?: string | null;
  pinCode?: string | null;
  bloodGroup?: string | null;
  status: 'LINKED' | 'UNLINKED';
  badge: string;
  verifiedAt: string;
}

export const abhaApi = {
  async getProfile(): Promise<AbhaProfile | null> {
    try {
      const res = await apiClient.get('/abha/me');
      const data = res.data.data;
      if (!data || data.status === 'UNLINKED') return null;
      return {
        maskedNumber: data.maskedNumber || 'ABHA Linked',
        abhaAddress: data.abhaAddress || '',
        name: data.name || '',
        gender: data.gender || 'Not Specified',
        yearOfBirth:
          data.yearOfBirth ||
          (data.dob ? Number(String(data.dob).slice(0, 4)) : undefined) ||
          0,
        dob: data.dob || null,
        mobile: data.mobile || null,
        photoUrl: data.photoUrl || null,
        qrPayload: data.qrPayload || null,
        qrImageUrl: data.qrImageUrl || null,
        addressLine: data.addressLine || null,
        cityName: data.cityName || null,
        pinCode: data.pinCode || null,
        bloodGroup: data.bloodGroup || null,
        status: data.status || 'LINKED',
        badge: data.badge || 'ABDM',
        verifiedAt: data.verifiedAt || new Date().toISOString(),
      };
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      return null;
    }
  },

  async grantConsent(purpose = 'Create or link Ayushman Bharat Health Account (ABHA) for bed hold identity verification') {
    const res = await apiClient.post('/abha/consent', { purpose });
    return res.data.data;
  },

  async requestCreateOtp(aadhaar: string) {
    const res = await apiClient.post('/abha/create/otp', { aadhaar });
    return res.data.data as {
      txnId: string;
      message?: string;
      hint?: string;
      testOtp?: string;
      badge?: string;
    };
  },

  async verifyCreateOtp(txnId: string, otp: string, mobile: string) {
    const res = await apiClient.post('/abha/create/verify', { txnId, otp, mobile });
    return res.data.data;
  },

  async getAddressSuggestions(txnId: string) {
    const res = await apiClient.get('/abha/create/address-suggestions', { params: { txnId } });
    return res.data.data;
  },

  async confirmAddress(txnId: string, abhaAddress: string) {
    const res = await apiClient.post('/abha/create/address', { txnId, abhaAddress });
    return res.data.data;
  },

  async linkInit(abhaNumberOrAddress: string) {
    const res = await apiClient.post('/abha/link/init', { abhaNumberOrAddress });
    return res.data.data;
  },

  async linkVerify(txnId: string, otp: string) {
    const res = await apiClient.post('/abha/link/verify', { txnId, otp });
    return res.data.data;
  },

  async unlinkAbha(): Promise<{ success: boolean }> {
    try {
      const res = await apiClient.delete('/abha/me');
      return res.data;
    } catch {
      return { success: true };
    }
  },
};
