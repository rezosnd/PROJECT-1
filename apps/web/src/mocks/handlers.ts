import { http, HttpResponse } from 'msw';
import {
  mockConditions,
  mockHospitals,
  mockWards,
  mockEquipmentList,
  mockBedRequests,
  mockAuditLogs,
} from './data';

// In-memory state for mock mutations during browsing session
let hospitalsState = [...mockHospitals];
let wardsState = [...mockWards];
let equipmentState = [...mockEquipmentList];
let requestsState = [...mockBedRequests];
let conditionsState = [...mockConditions];
let auditState: any[] = [...mockAuditLogs];

let abhaState: {
  linked: boolean;
  abhaAddress: string | null;
  abhaNumber: string | null;
  name: string | null;
  gender: string | null;
  yearOfBirth: string | null;
} = {
  linked: true,
  abhaAddress: 'subhashree.nayak@abdm',
  abhaNumber: '91-8843-1290-4412',
  name: 'Subhashree Nayak',
  gender: 'F',
  yearOfBirth: '1998',
};

export const handlers = [
  // -------------------------------------------------------------
  // AUTH
  // -------------------------------------------------------------
  http.post('*/auth/google', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as any;
    return HttpResponse.json({
      status: 'success',
      data: {
        accessToken: 'mock-jwt-token-' + Date.now(),
        user: {
          id: 'usr-patient-1',
          email: body.email || 'patient@example.com',
          name: body.name || 'Prototype Patient',
          role: 'PATIENT',
          hospitalId: null,
          picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
        },
      },
    });
  }),

  http.post('*/auth/refresh', () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        accessToken: 'mock-refreshed-jwt-' + Date.now(),
      },
    });
  }),

  http.get('*/auth/me', () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        id: 'usr-patient-1',
        email: 'patient@example.com',
        name: 'Prototype Patient',
        role: 'PATIENT',
      },
    });
  }),

  http.post('*/auth/logout', () => {
    return HttpResponse.json({
      status: 'success',
      data: { success: true },
    });
  }),

  // -------------------------------------------------------------
  // CONDITIONS
  // -------------------------------------------------------------
  http.get('*/conditions', () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        items: conditionsState,
        total: conditionsState.length,
      },
    });
  }),

  http.get('*/conditions/:id', ({ params }) => {
    const item = conditionsState.find((c) => c.id === params.id || c.slug === params.id);
    if (!item) {
      return HttpResponse.json({ status: 'error', message: 'Condition not found' }, { status: 404 });
    }
    return HttpResponse.json({ status: 'success', data: item });
  }),

  http.post('*/conditions', async ({ request }) => {
    const body = (await request.json()) as any;
    const newCond = {
      id: 'cond-' + Date.now(),
      name: body.name,
      slug: body.slug || body.name.toLowerCase().replace(/\s+/g, '-'),
      primaryBedType: body.primaryBedType,
      urgencyLevel: body.urgencyLevel || 3,
      description: body.description || '',
      requiredEquipment: body.requiredEquipment || [],
    };
    conditionsState.push(newCond);
    return HttpResponse.json({ status: 'success', data: newCond }, { status: 201 });
  }),

  // -------------------------------------------------------------
  // HOSPITALS
  // -------------------------------------------------------------
  http.get('*/hospitals', ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const filtered = status
      ? hospitalsState.filter((h) => h.status === status)
      : hospitalsState;

    return HttpResponse.json({
      status: 'success',
      data: {
        items: filtered,
        total: filtered.length,
      },
    });
  }),

  http.get('*/hospitals/:id', ({ params }) => {
    const hospital = hospitalsState.find((h) => h.id === params.id);
    if (!hospital) {
      return HttpResponse.json({ status: 'error', message: 'Hospital not found' }, { status: 404 });
    }
    return HttpResponse.json({ status: 'success', data: hospital });
  }),

  http.get('*/hospitals/:id/status', ({ params }) => {
    const hospital = hospitalsState.find((h) => h.id === params.id);
    const wards = wardsState.filter((w) => w.hospitalId === params.id);
    const equipment = equipmentState.filter((e) => e.hospitalId === params.id);
    return HttpResponse.json({
      status: 'success',
      data: { hospital, wards, equipment },
    });
  }),

  http.patch('*/hospitals/:id/status', async ({ params, request }) => {
    const body = (await request.json()) as any;
    const hospital = hospitalsState.find((h) => h.id === params.id);
    if (hospital && body.status) {
      hospital.status = body.status;
      auditState.unshift({
        id: 'aud-' + Date.now(),
        actorId: 'usr-cityadmin',
        action: 'HOSPITAL_STATUS_UPDATED',
        resourceType: 'hospital',
        resourceId: String(params.id),
        ip: '127.0.0.1',
        meta: { status: body.status },
        at: new Date().toISOString(),
      });
    }
    return HttpResponse.json({ status: 'success', data: hospital });
  }),

  // -------------------------------------------------------------
  // BEDS & WARDS
  // -------------------------------------------------------------
  http.get('*/hospitals/:id/beds', ({ params }) => {
    const wards = wardsState.filter((w) => w.hospitalId === params.id);
    return HttpResponse.json({ status: 'success', data: wards });
  }),

  http.post('*/hospitals/:id/beds/:wardType/adjust', async ({ params, request }) => {
    const body = (await request.json()) as any;
    const { wardType, id: hospitalId } = params;
    let ward = wardsState.find((w) => w.hospitalId === hospitalId && w.wardType === wardType);

    if (ward) {
      if (body.deltaOccupied !== undefined) ward.occupied = Math.max(0, ward.occupied + body.deltaOccupied);
      if (body.deltaReserved !== undefined) ward.reserved = Math.max(0, ward.reserved + body.deltaReserved);
      if (body.deltaCleaning !== undefined) ward.cleaning = Math.max(0, ward.cleaning + body.deltaCleaning);
      if (body.deltaMaintenance !== undefined) ward.maintenance = Math.max(0, ward.maintenance + body.deltaMaintenance);
      if (body.total !== undefined) ward.total = Math.max(0, body.total);
      ward.free = Math.max(0, ward.total - (ward.occupied + ward.reserved + ward.cleaning + ward.maintenance));
      ward.version = (ward.version || 1) + 1;
      ward.updatedAt = new Date().toISOString();
    }

    return HttpResponse.json({ status: 'success', data: ward });
  }),

  http.post('*/bed-requests', async ({ request }) => {
    const body = (await request.json()) as any;
    const newReq = {
      id: 'req-' + Date.now(),
      hospitalId: body.hospitalId,
      patientId: 'usr-patient-1',
      patientName: 'Subhashree Nayak',
      wardType: body.wardType || 'ICU',
      urgency: body.urgency || 'HIGH',
      status: 'PENDING' as const,
      note: body.note,
      shareAbha: body.shareAbha ?? true,
      maskedAbha: '91-XXXX-XXXX-4412',
      holdExpiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    requestsState.unshift(newReq as any);

    // Also optimistically increment reserved in ward
    const ward = wardsState.find((w) => w.hospitalId === body.hospitalId && w.wardType === newReq.wardType);
    if (ward) {
      ward.reserved += 1;
      ward.free = Math.max(0, ward.total - (ward.occupied + ward.reserved + ward.cleaning + ward.maintenance));
      ward.updatedAt = new Date().toISOString();
    }

    return HttpResponse.json({ status: 'success', data: newReq }, { status: 201 });
  }),

  http.get('*/hospitals/:id/bed-requests', ({ params }) => {
    const list = requestsState.filter((r) => r.hospitalId === params.id);
    return HttpResponse.json({ status: 'success', data: list });
  }),

  http.get('*/bed-requests/me', () => {
    return HttpResponse.json({
      status: 'success',
      data: requestsState,
    });
  }),

  http.patch('*/bed-requests/:requestId/decision', async ({ params, request }) => {
    const body = (await request.json()) as any;
    const req = requestsState.find((r) => r.id === params.requestId);
    if (req && body.decision) {
      req.status = body.decision;
      const ward = wardsState.find((w) => w.hospitalId === req.hospitalId && (w.wardType === (req as any).wardType || w.wardType === (req as any).bedType));
      if (body.decision === 'ADMITTED' && ward) {
        ward.reserved = Math.max(0, ward.reserved - 1);
        ward.occupied += 1;
        ward.free = Math.max(0, ward.total - (ward.occupied + ward.reserved + ward.cleaning + ward.maintenance));
        ward.updatedAt = new Date().toISOString();
      } else if ((body.decision === 'REJECTED' || body.decision === 'EXPIRED') && ward) {
        ward.reserved = Math.max(0, ward.reserved - 1);
        ward.free = Math.max(0, ward.total - (ward.occupied + ward.reserved + ward.cleaning + ward.maintenance));
        ward.updatedAt = new Date().toISOString();
      }
    }
    return HttpResponse.json({ status: 'success', data: req });
  }),

  http.get('*/city-summary', () => {
    const totalBeds = wardsState.reduce((s, w) => s + w.total, 0);
    const occupied = wardsState.reduce((s, w) => s + w.occupied, 0);
    const free = wardsState.reduce((s, w) => s + w.free, 0);
    return HttpResponse.json({
      status: 'success',
      data: {
        totalBeds,
        occupiedBeds: occupied,
        freeBeds: free,
        occupancyRate: totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0,
        hospitalsCount: hospitalsState.length,
      },
    });
  }),

  // -------------------------------------------------------------
  // MATCHING ENGINE
  // -------------------------------------------------------------
  http.post('*/match', async ({ request }) => {
    const body = (await request.json()) as any;
    const { conditionSlug, severity = 3 } = body;
    const condition = conditionsState.find((c) => c.slug === conditionSlug) || conditionsState[0];
    const targetBedType = condition?.primaryBedType || 'ICU';

    const matches = hospitalsState.map((h, index) => {
      const ward = wardsState.find((w) => w.hospitalId === h.id && w.wardType === targetBedType);
      const free = ward
        ? Math.max(0, ward.total - (ward.occupied + ward.reserved + ward.cleaning + ward.maintenance))
        : 0;

      const hospEquipment = equipmentState.filter((e) => e.hospitalId === h.id);
      const eqMap: Record<string, { operational: boolean; inUse: boolean }> = {};
      condition.requiredEquipment.forEach((eqType) => {
        const found = hospEquipment.find((e) => e.type === eqType && e.status === 'OPERATIONAL');
        eqMap[eqType] = {
          operational: !!found,
          inUse: found ? found.inUse : false,
        };
      });

      // Simple scoring algorithm
      let score = 95 - index * 8 + free * 2;
      let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = score > 80 ? 'HIGH' : score > 60 ? 'MEDIUM' : 'LOW';
      let waitHours = free > 0 ? 0 : 0.8 * (index + 1);

      return {
        hospital: h,
        bedType: targetBedType,
        freeBeds: free,
        totalBeds: ward?.total || 30,
        score: Math.min(99, Math.max(35, score)),
        confidence,
        predictedWaitHours: waitHours,
        distanceKm: 2.1 + index * 1.8,
        matchReasons: [
          `${free} ${targetBedType} beds verified available now`,
          condition.requiredEquipment.length > 0
            ? `Required equipment (${condition.requiredEquipment.join(', ')}) confirmed operational`
            : 'Standard acute care intake protocol satisfied',
          `Distance 2.${index * 2 + 1} km via Janpath Road`,
        ],
        equipmentStatus: eqMap,
      };
    });

    return HttpResponse.json({
      status: 'success',
      data: {
        matches,
        totalMatches: matches.length,
        timestamp: new Date().toISOString(),
      },
    });
  }),

  // -------------------------------------------------------------
  // EQUIPMENT
  // -------------------------------------------------------------
  http.get('*/equipment', ({ request }) => {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const hospitalId = url.searchParams.get('hospitalId');

    let filtered = equipmentState;
    if (type) filtered = filtered.filter((e) => e.type === type);
    if (hospitalId) filtered = filtered.filter((e) => e.hospitalId === hospitalId);

    return HttpResponse.json({
      status: 'success',
      data: { items: filtered, total: filtered.length },
    });
  }),

  http.get('*/hospitals/:id/equipment', ({ params }) => {
    const list = equipmentState.filter((e) => e.hospitalId === params.id);
    return HttpResponse.json({ status: 'success', data: { items: list, total: list.length } });
  }),

  http.patch('*/hospitals/:id/equipment/:equipmentId', async ({ params, request }) => {
    const body = (await request.json()) as any;
    const item = equipmentState.find((e) => e.id === params.equipmentId);
    if (item) {
      if (body.status !== undefined) item.status = body.status;
      if (body.inUse !== undefined) item.inUse = body.inUse;
      if (body.availableAt !== undefined) item.availableAt = body.availableAt;
    }
    return HttpResponse.json({ status: 'success', data: item });
  }),

  // -------------------------------------------------------------
  // FORECAST
  // -------------------------------------------------------------
  http.get('*/forecast/:hospitalId', ({ params }) => {
    return HttpResponse.json({
      status: 'success',
      data: {
        hospitalId: params.hospitalId,
        expectedDischargesNext3h: 4,
        forecasts: [
          { hoursAhead: 1, predictedAvailableBeds: 2, confidence: 0.89 },
          { hoursAhead: 3, predictedAvailableBeds: 5, confidence: 0.74 },
          { hoursAhead: 6, predictedAvailableBeds: 9, confidence: 0.68 },
        ],
      },
    });
  }),

  // -------------------------------------------------------------
  // ABHA
  // -------------------------------------------------------------
  http.post('*/abha/consent', () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        consentId: 'cns-' + Date.now(),
        granted: true,
        expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
      },
    });
  }),

  http.post('*/abha/init', () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        txnId: 'txn-mock-' + Date.now(),
        method: 'AADHAAR_OTP',
        message: 'Mock Aadhaar OTP sent to registered mobile number (use 123456 in demo)',
      },
    });
  }),

  http.post('*/abha/verify', () => {
    abhaState = {
      linked: true,
      abhaAddress: 'subhashree.nayak@abdm',
      abhaNumber: '91-8843-1290-4412',
      name: 'Subhashree Nayak',
      gender: 'F',
      yearOfBirth: '1998',
    };
    return HttpResponse.json({
      status: 'success',
      data: abhaState,
    });
  }),

  http.post('*/abha/link/init', () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        txnId: 'txn-link-' + Date.now(),
        method: 'MOBILE_OTP',
      },
    });
  }),

  http.post('*/abha/link/confirm', () => {
    abhaState = {
      linked: true,
      abhaAddress: 'subhashree.nayak@abdm',
      abhaNumber: '91-8843-1290-4412',
      name: 'Subhashree Nayak',
      gender: 'F',
      yearOfBirth: '1998',
    };
    return HttpResponse.json({
      status: 'success',
      data: abhaState,
    });
  }),

  http.get('*/abha/profile', () => {
    return HttpResponse.json({
      status: 'success',
      data: abhaState,
    });
  }),

  http.delete('*/abha/link', () => {
    abhaState = {
      linked: false,
      abhaAddress: null,
      abhaNumber: null,
      name: null,
      gender: null,
      yearOfBirth: null,
    };
    return HttpResponse.json({
      status: 'success',
      data: { success: true },
    });
  }),

  // -------------------------------------------------------------
  // ADMIN
  // -------------------------------------------------------------
  http.post('*/auth/admin/staff', async ({ request }) => {
    const body = (await request.json()) as any;
    const newStaff = {
      id: 'usr-' + Date.now(),
      email: body.email,
      hospitalId: body.hospitalId,
      role: body.role,
      status: 'ACTIVE',
    };
    auditState.unshift({
      id: 'aud-' + Date.now(),
      actorId: 'usr-cityadmin',
      action: 'STAFF_PRE_REGISTERED',
      resourceType: 'user_prereg',
      resourceId: body.email,
      ip: '127.0.0.1',
      meta: { hospitalId: body.hospitalId, role: body.role },
      at: new Date().toISOString(),
    });
    return HttpResponse.json({ status: 'success', data: newStaff }, { status: 201 });
  }),

  http.get('*/admin/audit', () => {
    return HttpResponse.json({
      status: 'success',
      data: { items: auditState, total: auditState.length },
    });
  }),
];
