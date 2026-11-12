import { apiClient } from './client';

export type AiLanguage = 'en' | 'hi' | 'or';

export interface AiHospitalMatch {
  hospitalId: string;
  name: string;
  distanceKm?: number;
  freeBedsNow?: number;
  allocatedWard?: string;
  phone?: string;
  address?: string;
  etaMinutes?: number;
  matchScore?: number;
}

export interface AiChatResponse {
  sessionId: string;
  message: { id: string; role: string; content: string };
  severity: 'NORMAL' | 'URGENT' | 'CRITICAL';
  isEmergency: boolean;
  emergencyNumber: string;
  emergencyAdvice?: string | null;
  hospitals: AiHospitalMatch[];
  sources: Array<{ title: string; sourceName?: string; excerpt?: string }>;
  provider: string;
  disclaimer: string;
}

export const aiApi = {
  async chat(body: {
    message: string;
    sessionId?: string | null;
    language?: AiLanguage;
    latitude?: number | null;
    longitude?: number | null;
  }): Promise<AiChatResponse> {
    const res = await apiClient.post('/ai/chat', body);
    return res.data.data;
  },

  async createSession(language: AiLanguage = 'en') {
    const res = await apiClient.post('/ai/sessions', { language });
    return res.data.data as { id: string };
  },

  async getMessages(sessionId: string) {
    const res = await apiClient.get(`/ai/sessions/${sessionId}/messages`);
    return res.data.data;
  },
};
