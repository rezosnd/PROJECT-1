import { apiClient } from './client';

export interface HorizonInfo {
  expectedFree: number;
  probabilityAtLeastOneFree: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface WardForecastResponse {
  hospitalId: string;
  wardType: string;
  currentFree: number;
  horizons: {
    h1: HorizonInfo;
    h3: HorizonInfo;
    h6: HorizonInfo;
  };
  chartPoints?: Array<{ time: string; beds: number }>;
}

export const forecastApi = {
  async getForecast(hospitalId: string, wardType = 'ICU'): Promise<WardForecastResponse> {
    const res = await apiClient.get(`/hospitals/${hospitalId}/forecast`, { params: { wardType } });
    const data = res.data.data;
    const conf: 'HIGH' | 'MEDIUM' | 'LOW' = (data.confidence as any) || 'HIGH';

    const h1 = data.horizons?.['1h'] || data.horizons?.h1 || { expectedFree: data.currentFree, probabilityAtLeastOneFree: 0.95 };
    const h3 = data.horizons?.['3h'] || data.horizons?.h3 || { expectedFree: data.currentFree, probabilityAtLeastOneFree: 0.90 };
    const h6 = data.horizons?.['6h'] || data.horizons?.h6 || { expectedFree: data.currentFree, probabilityAtLeastOneFree: 0.85 };

    return {
      hospitalId: data.hospitalId || hospitalId,
      wardType: data.wardType || wardType,
      currentFree: Number(data.currentFree) || 0,
      horizons: {
        h1: {
          expectedFree: Number(h1.expectedFree) || 0,
          probabilityAtLeastOneFree: Number(h1.probabilityAtLeastOneFree) || 1,
          confidence: conf,
        },
        h3: {
          expectedFree: Number(h3.expectedFree) || 0,
          probabilityAtLeastOneFree: Number(h3.probabilityAtLeastOneFree) || 1,
          confidence: conf,
        },
        h6: {
          expectedFree: Number(h6.expectedFree) || 0,
          probabilityAtLeastOneFree: Number(h6.probabilityAtLeastOneFree) || 1,
          confidence: conf,
        },
      },
      chartPoints: [
        { time: 'Now', beds: Number(data.currentFree) || 0 },
        { time: '+1h', beds: Math.round(Number(h1.expectedFree) || 0) },
        { time: '+3h', beds: Math.round(Number(h3.expectedFree) || 0) },
        { time: '+6h', beds: Math.round(Number(h6.expectedFree) || 0) },
      ],
    };
  },
};
