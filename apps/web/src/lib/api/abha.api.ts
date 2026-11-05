import { apiClient } from './client';

export interface AbhaProfile {
  maskedNumber: string;
  abhaAddress: string;
  name: string;
  gender?: string | null;
  dob?: string | null;
  yearOfBirth?: number | null;
  mobile?: string | null;
  photoUrl?: string | null;
  qrPayload?: string | null;
  qrImageUrl?: string | null;
  addressLine?: string | null;
  cityName?: string | null;
  pinCode?: string | null;
  bloodGroup?: string | null;
  status: 'LINKED' | 'UNLINKED';
  verifiedAt: string;
  badge: string;
}

export const abhaApi = {
  async grantConsent(purpose: string = 'GetMyHospital emergency bed reservations and ABDM records linkage') {
    const res = await apiClient.post('/abha/consent', { purpose });
    return res.data.data;
  },

  async revokeConsent() {
    const res = await apiClient.delete('/abha/consent');
    return res.data.data;
  },

  async requestCreateOtp(aadhaar: string): Promise<{
    txnId: string;
    message: string;
    hint?: string;
    testOtp?: string;
    badge: string;
  }> {
    const res = await apiClient.post('/abha/create/otp', { aadhaar });
    return res.data.data;
  },

  async verifyCreateOtp(txnId: string, otp: string, mobile?: string) {
    const res = await apiClient.post('/abha/create/verify', { txnId, otp, mobile });
    return res.data.data;
  },

  async getAddressSuggestions(txnId: string): Promise<{
    suggestions: string[];
    allowCustom?: boolean;
    message?: string | null;
  }> {
    const res = await apiClient.get('/abha/create/address-suggestions', {
      params: { txnId }
    });
    const data = res.data.data || {};
    return {
      suggestions: data.suggestions || [],
      allowCustom: data.allowCustom !== false,
      message: data.message || null,
    };
  },

  async confirmCreateAddress(txnId: string, abhaAddress: string): Promise<AbhaProfile> {
    const res = await apiClient.post('/abha/create/address', { txnId, abhaAddress });
    return res.data.data;
  },

  async initLink(abhaNumberOrAddress: string): Promise<{
    txnId: string;
    message: string;
    hint?: string;
    testOtp?: string;
    badge: string;
  }> {
    const res = await apiClient.post('/abha/link/init', { abhaNumberOrAddress });
    return res.data.data;
  },

  async verifyLink(txnId: string, otp: string): Promise<AbhaProfile> {
    const res = await apiClient.post('/abha/link/verify', { txnId, otp });
    return res.data.data;
  },

  async getMe(): Promise<AbhaProfile | null> {
    try {
      const res = await apiClient.get('/abha/me');
      return res.data.data;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  },

  async unlink(): Promise<{ unlinked: boolean; message: string }> {
    const res = await apiClient.delete('/abha/me');
    return res.data.data;
  }
};
