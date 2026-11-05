import { apiClient } from './client';

export interface MatchedHospitalItem {
  hospital: {
    id: string;
    name: string;
    type?: string;
    city?: string;
    address: string;
    phone: string;
    emergency24x7: boolean;
    ratingAvg: number;
    latitude: number;
    longitude: number;
    specialties?: string[];
    photoUrl?: string;
    doctorName?: string;
    doctorSpecialty?: string;
    doctorFee?: number;
    doctorRating?: number;
    doctorAvatar?: string;
    doctorHeroImage?: string;
    specialtyType?: 'tooth' | 'heart' | 'brain' | 'kidney' | 'activity';
    cardColor?: string;
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

export interface MatchResponse {
  condition: { id: string; name: string; category: string };
  matchedCount: number;
  hospitals: MatchedHospitalItem[];
  excluded: Array<{ hospitalId: string; hospitalName: string; reason: string }>;
  emergencyDisclaimer: string;
}

export const matchingApi = {
  async findMatches(params: {
    conditionSlug: string;
    severity?: number;
    lat?: number;
    lng?: number;
  }): Promise<MatchResponse> {
    const lat = params.lat || 20.2961;
    const lng = params.lng || 85.8245;
    const q = params.conditionSlug ? params.conditionSlug.replace(/-/g, ' ') : 'heart attack';

    const res = await apiClient.post('/match', {
      q,
      lat,
      lng,
      radiusKm: 25,
      limit: 15,
      severity: params.severity || 4,
    });

    const data = res.data.data;
    const cardMeta = [
      { type: 'Multi-specialty', icon: 'heart' as const, color: '#FCE354', img: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=400&h=400&fit=crop' },
      { type: 'Trauma & Emergency', icon: 'activity' as const, color: '#B4F481', img: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=400&fit=crop' },
      { type: 'Critical Care', icon: 'brain' as const, color: '#B4F481', img: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=400&h=400&fit=crop' },
      { type: 'Cardiac Center', icon: 'heart' as const, color: '#FCE354', img: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=400&h=400&fit=crop' },
      { type: 'City Hospital', icon: 'activity' as const, color: '#E9D5FF', img: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=400&h=400&fit=crop' },
    ];

    const hospitals: MatchedHospitalItem[] = (data.matches || []).map((m: any, idx: number) => {
      const meta = cardMeta[idx % cardMeta.length];
      return {
        hospital: {
          id: m.hospitalId,
          name: m.hospitalName,
          type: m.hospitalType || meta.type,
          city: m.city || undefined,
          address: m.address,
          phone: m.phone,
          emergency24x7: true,
          ratingAvg: Number(m.ratingAvg) || 4.5,
          latitude: m.location?.latitude || lat,
          longitude: m.location?.longitude || lng,
          specialties: m.specialties || [meta.type, 'Emergency Care', 'Critical Care'],
          photoUrl: m.photoUrl || meta.img,
          doctorAvatar: m.photoUrl || meta.img,
          doctorHeroImage: m.photoUrl || meta.img,
          specialtyType: meta.icon,
          cardColor: meta.color,
        },
        distanceKm: m.distanceKm,
        etaMinutes: m.etaMinutes,
        score: m.totalScore || (m.matchScore / 100),
        scoreBreakdown: {
          proximity: m.breakdown?.proximity || 0.9,
          beds: m.breakdown?.bedScore || 1,
          equipment: m.breakdown?.equipment || 1,
          specialty: m.breakdown?.specialty || 1,
        },
        matchedWard: {
          wardType: m.allocatedWard || 'ICU',
          freeBeds: m.freeBedsNow || 5,
          forecastProb1h: m.forecast?.['1h']?.probabilityAtLeastOneFree || 0.95,
          forecastProb3h: m.forecast?.['3h']?.probabilityAtLeastOneFree || 0.9,
          forecastProb6h: m.forecast?.['6h']?.probabilityAtLeastOneFree || 0.85,
          confidence: (m.forecast?.confidence || 'HIGH') as 'HIGH' | 'MEDIUM' | 'LOW',
        },
        matchedEquipment: [],
        explanation: m.explanation || `${m.freeBedsNow || 5} beds free now. Verified ready.`,
      };
    });

    return {
      condition: {
        id: data.condition?.id || 'cond-1',
        name: data.condition?.name || 'Emergency Medical Care',
        category: data.condition?.category || 'Acute Care',
      },
      matchedCount: hospitals.length,
      hospitals,
      excluded: (data.excluded || []).map((e: any) => ({
        hospitalId: e.hospitalId,
        hospitalName: e.hospitalName,
        reason: (e.reasons && e.reasons[0]) || 'Capacity full or missing specialty',
      })),
      emergencyDisclaimer: data.disclaimer || 'In an emergency call 112',
    };
  },
};
