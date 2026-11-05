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
  TEST_PATIENT_ID,
  TEST_CITY_ADMIN_ID
} from '../fixtures/test-helper.js';
import { bedsService } from '../../src/modules/beds/beds.service.js';

let app;

describe('Beds & Bed Reservation Module (Distributed Concurrency & Tenant Isolation)', () => {
  beforeAll(() => {
    setupTestDbMock();
    app = createApp();
  });

  beforeEach(() => {
    setupTestDbMock();
  });

  describe('GET /api/v1/hospitals/:id/beds', () => {
    test('Returns live ward inventory with strictly derived free beds', async () => {
      const res = await request(app).get(`/api/v1/hospitals/${TEST_HOSPITAL_AIIMS_ID}/beds`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const icu = res.body.data.find(w => w.ward_type === 'ICU');
      expect(icu).toBeDefined();
      expect(icu.total).toBe(10);
      expect(icu.occupied).toBe(7);
      expect(icu.reserved).toBe(2);
      expect(icu.cleaning).toBe(0);
      expect(icu.maintenance).toBe(0);
      // free = 10 - 7 - 2 - 0 - 0 = 1
      expect(icu.free).toBe(1);
    });
  });

  describe('POST /api/v1/hospitals/:id/beds/:wardType/adjust', () => {
    test('Staff can adjust bed counters with row locking and audit logging', async () => {
      const staffToken = createTestAccessToken({
        sub: TEST_STAFF_ID,
        role: 'HOSPITAL_STAFF',
        hospitalId: TEST_HOSPITAL_AIIMS_ID
      });
      const idempotencyKey = crypto.randomUUID();

      const res = await request(app)
        .post(`/api/v1/hospitals/${TEST_HOSPITAL_AIIMS_ID}/beds/ICU/adjust`)
        .set('Authorization', `Bearer ${staffToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          occupied: 1,
          reason: 'Emergency stroke admission'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.occupied).toBe(8);
      // free = 10 - 8 - 2 = 0
      expect(res.body.data.free).toBe(0);

      // Verify append-only ledger entry
      expect(testState.bed_ledger.length).toBeGreaterThan(0);
      const ledgerEntry = testState.bed_ledger.find(l => l.ward_type === 'ICU' && l.field === 'occupied');
      expect(ledgerEntry).toBeDefined();
      expect(ledgerEntry.delta).toBe(1);
    });

    test('Distributed Systems Invariant: Rejects adjust if counters become negative (409 INVALID_BED_STATE)', async () => {
      const staffToken = createTestAccessToken({
        sub: TEST_STAFF_ID,
        role: 'HOSPITAL_STAFF',
        hospitalId: TEST_HOSPITAL_AIIMS_ID
      });

      const res = await request(app)
        .post(`/api/v1/hospitals/${TEST_HOSPITAL_AIIMS_ID}/beds/ICU/adjust`)
        .set('Authorization', `Bearer ${staffToken}`)
        .set('Idempotency-Key', crypto.randomUUID())
        .send({
          occupied: -20 // Existing occupied is 7, cannot be negative
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_BED_STATE');
    });

    test('Tenant Isolation: Staff of Hospital A cannot adjust beds of Hospital B (403 TENANT_ACCESS_DENIED)', async () => {
      const staffToken = createTestAccessToken({
        sub: TEST_STAFF_ID,
        role: 'HOSPITAL_STAFF',
        hospitalId: TEST_HOSPITAL_AIIMS_ID // AIIMS Staff
      });

      // Tries to adjust KIMS Hospital beds
      const res = await request(app)
        .post(`/api/v1/hospitals/${TEST_HOSPITAL_KIMS_ID}/beds/ICU/adjust`)
        .set('Authorization', `Bearer ${staffToken}`)
        .set('Idempotency-Key', crypto.randomUUID())
        .send({ occupied: 1 });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('TENANT_ACCESS_DENIED');
    });

    test('Distributed Concurrency: Two simultaneous adjusts keep free correct', async () => {
      const staffToken = createTestAccessToken({
        sub: TEST_STAFF_ID,
        role: 'HOSPITAL_STAFF',
        hospitalId: TEST_HOSPITAL_AIIMS_ID
      });

      // AIIMS GENERAL ward initially: total 50, occupied 30, reserved 0, cleaning 5, maintenance 0 (free: 15)
      const p1 = request(app)
        .post(`/api/v1/hospitals/${TEST_HOSPITAL_AIIMS_ID}/beds/GENERAL/adjust`)
        .set('Authorization', `Bearer ${staffToken}`)
        .set('Idempotency-Key', crypto.randomUUID())
        .send({ occupied: 2 });

      const p2 = request(app)
        .post(`/api/v1/hospitals/${TEST_HOSPITAL_AIIMS_ID}/beds/GENERAL/adjust`)
        .set('Authorization', `Bearer ${staffToken}`)
        .set('Idempotency-Key', crypto.randomUUID())
        .send({ occupied: 3 });

      const [res1, res2] = await Promise.all([p1, p2]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      const genWard = testState.bed_inventory.find(w => w.hospital_id === TEST_HOSPITAL_AIIMS_ID && w.ward_type === 'GENERAL');
      expect(genWard.occupied).toBe(35);
      const free = genWard.total - genWard.occupied - genWard.reserved - genWard.cleaning - genWard.maintenance;
      expect(free).toBe(10);
    });
  });

  describe('Bed Reservations & High-Concurrency Allocation', () => {
    test('Distributed Systems Guarantee: Exactly 1 reservation succeeds and remaining parallel requests fail with HTTP 409', async () => {
      // AIIMS ICU has exactly 1 free bed initially (total 10, occupied 7, reserved 2 -> free = 1)
      const patientToken = createTestAccessToken({
        sub: TEST_PATIENT_ID,
        role: 'PATIENT'
      });

      // Dispatch 50 parallel bed requests each with a distinct patient and distinct idempotency key
      const concurrencyLevel = 50;
      const promises = [];

      for (let i = 0; i < concurrencyLevel; i++) {
        const uniquePatientId = crypto.randomUUID();
        const token = createTestAccessToken({ sub: uniquePatientId, role: 'PATIENT' });
        const idempotencyKey = crypto.randomUUID();

        promises.push(
          request(app)
            .post('/api/v1/bed-requests')
            .set('Authorization', `Bearer ${token}`)
            .set('Idempotency-Key', idempotencyKey)
            .send({
              hospitalId: TEST_HOSPITAL_AIIMS_ID,
              wardType: 'ICU',
              urgency: 'CRITICAL',
              note: `Parallel contender ${i + 1}`
            })
        );
      }

      const responses = await Promise.all(promises);

      const successResponses = responses.filter(r => r.status === 201);
      const conflictResponses = responses.filter(r => r.status === 409);

      // Invariant: Exactly 1 request acquires the final ICU bed
      expect(successResponses.length).toBe(1);
      expect(successResponses[0].body.success).toBe(true);
      expect(successResponses[0].body.data.status).toBe('PENDING');

      // Remaining 49 contenders fail with BED_NOT_AVAILABLE
      expect(conflictResponses.length).toBe(concurrencyLevel - 1);
      for (const res of conflictResponses) {
        expect(res.body.error.code).toBe('BED_NOT_AVAILABLE');
      }

      // Check bed inventory: reserved should now be 3, free should be 0
      const aiimsIcu = testState.bed_inventory.find(w => w.hospital_id === TEST_HOSPITAL_AIIMS_ID && w.ward_type === 'ICU');
      expect(aiimsIcu.reserved).toBe(3);
      expect(aiimsIcu.total - aiimsIcu.occupied - aiimsIcu.reserved).toBe(0);
    });

    test('Distributed Guarantee: Replaying bed request with identical Idempotency-Key returns cached 201 response', async () => {
      const patientToken = createTestAccessToken({
        sub: TEST_PATIENT_ID,
        role: 'PATIENT'
      });
      const idempotencyKey = 'patient-bed-req-key-1';

      // General ward has 15 free beds
      const firstRes = await request(app)
        .post('/api/v1/bed-requests')
        .set('Authorization', `Bearer ${patientToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          hospitalId: TEST_HOSPITAL_AIIMS_ID,
          wardType: 'GENERAL',
          urgency: 'NORMAL',
          note: 'Post-surgery recovery'
        });

      expect(firstRes.status).toBe(201);
      expect(firstRes.body.data.id).toBeDefined();
      const requestId = firstRes.body.data.id;

      // Replay identical request
      const secondRes = await request(app)
        .post('/api/v1/bed-requests')
        .set('Authorization', `Bearer ${patientToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          hospitalId: TEST_HOSPITAL_AIIMS_ID,
          wardType: 'GENERAL',
          urgency: 'NORMAL',
          note: 'Post-surgery recovery'
        });

      expect(secondRes.status).toBe(201);
      expect(secondRes.headers['x-idempotency-replayed']).toBe('true');
      expect(secondRes.body.data.id).toBe(requestId);
    });

    test('Hold Expiry Worker: Releases overdue reservation and restores free bed pool', async () => {
      // Create overdue pending request manually
      const overdueReq = {
        id: crypto.randomUUID(),
        patient_id: TEST_PATIENT_ID,
        hospital_id: TEST_HOSPITAL_AIIMS_ID,
        ward_type: 'ICU',
        urgency: 'URGENT',
        status: 'PENDING',
        hold_expires_at: new Date(Date.now() - 60000).toISOString(), // Expired 1 min ago
        created_at: new Date(Date.now() - 16 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 16 * 60 * 1000).toISOString(),
        reason: null
      };
      testState.bed_requests.push(overdueReq);

      // Trigger expiry cycle
      const expiredCount = await bedsService.expireOverdueHolds();
      expect(expiredCount).toBe(1);

      // Verify request transitioned to EXPIRED
      expect(overdueReq.status).toBe('EXPIRED');

      // Verify bed reserved counter was decremented
      const icu = testState.bed_inventory.find(w => w.hospital_id === TEST_HOSPITAL_AIIMS_ID && w.ward_type === 'ICU');
      expect(icu.reserved).toBe(1); // 2 -> 1
    });

    test('Patient Lifecycle: Patient reserves bed -> Staff formally admits patient', async () => {
      const patientToken = createTestAccessToken({
        sub: TEST_PATIENT_ID,
        role: 'PATIENT'
      });
      const staffToken = createTestAccessToken({
        sub: TEST_STAFF_ID,
        role: 'HOSPITAL_STAFF',
        hospitalId: TEST_HOSPITAL_AIIMS_ID
      });

      // 1. Patient creates bed request
      const reqRes = await request(app)
        .post('/api/v1/bed-requests')
        .set('Authorization', `Bearer ${patientToken}`)
        .set('Idempotency-Key', crypto.randomUUID())
        .send({
          hospitalId: TEST_HOSPITAL_AIIMS_ID,
          wardType: 'GENERAL',
          urgency: 'NORMAL'
        });

      expect(reqRes.status).toBe(201);
      const requestId = reqRes.body.data.id;

      // 2. Staff admits patient
      const admitRes = await request(app)
        .post(`/api/v1/bed-requests/${requestId}/admit`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(admitRes.status).toBe(200);
      expect(admitRes.body.data.status).toBe('ADMITTED');

      // Verify GENERAL ward occupancy increased by 1, reserved returned to 0
      const genWard = testState.bed_inventory.find(w => w.hospital_id === TEST_HOSPITAL_AIIMS_ID && w.ward_type === 'GENERAL');
      expect(genWard.occupied).toBe(31); // 30 -> 31
      expect(genWard.reserved).toBe(0);
    });

    test('Patient Lifecycle: Patient cancels bed request and frees reservation', async () => {
      const patientToken = createTestAccessToken({
        sub: TEST_PATIENT_ID,
        role: 'PATIENT'
      });

      // 1. Patient creates request
      const reqRes = await request(app)
        .post('/api/v1/bed-requests')
        .set('Authorization', `Bearer ${patientToken}`)
        .set('Idempotency-Key', crypto.randomUUID())
        .send({
          hospitalId: TEST_HOSPITAL_AIIMS_ID,
          wardType: 'GENERAL',
          urgency: 'NORMAL'
        });

      const requestId = reqRes.body.data.id;

      // 2. Patient queries /bed-requests/mine
      const mineRes = await request(app)
        .get('/api/v1/bed-requests/mine')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(mineRes.status).toBe(200);
      expect(mineRes.body.data.some(r => r.id === requestId)).toBe(true);

      // 3. Patient cancels request via PATCH /api/v1/bed-requests/:id/cancel
      const cancelRes = await request(app)
        .patch(`/api/v1/bed-requests/${requestId}/cancel`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe('CANCELLED');

      const genWard = testState.bed_inventory.find(w => w.hospital_id === TEST_HOSPITAL_AIIMS_ID && w.ward_type === 'GENERAL');
      expect(genWard.reserved).toBe(0);
    });

    test('Staff Decision: Staff approves or rejects pending bed request via PATCH /api/v1/bed-requests/:id/decision', async () => {
      const patientToken = createTestAccessToken({
        sub: TEST_PATIENT_ID,
        role: 'PATIENT'
      });
      const staffToken = createTestAccessToken({
        sub: TEST_STAFF_ID,
        role: 'HOSPITAL_STAFF',
        hospitalId: TEST_HOSPITAL_AIIMS_ID
      });

      const reqRes = await request(app)
        .post('/api/v1/bed-requests')
        .set('Authorization', `Bearer ${patientToken}`)
        .set('Idempotency-Key', crypto.randomUUID())
        .send({
          hospitalId: TEST_HOSPITAL_AIIMS_ID,
          wardType: 'GENERAL',
          urgency: 'NORMAL'
        });

      const requestId = reqRes.body.data.id;

      const decisionRes = await request(app)
        .patch(`/api/v1/bed-requests/${requestId}/decision`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          decision: 'REJECT',
          reason: 'Patient referred to specialized burns center'
        });

      expect(decisionRes.status).toBe(200);
      expect(decisionRes.body.data.status).toBe('REJECTED');
    });

    test('Masked ABHA Privacy: Staff sees masked ABHA only when patient shared ABHA consent', async () => {
      const patientToken = createTestAccessToken({
        sub: TEST_PATIENT_ID,
        role: 'PATIENT'
      });
      const staffToken = createTestAccessToken({
        sub: TEST_STAFF_ID,
        role: 'HOSPITAL_STAFF',
        hospitalId: TEST_HOSPITAL_AIIMS_ID
      });

      // Patient creates request with shareAbha: true
      await request(app)
        .post('/api/v1/bed-requests')
        .set('Authorization', `Bearer ${patientToken}`)
        .set('Idempotency-Key', crypto.randomUUID())
        .send({
          hospitalId: TEST_HOSPITAL_AIIMS_ID,
          wardType: 'GENERAL',
          urgency: 'NORMAL',
          shareAbha: true
        });

      // Staff queries hospital bed requests
      const listRes = await request(app)
        .get(`/api/v1/bed-requests/hospital/${TEST_HOSPITAL_AIIMS_ID}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBeGreaterThan(0);

      const target = listRes.body.data[0];
      expect(target.share_abha).toBe(true);
      expect(target.abha).toBeDefined();
      expect(target.abha.maskedNumber).toBe('**-****-****-abdm');
      expect(target.abha.verifiedName).toBe('Citizen Patient');
    });
  });

  describe('GET /api/v1/city-summary', () => {
    test('Public city summary returns all verified hospitals with derived free beds', async () => {
      const res = await request(app).get('/api/v1/city-summary');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      for (const item of res.body.data) {
        expect(item.hospital_name).toBeDefined();
        expect(item.ward_type).toBeDefined();
        expect(item.free).toBe(item.total - item.occupied - item.reserved - item.cleaning - item.maintenance);
      }
    });
  });
});
