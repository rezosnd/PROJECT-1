import { apiClient } from './client';
import { UserRole } from '../auth/auth-store';

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ip: string | null;
  meta: any;
  at: string;
}

export const adminApi = {
  async preRegisterStaff(payload: {
    email: string;
    hospitalId: string;
    role: 'HOSPITAL_STAFF' | 'HOSPITAL_ADMIN';
  }) {
    const res = await apiClient.post('/auth/admin/staff', payload);
    return res.data.data;
  },

  async getUsers(params?: { page?: number; limit?: number; role?: UserRole; status?: string; search?: string }) {
    const res = await apiClient.get('/auth/admin/users', { params });
    // API returns data as users array + meta; normalize for UI
    const payload = res.data;
    if (Array.isArray(payload.data)) {
      return { users: payload.data, meta: payload.meta };
    }
    return payload.data;
  },

  async updateUserStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED') {
    const res = await apiClient.patch(`/auth/admin/users/${userId}/status`, { status });
    return res.data.data;
  },

  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
    action?: string;
    resourceType?: string;
  }): Promise<{ items: AuditLogEntry[]; total: number }> {
    const res = await apiClient.get('/admin/audit', { params });
    return res.data.data;
  }
};

