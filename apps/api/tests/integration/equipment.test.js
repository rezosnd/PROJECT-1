import request from 'supertest';
import crypto from 'node:crypto';
import { createApp } from '../../src/app.js';
import {
  setupTestDbMock,
  testState,
  createTestAccessToken,
  TEST_HOSPITAL_AIIMS_ID,
  TEST_HOSPITAL_KIMS_ID,
  TEST_STAFF_ID,
  TEST_EQUIPMENT_VENT_AIIMS,
  TEST_EQUIPMENT_CT_AIIMS
} from '../fixtures/test-helper.js';
import { localRealtimeBus } from '../../src/modules/realtime/realtime.service.js';

let app;

describe('Equipment Module (Live Status, Cross-hospital PostGIS Search, & Critical Alerts)', () => {
  beforeAll(() => {
    setupTestDbMock();
    app = createApp();
  });

  beforeEach(() => {
    setupTestDbMock();
  });

  describe('GET /api/v1/hospitals/:id/equipment', () => {
    test('Lists hospital equipment with live status and criticality', async () => {
      const res = await request(app).get(`/api/v1/hospitals/${TEST_HOSPITAL_AIIMS_ID}/equipment`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const vent = res.body.data.find(e => e.type === 'VENTILATOR');
      expect(vent).toBeDefined();
      expect(vent.status).toBe('AVAILABLE');
      expect(vent.criticality).toBe('CRITICAL');
    });
  });

  describe('GET /api/v1/hospitals/:id/equipment/summary', () => {
    test('Returns aggregated equipment counts by type and operational status', async () => {
      const res = await request(app).get(`/api/v1/hospitals/${TEST_HOSPITAL_AIIMS_ID}/equipment/summary`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBeDefined();
      expect(res.body.data.byType).toBeDefined();
      expect(res.body.data.byType.VENTILATOR).toBeDefined();
      expect(res.body.data.byType.VENTILATOR.total).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/equipment (Cross-Hospital Discovery)', () => {
    test('Finds available equipment across hospitals within distance radius', async () => {
      const res = await request(app)
        .get('/api/v1/equipment')
        .query({
          type: 'VENTILATOR',
          status: 'AVAILABLE',
          lat: 20.2961,
          lng: 85.8245,
          radiusKm: 25
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].distance_meters).toBeDefined();
      expect(res.body.data[0].hospital_name).toBeDefined();
    });

    test('GET /api/v1/equipment/search endpoint functions identically to /equipment', async () => {
      const res = await request(app)
        .get('/api/v1/equipment/search')
        .query({
          type: 'CT',
          status: 'AVAILABLE',
          lat: 20.2961,
          lng: 85.8245,
          radiusKm: 25
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('PATCH /api/v1/equipment/:id/status', () => {
    test('Staff can update equipment status, appending to immutable telemetry log', async () => {
      const staffToken = createTestAccessToken({
        sub: TEST_STAFF_ID,
        role: 'HOSPITAL_STAFF',
        hospitalId: TEST_HOSPITAL_AIIMS_ID
      });

      const res = await request(app)
        .patch(`/api/v1/equipment/${TEST_EQUIPMENT_CT_AIIMS}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          status: 'IN_USE',
          reason: 'Emergency neuro-trauma CT scan'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('IN_USE');

      // Verify immutable telemetry log recorded old and new status
      expect(testState.equipment_status_log.length).toBeGreaterThan(0);
      const logEntry = testState.equipment_status_log.find(l => l.equipment_id === TEST_EQUIPMENT_CT_AIIMS);
      expect(logEntry).toBeDefined();
      expect(logEntry.old_status).toBe('AVAILABLE');
      expect(logEntry.new_status).toBe('IN_USE');
      expect(logEntry.actor_id).toBe(TEST_STAFF_ID);
    });

    test('Tenant Isolation: Staff of Hospital A cannot update equipment in Hospital B (403 TENANT_ACCESS_DENIED)', async () => {
      // AIIMS Staff attempts to modify KIMS equipment
      const kimsEqId = crypto.randomUUID();
      testState.equipment.push({
        id: kimsEqId,
        hospital_id: TEST_HOSPITAL_KIMS_ID,
        type: 'VENTILATOR',
        name: 'KIMS Ventilator',
        serial_no: 'SN-KIMS-V1',
        status: 'AVAILABLE',
        criticality: 'CRITICAL',
        available_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      const aiimsStaffToken = createTestAccessToken({
        sub: TEST_STAFF_ID,
        role: 'HOSPITAL_STAFF',
        hospitalId: TEST_HOSPITAL_AIIMS_ID
      });

      const res = await request(app)
        .patch(`/api/v1/equipment/${kimsEqId}/status`)
        .set('Authorization', `Bearer ${aiimsStaffToken}`)
        .send({ status: 'OFFLINE' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('TENANT_ACCESS_DENIED');
    });

    test('Critical Equipment Failure: OFFLINE transition triggers immediate alert and security audit log', async () => {
      const staffToken = createTestAccessToken({
        sub: TEST_STAFF_ID,
        role: 'HOSPITAL_STAFF',
        hospitalId: TEST_HOSPITAL_AIIMS_ID
      });

      let alertEmitted = false;
      const alertListener = (msg) => {
        if (msg.event === 'alert:critical-equipment') {
          alertEmitted = true;
          expect(msg.room).toBe(`hospital:${TEST_HOSPITAL_AIIMS_ID}`);
          expect(msg.payload.equipmentId).toBe(TEST_EQUIPMENT_VENT_AIIMS);
          expect(msg.payload.status).toBe('OFFLINE');
        }
      };

      localRealtimeBus.on('realtime:event', alertListener);

      try {
        const res = await request(app)
          .patch(`/api/v1/equipment/${TEST_EQUIPMENT_VENT_AIIMS}/status`)
          .set('Authorization', `Bearer ${staffToken}`)
          .send({
            status: 'OFFLINE',
            reason: 'O2 gas supply manifold pressure failure'
          });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('OFFLINE');

        // Verify alert was emitted across realtime bus
        expect(alertEmitted).toBe(true);

        // Verify critical alert recorded in audit_log
        const auditEntry = testState.audit_log.find(a => a.action === 'CRITICAL_EQUIPMENT_ALERT');
        expect(auditEntry).toBeDefined();
        expect(auditEntry.resource_id).toBe(TEST_EQUIPMENT_VENT_AIIMS);
      } finally {
        localRealtimeBus.off('realtime:event', alertListener);
      }
    });
  });

  describe('POST /api/v1/hospitals/:id/equipment', () => {
    test('Hospital staff can register new equipment for their hospital', async () => {
      const staffToken = createTestAccessToken({
        sub: TEST_STAFF_ID,
        role: 'HOSPITAL_STAFF',
        hospitalId: TEST_HOSPITAL_AIIMS_ID
      });

      const res = await request(app)
        .post(`/api/v1/hospitals/${TEST_HOSPITAL_AIIMS_ID}/equipment`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          type: 'MRI',
          name: 'Magnetom Vida 3.0T High-Field MRI',
          model: 'Siemens-Vida-2026',
          serialNo: 'SN-MRI-AIIMS-01',
          status: 'AVAILABLE',
          criticality: 'HIGH'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBe('Magnetom Vida 3.0T High-Field MRI');

      // Verify in testState
      const created = testState.equipment.find(e => e.serial_no === 'SN-MRI-AIIMS-01');
      expect(created).toBeDefined();
    });
  });
});

