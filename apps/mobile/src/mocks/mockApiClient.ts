import {
  mockConditions,
  mockHospitals,
  mockWards,
  mockEquipmentList,
  mockBedRequests,
  MockBedRequest,
  MockHospital,
} from './mockData';

let wardsState = [...mockWards];
let requestsState = [...mockBedRequests];
let abhaLinked = true;

export const mockApiClient = {
  async getConditions(q?: string) {
    if (!q) return mockConditions;
    const query = q.toLowerCase();
    return mockConditions.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.slug.includes(query) ||
        c.aliases.some((a) => a.includes(query))
    );
  },

  async findMatches(params: {
    conditionSlug: string;
    severity?: number;
    lat?: number;
    lng?: number;
  }) {
    const condition =
      mockConditions.find((c) => c.slug === params.conditionSlug) || mockConditions[0];
    const targetWard = condition.primaryBedType;

    const matches = mockHospitals.map((h, i) => {
      const ward = wardsState.find((w) => w.hospitalId === h.id && w.wardType === targetWard);
      const free = ward
        ? Math.max(0, ward.total - (ward.occupied + ward.reserved + ward.cleaning + ward.maintenance))
        : 0;

      const hospEquipment = mockEquipmentList.filter((e) => e.hospitalId === h.id);
      const eqMap: Record<string, { operational: boolean; inUse: boolean }> = {};
      condition.requiredEquipment.forEach((eq) => {
        const item = hospEquipment.find((e) => e.type === eq && e.status === 'OPERATIONAL');
        eqMap[eq] = { operational: !!item, inUse: item ? item.inUse : false };
      });

      const score = Math.max(45, 96 - i * 7 + free * 2);
      const confidence: 'HIGH' | 'MEDIUM' | 'LOW' = score > 80 ? 'HIGH' : score > 65 ? 'MEDIUM' : 'LOW';
      const waitHours = free > 0 ? 0 : 0.8 * (i + 1);

      return {
        hospital: h,
        distanceKm: Number((2.4 + i * 1.6).toFixed(1)),
        etaMinutes: 10 + i * 5,
        score: score / 100,
        scoreBreakdown: { proximity: 0.9, beds: 0.95, equipment: 0.9, specialty: 0.85 },
        matchedWard: {
          wardType: targetWard,
          freeBeds: free,
          forecastProb1h: 0.88,
          forecastProb3h: 0.82,
          forecastProb6h: 0.94,
          confidence,
        },
        matchedEquipment: condition.requiredEquipment.map((eq) => ({
          type: eq,
          availableCount: hospEquipment.filter((e) => e.type === eq && !e.inUse).length,
          totalCount: hospEquipment.filter((e) => e.type === eq).length,
        })),
        explanation: `${free} ${targetWard} beds verified available now. ${
          condition.requiredEquipment.length > 0 ? 'Diagnostic imaging online.' : 'Acute stabilization bay ready.'
        }`,
      };
    });

    const excluded = [
      {
        hospitalId: 'hosp-099',
        hospitalName: 'Bhubaneswar Ortho Center',
        reason: 'No designated ICU or emergency resuscitation bay available for acute neurological triage.',
      },
    ];

    return {
      condition: { id: condition.id, name: condition.name, category: 'Acute Care' },
      matchedCount: matches.length,
      hospitals: matches,
      excluded,
      emergencyDisclaimer: 'In an emergency call 112',
    };
  },

  async getHospitalById(id: string): Promise<MockHospital | undefined> {
    return mockHospitals.find((h) => h.id === id);
  },

  async getHospitalBeds(hospitalId: string) {
    return wardsState.filter((w) => w.hospitalId === hospitalId);
  },

  async getHospitalEquipment(hospitalId: string) {
    return mockEquipmentList.filter((e) => e.hospitalId === hospitalId);
  },

  async getAllEquipment(type?: string) {
    if (!type) return mockEquipmentList;
    return mockEquipmentList.filter((e) => e.type === type);
  },

  async getForecast(hospitalId: string, wardType = 'ICU') {
    return {
      hospitalId,
      wardType,
      currentFree: 3,
      horizons: {
        h1: { expectedFree: 2, probabilityAtLeastOneFree: 0.88, confidence: 'HIGH' as const },
        h3: { expectedFree: 5, probabilityAtLeastOneFree: 0.82, confidence: 'MEDIUM' as const },
        h6: { expectedFree: 8, probabilityAtLeastOneFree: 0.94, confidence: 'MEDIUM' as const },
      },
      chartPoints: [
        { time: 'Now', beds: 3 },
        { time: '+1h', beds: 5 },
        { time: '+3h', beds: 8 },
        { time: '+6h', beds: 11 },
      ],
    };
  },

  async requestBed(payload: {
    hospitalId: string;
    wardType: string;
    urgency: 'IMMEDIATE' | 'HIGH' | 'MODERATE';
    note?: string;
    shareAbha?: boolean;
    idempotencyKey: string;
  }): Promise<MockBedRequest> {
    const hosp = mockHospitals.find((h) => h.id === payload.hospitalId);
    const newReq: MockBedRequest = {
      id: `req-${Date.now()}`,
      hospitalId: payload.hospitalId,
      hospitalName: hosp?.name || 'Emergency Center',
      patientId: 'usr-patient-1',
      patientName: 'Subhashree Nayak',
      wardType: payload.wardType,
      urgency: payload.urgency,
      status: 'HOLD',
      holdExpiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
      createdAt: new Date().toISOString(),
      note: payload.note,
      shareAbha: payload.shareAbha ?? true,
      maskedAbha: '91-8843-1290-4412',
    };

    requestsState.unshift(newReq);

    // Optimistically update ward reserved beds
    const ward = wardsState.find((w) => w.hospitalId === payload.hospitalId && w.wardType === payload.wardType);
    if (ward) {
      ward.reserved += 1;
      ward.free = Math.max(0, ward.total - (ward.occupied + ward.reserved + ward.cleaning + ward.maintenance));
      ward.updatedAt = new Date().toISOString();
    }

    return newReq;
  },

  async getMyRequests(): Promise<MockBedRequest[]> {
    return [...requestsState];
  },

  async cancelBedRequest(requestId: string): Promise<void> {
    const req = requestsState.find((r) => r.id === requestId);
    if (req) {
      req.status = 'CANCELLED';
      const ward = wardsState.find((w) => w.hospitalId === req.hospitalId && w.wardType === req.wardType);
      if (ward) {
        ward.reserved = Math.max(0, ward.reserved - 1);
        ward.free = Math.max(0, ward.total - (ward.occupied + ward.reserved + ward.cleaning + ward.maintenance));
        ward.updatedAt = new Date().toISOString();
      }
    }
  },

  async getAbhaProfile() {
    if (!abhaLinked) return null;
    return {
      maskedNumber: '91-8843-1290-4412',
      abhaAddress: 'subhashree.nayak@abdm',
      name: 'Subhashree Nayak',
      gender: 'F',
      yearOfBirth: 1998,
      status: 'LINKED' as const,
      badge: 'Sandbox / Mock',
      verifiedAt: new Date().toISOString(),
    };
  },

  async unlinkAbha() {
    abhaLinked = false;
    return { success: true };
  },

  async linkAbha(abhaAddress: string) {
    abhaLinked = true;
    return {
      maskedNumber: '91-8843-1290-4412',
      abhaAddress: abhaAddress || 'patient.user@abdm',
      name: 'Subhashree Nayak',
      gender: 'F',
      yearOfBirth: 1998,
      status: 'LINKED' as const,
      badge: 'Sandbox / Mock',
      verifiedAt: new Date().toISOString(),
    };
  },
};

