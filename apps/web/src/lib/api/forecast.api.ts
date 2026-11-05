import { apiClient } from './client';
import { WardType } from './beds.api';

export interface ForecastHorizonData {
  expectedFree: number;
  probabilityAtLeastOneFree: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  lambdaArrival: number;
  lambdaDischarge: number;
}

export interface WardForecast {
  hospitalId: string;
  wardType: WardType;
  currentFree: number;
  capacity: number;
  horizons: {
    h1?: ForecastHorizonData;
    h3?: ForecastHorizonData;
    h6?: ForecastHorizonData;
    '1h'?: ForecastHorizonData;
    '3h'?: ForecastHorizonData;
    '6h'?: ForecastHorizonData;
  };
  generatedAt: string;
}

export interface EquipmentForecastItem {
  equipmentId: string;
  type: string;
  name: string;
  currentStatus: string;
  estimatedReturnTime: string | null;
  historicalAvgDurationMinutes: number;
}

function normalizeHorizons(raw: any = {}): WardForecast['horizons'] {
  const pick = (a: string, b: string) => raw[a] || raw[b] || undefined;
  return {
    h1: pick('h1', '1h'),
    h3: pick('h3', '3h'),
    h6: pick('h6', '6h'),
    '1h': pick('1h', 'h1'),
    '3h': pick('3h', 'h3'),
    '6h': pick('6h', 'h6'),
  };
}

export const forecastApi = {
  async getWardForecast(hospitalId: string, wardType: WardType): Promise<WardForecast> {
    const res = await apiClient.get(`/hospitals/${hospitalId}/forecast`, {
      params: { wardType }
    });
    const data = res.data.data || {};
    return {
      ...data,
      horizons: normalizeHorizons(data.horizons),
    };
  },

  async getEquipmentForecast(hospitalId: string): Promise<EquipmentForecastItem[]> {
    const res = await apiClient.get(`/hospitals/${hospitalId}/equipment-forecast`);
    return res.data.data;
  }
};

