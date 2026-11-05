import request from 'supertest';
import { createApp } from '../../src/app.js';
import {
  setupTestDbMock,
  resetTestDb,
  testState,
  TEST_HOSPITAL_AIIMS_ID,
  createTestAccessToken
} from '../fixtures/test-helper.js';
import { setCustomGoogleVerifier, resetCustomGoogleVerifier } from '../../src/modules/auth/google-verifier.js';

describe('Google Authentication and Token Rotation Engine', () => {
  let app;

  beforeAll(() => {
    setupTestDbMock();
    app = createApp();
  });

  beforeEach(() => {
    resetTestDb();
    resetCustomGoogleVerifier();
  });

  describe('POST /api/v1/auth/google', () => {
    test('Successful login for new patient returns JWT pair and PATIENT role', async () => {
      setCustomGoogleVerifier(async (token, clientType) => ({
        sub: 'google-sub-patient-new-999',
        email: 'newpatient.bbsr@gmail.com',
        name: 'New Citizen Patient',
        picture: 'https://lh3.googleusercontent.com/avatar.jpg'
      }));

      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({
          idToken: 'mock-valid-google-token',
          clientType: 'web'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe('newpatient.bbsr@gmail.com');
      expect(res.body.data.user.role).toBe('PATIENT');
      expect(res.body.data.user.hospitalId).toBeNull();
      expect(res.headers['x-trace-id']).toBeDefined();
    });

    test('Rejects authentication if Google email is not verified (HTTP 401)', async () => {
      // Uses the built-in mock token unverified syntax
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({
          idToken: 'mock-token:sub-123:unverified@gmail.com:Unverified User:unverified',
          clientType: 'web'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    });

    test('Rejects non-Gmail Google accounts with HTTP 401 (GMAIL_REQUIRED)', async () => {
      setCustomGoogleVerifier(async () => ({
        sub: 'google-sub-yahoo-user',
        email: 'doctor.someone@yahoo.com',
        name: 'Yahoo Account Linked to Google',
        picture: null
      }));

      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({
          idToken: 'mock-token-non-gmail',
          clientType: 'web'
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('GMAIL_REQUIRED');
    });

    test('Pre-registered staff email automatically claims HOSPITAL_STAFF role and hospitalId', async () => {
      setCustomGoogleVerifier(async () => ({
        sub: 'google-sub-future-nurse',
        email: 'future.nurse@gmail.com',
        name: 'Staff Nurse',
        picture: null
      }));

      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({
          idToken: 'mock-token-nurse',
          clientType: 'web'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('HOSPITAL_STAFF');
      expect(res.body.data.user.hospitalId).toBe(TEST_HOSPITAL_AIIMS_ID);

      // Verify the pre-registration record was consumed from the table
      const remaining = testState.preregistered_staff.find(x => x.email === 'future.nurse@gmail.com');
      expect(remaining).toBeUndefined();
    });

    test('Configured SEED_ADMIN_EMAIL automatically claims CITY_ADMIN role', async () => {
      setCustomGoogleVerifier(async () => ({
        sub: 'google-sub-seed-admin',
        email: 'cityadmin.bhubaneswar@gmail.com',
        name: 'Municipal Health Director',
        picture: null
      }));

      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({
          idToken: 'mock-token-admin',
          clientType: 'web'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('CITY_ADMIN');
      expect(res.body.data.user.hospitalId).toBeNull();
    });

    test('Suspended user cannot sign in (HTTP 403)', async () => {
      testState.users.push({
        id: '99999999-9999-9999-9999-999999999999',
        google_sub: 'sub-suspended-user',
        email: 'suspended.user@gmail.com',
        name: 'Suspended Account',
        picture_url: null,
        role: 'PATIENT',
        hospital_id: null,
        status: 'SUSPENDED',
        last_login_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      setCustomGoogleVerifier(async () => ({
        sub: 'sub-suspended-user',
        email: 'suspended.user@gmail.com',
        name: 'Suspended Account',
        picture: null
      }));

      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ idToken: 'token-suspended', clientType: 'web' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED');
    });
  });

  describe('POST /api/v1/auth/refresh (Rotation & Reuse Detection)', () => {
    test('Valid refresh token generates new token pair and invalidates old token', async () => {
      // 1. Initial Google login to obtain tokens
      setCustomGoogleVerifier(async () => ({
        sub: 'sub-rotation-test',
        email: 'rotation.test@gmail.com',
        name: 'Rotation Tester',
        picture: null
      }));

      const loginRes = await request(app)
        .post('/api/v1/auth/google')
        .send({ idToken: 'token-rot', clientType: 'web' });

      const initialRefreshToken = loginRes.body.data.refreshToken;

      // 2. Rotate refresh token
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: initialRefreshToken });

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.data.accessToken).toBeDefined();
      expect(refreshRes.body.data.refreshToken).toBeDefined();
      expect(refreshRes.body.data.refreshToken).not.toBe(initialRefreshToken);
    });

    test('Distributed Systems Security: Reuse of an already-rotated token revokes entire token family', async () => {
      setCustomGoogleVerifier(async () => ({
        sub: 'sub-reuse-test',
        email: 'reuse.test@gmail.com',
        name: 'Reuse Tester',
        picture: null
      }));

      const loginRes = await request(app)
        .post('/api/v1/auth/google')
        .send({ idToken: 'token-reuse', clientType: 'web' });

      const initialToken = loginRes.body.data.refreshToken;

      // Legitimate client rotates token
      const firstRotation = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: initialToken });

      expect(firstRotation.status).toBe(200);
      const secondToken = firstRotation.body.data.refreshToken;

      // Malicious actor replays initialToken (REUSE DETECTED!)
      const replayAttempt = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: initialToken });

      expect(replayAttempt.status).toBe(401);
      expect(replayAttempt.body.error.code).toBe('REFRESH_TOKEN_REUSED');

      // Now verify that the legitimate client's secondToken has ALSO been revoked as part of the family
      const legitAttemptWithSecondToken = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: secondToken });

      expect(legitAttemptWithSecondToken.status).toBe(401);
      expect(legitAttemptWithSecondToken.body.error.code).toBe('REFRESH_TOKEN_REUSED');
    });

    test('Malformed or non-existent refresh token returns HTTP 401', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'completely-non-existent-refresh-token-xyz' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('GET /api/v1/auth/users/me', () => {
    test('Returns profile when authenticated with Bearer token', async () => {
      const token = createTestAccessToken({
        sub: testState.users[0].id,
        role: testState.users[0].role
      });

      const res = await request(app)
        .get('/api/v1/auth/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(testState.users[0].email);
      expect(res.body.data.role).toBe('CITY_ADMIN');
    });

    test('Rejects request without Authorization header (HTTP 401)', async () => {
      const res = await request(app).get('/api/v1/auth/users/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    test('Logs out user and revokes active token family', async () => {
      const token = createTestAccessToken({ sub: testState.users[0].id });

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});

