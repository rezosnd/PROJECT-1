import request from 'supertest';
import { createApp } from '../../src/app.js';
import {
  setupTestDbMock,
  resetTestDb,
  testState,
  TEST_HOSPITAL_AIIMS_ID,
  TEST_HOSPITAL_KIMS_ID,
  TEST_CITY_ADMIN_ID,
  TEST_STAFF_ID,
  TEST_PATIENT_ID,
  createTestAccessToken
} from '../fixtures/test-helper.js';

describe('Admin Endpoints (Staff Pre-registration and Governance)', () => {
  let app;

  beforeAll(() => {
    setupTestDbMock();
    app = createApp();
  });

  beforeEach(() => {
    resetTestDb();
  });

  describe('POST /api/v1/auth/admin/staff', () => {
    test('CITY_ADMIN can pre-register staff for any hospital', async () => {
      const adminToken = createTestAccessToken({
        sub: TEST_CITY_ADMIN_ID,
        role: 'CITY_ADMIN'
      });

      const res = await request(app)
        .post('/api/v1/auth/admin/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'cardiologist.kims@gmail.com',
          role: 'HOSPITAL_STAFF',
          hospitalId: TEST_HOSPITAL_KIMS_ID
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('cardiologist.kims@gmail.com');
      expect(res.body.data.role).toBe('HOSPITAL_STAFF');
      expect(res.body.data.hospitalId).toBe(TEST_HOSPITAL_KIMS_ID);
    });

    test('HOSPITAL_ADMIN can pre-register staff for their own hospital', async () => {
      const hospitalAdminToken = createTestAccessToken({
        sub: 'admin-aiims-uuid',
        role: 'HOSPITAL_ADMIN',
        hospitalId: TEST_HOSPITAL_AIIMS_ID
      });

      const res = await request(app)
        .post('/api/v1/auth/admin/staff')
        .set('Authorization', `Bearer ${hospitalAdminToken}`)
        .send({
          email: 'icu.nurse.aiims@gmail.com',
          role: 'HOSPITAL_STAFF',
          hospitalId: TEST_HOSPITAL_AIIMS_ID
        });

      expect(res.status).toBe(201);
      expect(res.body.data.email).toBe('icu.nurse.aiims@gmail.com');
    });

    test('HOSPITAL_ADMIN cannot pre-register staff for a different hospital (Tenant Access Denied)', async () => {
      const hospitalAdminToken = createTestAccessToken({
        sub: 'admin-aiims-uuid',
        role: 'HOSPITAL_ADMIN',
        hospitalId: TEST_HOSPITAL_AIIMS_ID
      });

      const res = await request(app)
        .post('/api/v1/auth/admin/staff')
        .set('Authorization', `Bearer ${hospitalAdminToken}`)
        .send({
          email: 'illegal.cross.tenant@gmail.com',
          role: 'HOSPITAL_STAFF',
          hospitalId: TEST_HOSPITAL_KIMS_ID // Mismatched tenant
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('TENANT_ACCESS_DENIED');
    });

    test('PATIENT role receives HTTP 403 Forbidden', async () => {
      const patientToken = createTestAccessToken({
        sub: TEST_PATIENT_ID,
        role: 'PATIENT'
      });

      const res = await request(app)
        .post('/api/v1/auth/admin/staff')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          email: 'intruder@gmail.com',
          role: 'HOSPITAL_STAFF',
          hospitalId: TEST_HOSPITAL_AIIMS_ID
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/v1/auth/admin/users', () => {
    test('CITY_ADMIN can list registered users with pagination metadata', async () => {
      const adminToken = createTestAccessToken({
        sub: TEST_CITY_ADMIN_ID,
        role: 'CITY_ADMIN'
      });

      const res = await request(app)
        .get('/api/v1/auth/admin/users?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.page).toBe(1);
    });

    test('HOSPITAL_STAFF cannot access user directory (HTTP 403)', async () => {
      const staffToken = createTestAccessToken({
        sub: TEST_STAFF_ID,
        role: 'HOSPITAL_STAFF',
        hospitalId: TEST_HOSPITAL_AIIMS_ID
      });

      const res = await request(app)
        .get('/api/v1/auth/admin/users')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('PATCH /api/v1/auth/admin/users/:id/status', () => {
    test('CITY_ADMIN can suspend a user account', async () => {
      const adminToken = createTestAccessToken({
        sub: TEST_CITY_ADMIN_ID,
        role: 'CITY_ADMIN'
      });

      const res = await request(app)
        .patch(`/api/v1/auth/admin/users/${TEST_PATIENT_ID}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'SUSPENDED' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('SUSPENDED');

      // Verify user state in store
      const updatedUser = testState.users.find(x => x.id === TEST_PATIENT_ID);
      expect(updatedUser.status).toBe('SUSPENDED');
    });

    test('CITY_ADMIN cannot suspend their own identity (HTTP 400)', async () => {
      const adminToken = createTestAccessToken({
        sub: TEST_CITY_ADMIN_ID,
        role: 'CITY_ADMIN'
      });

      const res = await request(app)
        .patch(`/api/v1/auth/admin/users/${TEST_CITY_ADMIN_ID}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'SUSPENDED' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('SELF_SUSPENSION_PROHIBITED');
    });
  });
});

