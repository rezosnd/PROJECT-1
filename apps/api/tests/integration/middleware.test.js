import request from 'supertest';
import { createApp } from '../../src/app.js';
import {
  setupTestDbMock,
  resetTestDb,
  TEST_HOSPITAL_AIIMS_ID,
  TEST_HOSPITAL_KIMS_ID,
  TEST_CITY_ADMIN_ID,
  createTestAccessToken
} from '../fixtures/test-helper.js';

describe('Middleware Suite (Idempotency, Tenant Isolation, Validation)', () => {
  let app;

  beforeAll(() => {
    setupTestDbMock();
    app = createApp();
  });

  beforeEach(() => {
    resetTestDb();
  });

  describe('Idempotency Key Middleware', () => {
    test('Distributed Systems Guarantee: Replayed mutative request returns cached response', async () => {
      const adminToken = createTestAccessToken({
        sub: TEST_CITY_ADMIN_ID,
        role: 'CITY_ADMIN'
      });
      const idempotencyKey = 'unique-req-uuid-99999';

      // First request: executes and caches response
      const firstRes = await request(app)
        .post('/api/v1/auth/admin/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          email: 'first.exec@gmail.com',
          role: 'HOSPITAL_STAFF',
          hospitalId: TEST_HOSPITAL_AIIMS_ID
        });

      expect(firstRes.status).toBe(201);
      expect(firstRes.headers['x-idempotency-replayed']).toBeUndefined();

      // Second request with identical key: served from idempotency registry
      const secondRes = await request(app)
        .post('/api/v1/auth/admin/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          email: 'first.exec@gmail.com',
          role: 'HOSPITAL_STAFF',
          hospitalId: TEST_HOSPITAL_AIIMS_ID
        });

      expect(secondRes.status).toBe(201);
      expect(secondRes.headers['x-idempotency-replayed']).toBe('true');
      expect(secondRes.body.data.email).toBe('first.exec@gmail.com');
    });
  });

  describe('Zod Validation Middleware', () => {
    test('Payload missing mandatory field returns HTTP 422 with structured schema errors', async () => {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({}); // Missing idToken

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(res.body.error.details)).toBe(true);
      expect(res.body.error.details.some(d => d.path.includes('idToken'))).toBe(true);
      expect(res.body.traceId).toBeDefined();
    });

    test('Invalid clientType enum returns HTTP 422', async () => {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({
          idToken: 'mock-valid-token',
          clientType: 'smartwatch' // Invalid enum
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Tenant Isolation Middleware', () => {
    test('Hospital staff cannot override hospitalId via request body', async () => {
      const staffToken = createTestAccessToken({
        sub: 'staff-aiims-user',
        role: 'HOSPITAL_STAFF',
        hospitalId: TEST_HOSPITAL_AIIMS_ID
      });

      // Staff tries to create staff for KIMS
      const res = await request(app)
        .post('/api/v1/auth/admin/staff')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          email: 'tampered.staff@gmail.com',
          role: 'HOSPITAL_STAFF',
          hospitalId: TEST_HOSPITAL_KIMS_ID
        });

      // Staff is not allowed to register staff (only HOSPITAL_ADMIN or CITY_ADMIN)
      expect(res.status).toBe(403);
    });
  });
});

