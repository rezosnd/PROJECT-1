import request from 'supertest';
import { createApp } from '../../src/app.js';
import {
  setupTestDbMock,
  resetTestDb,
  TEST_HOSPITAL_AIIMS_ID,
  TEST_CITY_ADMIN_ID,
  createTestAccessToken
} from '../fixtures/test-helper.js';
import { setCustomGoogleVerifier, resetCustomGoogleVerifier } from '../../src/modules/auth/google-verifier.js';

describe('Distributed Concurrency Tests', () => {
  let app;

  beforeAll(() => {
    setupTestDbMock();
    app = createApp();
  });

  beforeEach(() => {
    resetTestDb();
    resetCustomGoogleVerifier();
  });

  test('Concurrency: 10 parallel requests with identical Idempotency-Key achieve consistent results', async () => {
    const adminToken = createTestAccessToken({
      sub: TEST_CITY_ADMIN_ID,
      role: 'CITY_ADMIN'
    });
    const sharedKey = 'concurrent-idempotent-key-888';

    // Dispatch 10 concurrent requests simultaneously
    const requests = Array.from({ length: 10 }).map(() =>
      request(app)
        .post('/api/v1/auth/admin/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', sharedKey)
        .send({
          email: 'concurrent.nurse@gmail.com',
          role: 'HOSPITAL_STAFF',
          hospitalId: TEST_HOSPITAL_AIIMS_ID
        })
    );

    const responses = await Promise.all(requests);

    // All requests must return HTTP 201 with identical payload
    for (const res of responses) {
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('concurrent.nurse@gmail.com');
    }
  });

  test('Concurrency: Parallel logins for the same user upsert cleanly without duplicate records', async () => {
    setCustomGoogleVerifier(async () => ({
      sub: 'google-sub-concurrent-user',
      email: 'concurrent.login@gmail.com',
      name: 'Concurrent User',
      picture: null
    }));

    // Dispatch 5 concurrent sign-in requests
    const loginRequests = Array.from({ length: 5 }).map(() =>
      request(app)
        .post('/api/v1/auth/google')
        .send({
          idToken: 'mock-concurrent-token',
          clientType: 'web'
        })
    );

    const responses = await Promise.all(loginRequests);

    for (const res of responses) {
      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('concurrent.login@gmail.com');
      expect(res.body.data.accessToken).toBeDefined();
    }
  });
});

