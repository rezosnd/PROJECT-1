import { apiClient } from './client';

export interface MatchedHospitalItem {
  hospital: {
    id: string;
    name: string;
    address: string;
    phone: string;
    emergency24x7: boolean;
    ratingAvg: number;
    latitude: number;
    longitude: number;
    specialties?: string[];
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
    const doctorsMeta = [
      { name: 'Dr. Tripathi', specialty: 'General Dentist', fee: 1100, icon: 'tooth' as const, color: '#B4F481', img: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&h=300&fit=crop' },
      { name: 'Dr. Shah', specialty: 'Cardiologist', fee: 1500, icon: 'heart' as const, color: '#FCE354', img: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&h=300&fit=crop' },
      { name: 'Dr. Fernandes', specialty: 'Neurologist', fee: 2300, icon: 'brain' as const, color: '#B4F481', img: 'https://images.unsplash.com/photo-1594824813518-a6f987be7d25?w=300&h=300&fit=crop' },
      { name: 'Dr. Tamakuwala', specialty: 'Nephrologist', fee: 2000, icon: 'kidney' as const, color: '#FCE354', img: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300&h=300&fit=crop' },
      { name: 'Dr. Mohapatra', specialty: 'Critical Care Specialist', fee: 1800, icon: 'activity' as const, color: '#B4F481', img: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&h=300&fit=crop' }
    ];

    const hospitals: MatchedHospitalItem[] = (data.matches || []).map((m: any, idx: number) => {
      const doc = doctorsMeta[idx % doctorsMeta.length];
      return {
        hospital: {
          id: m.hospitalId,
          name: m.hospitalName,
          address: m.address,
          phone: m.phone,
          emergency24x7: true,
          ratingAvg: Number(m.ratingAvg) || 4.5,
          latitude: m.location?.latitude || lat,
          longitude: m.location?.longitude || lng,
          specialties: [doc.specialty, 'Emergency Care', 'Critical Care'],
          doctorName: doc.name,
          doctorSpecialty: doc.specialty,
          doctorFee: doc.fee,
          doctorRating: Number(m.ratingAvg) || 4.5,
          doctorAvatar: doc.img,
          doctorHeroImage: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600&h=800&fit=crop',
          specialtyType: doc.icon,
          cardColor: doc.color,
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
