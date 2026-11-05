import { apiClient } from './client';

export interface ConditionRequirement {
  id?: string;
  kind: 'BED' | 'EQUIPMENT' | 'SPECIALTY';
  value: string;
  qty: number;
  mandatory: boolean;
  preferenceOrder: number;
}

export interface Condition {
  id: string;
  code: string;
  name: string;
  category: string;
  defaultSeverity: number;
  aliases: string[];
  requirements: ConditionRequirement[];
}

export const conditionsApi = {
  async searchConditions(query?: string, category?: string): Promise<Condition[]> {
    const res = await apiClient.get('/conditions', {
      params: { q: query, category, limit: 30 }
    });
    return res.data.data;
  },

  async getConditionById(id: string): Promise<Condition> {
    const res = await apiClient.get(`/conditions/${id}`);
    return res.data.data;
  },

  async createCondition(data: Partial<Condition>): Promise<Condition> {
    const res = await apiClient.post('/conditions', data);
    return res.data.data;
  },

  async updateCondition(id: string, data: Partial<Condition>): Promise<Condition> {
    const res = await apiClient.put(`/conditions/${id}`, data);
    return res.data.data;
  },

  async deleteCondition(id: string): Promise<void> {
    await apiClient.delete(`/conditions/${id}`);
  }
};

