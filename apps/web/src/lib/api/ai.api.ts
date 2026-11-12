import { apiClient } from './client';

export interface AiHospitalMatch {
  hospitalId: string;
  name: string;
  distanceKm?: number;
  etaMinutes?: number;
  freeBedsNow?: number;
  allocatedWard?: string;
  phone?: string;
  address?: string;
  explanation?: string;
  matchScore?: number;
}

export interface AiChatResponse {
  sessionId: string;
  message: { id: string; role: string; content: string; createdAt?: string };
  severity: 'NORMAL' | 'URGENT' | 'CRITICAL';
  isEmergency: boolean;
  emergencyNumber: string;
  emergencyAdvice?: string | null;
  hospitals: AiHospitalMatch[];
  sources: Array<{ title: string; sourceName?: string; sourceUrl?: string; excerpt?: string }>;
  provider: string;
  disclaimer: string;
}

export const aiApi = {
  async chat(body: {
    message: string;
    sessionId?: string | null;
    language?: 'en' | 'hi' | 'or';
    latitude?: number | null;
    longitude?: number | null;
  }): Promise<AiChatResponse> {
    const res = await apiClient.post('/ai/chat', body);
    return res.data.data;
  },

  async createSession(language: 'en' | 'hi' | 'or' = 'en') {
    const res = await apiClient.post('/ai/sessions', { language });
    return res.data.data as { id: string };
  },

  async listSessions() {
    const res = await apiClient.get('/ai/sessions');
    return res.data.data || [];
  },

  async getMessages(sessionId: string) {
    const res = await apiClient.get(`/ai/sessions/${sessionId}/messages`);
    return res.data.data;
  },

  async analyzeEmergency(text: string) {
    const res = await apiClient.post('/ai/analyze-emergency', { text });
    return res.data.data;
  },

  async recommendHospitals(body: {
    q: string;
    lat: number;
    lng: number;
    radiusKm?: number;
    severity?: string;
  }) {
    const res = await apiClient.post('/ai/recommend-hospitals', body);
    return res.data.data;
  },

  async createEmergency(body: {
    text: string;
    sessionId?: string;
    latitude?: number | null;
    longitude?: number | null;
  }) {
    const res = await apiClient.post('/ai/emergency', body);
    return res.data.data;
  },

  async medicalSources() {
    const res = await apiClient.get('/ai/medical-sources');
    return res.data.data || [];
  },
};
