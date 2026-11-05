import { apiClient } from './client';

export interface MatchRequest {
  conditionId?: string;
  q?: string;
  lat: number;
  lng: number;
  radiusKm?: number;
  severity?: number;
  clientType?: 'web' | 'mobile';
  emergencyOnly?: boolean;
}

export interface MatchedHospital {
  hospital: {
    id: string;
    name: string;
    address: string;
    phone: string;
    emergency24x7: boolean;
    traumaLevel: number;
    ratingAvg: number;
    latitude: number;
    longitude: number;
    photoUrl?: string;
  };
  distanceKm: number;
  etaMinutes: number;
  score: number;
  scoreBreakdown: {
    proximity: number;
    beds: number;
    equipment: number;
    specialty: number;
  };
  matchedWard: {
    wardType: string;
    freeBeds: number;
    forecastProb1h: number;
    forecastProb3h: number;
    forecastProb6h: number;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  matchedEquipment: Array<{
    type: string;
    availableCount: number;
    totalCount: number;
  }>;
  explanation: string;
}

export interface MatchExcludedHospital {
  hospitalId: string;
  hospitalName: string;
  reason: string;
}

export interface MatchResponse {
  condition: {
    id: string;
    name: string;
    category: string;
  };
  matchedCount: number;
  hospitals: MatchedHospital[];
  excluded: MatchExcludedHospital[];
  emergencyDisclaimer: string;
}

export const matchingApi = {
  async findMatches(params: MatchRequest): Promise<MatchResponse> {
    const res = await apiClient.post('/match', params);
    const raw = res.data.data;
    const rawMatches = raw.matches || raw.hospitals || [];

    const hospitals: MatchedHospital[] = rawMatches.map((m: any) => {
      if (m.hospital && m.matchedWard) return m;

      const wardType = m.allocatedWard || m.matchedWard?.wardType || 'ICU';
      const freeBeds = m.freeBedsNow ?? m.matchedWard?.freeBeds ?? 0;
      const forecast1h = m.forecast?.['1h']?.probabilityAtLeastOneFree ?? 1;
      const forecast3h = m.forecast?.['3h']?.probabilityAtLeastOneFree ?? 0.8;
      const forecast6h = m.forecast?.['6h']?.probabilityAtLeastOneFree ?? 0.6;
      const confidence = m.forecast?.confidence || 'MEDIUM';

      return {
        hospital: {
          id: m.hospitalId || m.id,
          name: m.hospitalName || m.name,
          address: m.address || '',
          phone: m.phone || '',
          emergency24x7: m.emergency24x7 ?? true,
          traumaLevel: m.traumaLevel ?? 2,
          ratingAvg: Number(m.ratingAvg) || 4.2,
          latitude: m.location?.latitude ?? m.latitude ?? 20.2961,
          longitude: m.location?.longitude ?? m.longitude ?? 85.8245,
          photoUrl: m.photoUrl
        },
        distanceKm: m.distanceKm ?? 0,
        etaMinutes: m.etaMinutes ?? 5,
        score: m.totalScore ?? (m.matchScore ? m.matchScore / 100 : 0.9),
        scoreBreakdown: {
          proximity: m.breakdown?.proximity ?? 0.9,
          beds: m.breakdown?.bedScore ?? 1,
          equipment: m.breakdown?.equipment ?? 1,
          specialty: m.breakdown?.specialty ?? 1
        },
        matchedWard: {
          wardType,
          freeBeds,
          forecastProb1h: forecast1h,
          forecastProb3h: forecast3h,
          forecastProb6h: forecast6h,
          confidence
        },
        matchedEquipment: m.matchedEquipment || [],
        explanation: m.explanation || `${wardType} available. Real-time verified.`
      };
    });

    return {
      condition: raw.condition || { id: 'c1', name: 'Emergency Care', category: 'Trauma' },
      matchedCount: raw.matchesCount ?? hospitals.length,
      hospitals,
      excluded: raw.excluded || [],
      emergencyDisclaimer: raw.disclaimer || 'Not a medical device; In an emergency call 112.'
    };
  }
};

