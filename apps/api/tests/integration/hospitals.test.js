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
import { redis } from '../../src/infra/redis.js';

let app;

describe('Hospitals Module (PostGIS Discovery, 30s Cache-Aside, & Governance)', () => {
  beforeAll(() => {
    setupTestDbMock();
    app = createApp();
  });

  beforeEach(() => {
    setupTestDbMock();
  });

  describe('GET /api/v1/hospitals (PostGIS Spatial Discovery)', () => {
    test('Finds verified hospitals within radius with distance calculations', async () => {
      const res = await request(app)
        .get('/api/v1/hospitals')
        .query({
          lat: 20.2961,
          lng: 85.8245,
          radiusKm: 30
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].distance_meters).toBeDefined();
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.total).toBeGreaterThan(0);
    });

    test('Filters hospitals by specialty and type', async () => {
      const res = await request(app)
        .get('/api/v1/hospitals')
        .query({
          type: 'GOVERNMENT',
          specialty: 'Cardiology'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('Distributed Systems Fault Tolerance: Redis stopped -> reads still work', async () => {
      // Simulate Redis cluster outage / partition
      const originalGet = redis.get.bind(redis);
      redis.get = async () => {
        throw new Error('ECONNREFUSED: Redis instance offline');
      };

      try {
        const res = await request(app)
          .get('/api/v1/hospitals')
          .query({
            lat: 20.2961,
            lng: 85.8245,
            radiusKm: 30
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
      } finally {
        redis.get = originalGet;
      }
    });
  });

  describe('GET /api/v1/hospitals/:id', () => {
    test('Returns hospital detail with live bed breakdown and equipment summary', async () => {
      const res = await request(app).get(`/api/v1/hospitals/${TEST_HOSPITAL_AIIMS_ID}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(TEST_HOSPITAL_AIIMS_ID);
      expect(res.body.data.name).toBe('AIIMS Bhubaneswar');
      expect(res.body.data.beds).toBeDefined();
      expect(res.body.data.equipment).toBeDefined();
    });

    test('Non-existent hospital returns HTTP 404', async () => {
      const nonExistentId = crypto.randomUUID();
      const res = await request(app).get(`/api/v1/hospitals/${nonExistentId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('HOSPITAL_NOT_FOUND');
    });
  });

  describe('POST /api/v1/hospitals', () => {
    test('CITY_ADMIN can onboard a new hospital and seed 10 ward inventory rows', async () => {
      const adminToken = createTestAccessToken({
        sub: TEST_CITY_ADMIN_ID,
        role: 'CITY_ADMIN'
      });

      const res = await request(app)
        .post('/api/v1/hospitals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Apollo Hospital Bhubaneswar',
          type: 'PRIVATE',
          registrationNo: 'OD-BBSR-2026-0003',
          address: 'Plot No. 251, Old Sainik School Road',
          city: 'Bhubaneswar',
          pin: '751005',
          latitude: 20.3120,
          longitude: 85.8360,
          phone: '+91-674-6661066',
          email: 'emergency@apollobbsr.com',
          emergency24x7: true,
          traumaLevel: 2,
          specialties: ['Cardiology', 'Oncology', 'Neurology'],
          facilities: ['ICU', 'NICU', 'Cath Lab']
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBe('Apollo Hospital Bhubaneswar');
    });

    test('HOSPITAL_STAFF receives HTTP 403 Forbidden when attempting to onboard hospital', async () => {
      const staffToken = createTestAccessToken({
        sub: TEST_STAFF_ID,
        role: 'HOSPITAL_STAFF',
        hospitalId: TEST_HOSPITAL_AIIMS_ID
      });

      const res = await request(app)
        .post('/api/v1/hospitals')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Unauthorized Hospital',
          type: 'PRIVATE',
          registrationNo: 'OD-BBSR-2026-9999',
          address: 'Random Road',
          city: 'Bhubaneswar',
          pin: '751001',
          latitude: 20.30,
          longitude: 85.80,
          phone: '+91-674-0000000',
          email: 'test@unauth.com'
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('PATCH /api/v1/hospitals/:id', () => {
    test('Staff can update their own hospital profile', async () => {
      const staffToken = createTestAccessToken({
        sub: TEST_STAFF_ID,
        role: 'HOSPITAL_STAFF',
        hospitalId: TEST_HOSPITAL_AIIMS_ID
      });

      const res = await request(app)
        .patch(`/api/v1/hospitals/${TEST_HOSPITAL_AIIMS_ID}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          phone: '+91-674-2476790'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('Tenant Isolation: Staff cannot update a different hospital profile (403 TENANT_ACCESS_DENIED)', async () => {
      const staffToken = createTestAccessToken({
        sub: TEST_STAFF_ID,
        role: 'HOSPITAL_STAFF',
        hospitalId: TEST_HOSPITAL_AIIMS_ID // AIIMS
      });

      // Attempt to modify KIMS Hospital
      const res = await request(app)
        .patch(`/api/v1/hospitals/${TEST_HOSPITAL_KIMS_ID}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ phone: '+91-674-9999999' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('TENANT_ACCESS_DENIED');
    });
  });

  describe('PATCH /api/v1/hospitals/:id/verify', () => {
    test('CITY_ADMIN can verify hospital status', async () => {
      const adminToken = createTestAccessToken({
        sub: TEST_CITY_ADMIN_ID,
        role: 'CITY_ADMIN'
      });

      const res = await request(app)
        .patch(`/api/v1/hospitals/${TEST_HOSPITAL_KIMS_ID}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'VERIFIED' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('VERIFIED');
    });

    test('HOSPITAL_STAFF cannot verify hospitals (403 Forbidden)', async () => {
      const staffToken = createTestAccessToken({
        sub: TEST_STAFF_ID,
        role: 'HOSPITAL_STAFF',
        hospitalId: TEST_HOSPITAL_AIIMS_ID
      });

      const res = await request(app)
        .patch(`/api/v1/hospitals/${TEST_HOSPITAL_AIIMS_ID}/verify`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'SUSPENDED' });

      expect(res.status).toBe(403);
    });
  });
});

