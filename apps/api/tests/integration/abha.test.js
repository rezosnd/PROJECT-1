import request from 'supertest';
import { createApp } from '../../src/app.js';
import {
  setupTestDbMock,
  resetTestDb,
  testState,
  createTestAccessToken,
  TEST_PATIENT_ID,
  TEST_STAFF_ID,
  TEST_CITY_ADMIN_ID
} from '../fixtures/test-helper.js';
import { getAbdmClient } from '../../src/modules/abha/abdmClient.js';
import { decryptAbhaNumber, hashAbhaNumber } from '../../src/modules/abha/abha.crypto.js';

describe('ABHA Module (ABDM Milestone 1: Create, Link, Verify, Unlink)', () => {
  let app;
  let patientToken;
  const abdmClient = getAbdmClient();

  beforeAll(() => {
    setupTestDbMock();
    app = createApp();
  });

  beforeEach(() => {
    resetTestDb();
    testState.abha_consents = [];
    testState.abha_links = [];
    testState.audit_log = [];
    abdmClient.setSimulateDown(false);
    patientToken = createTestAccessToken({ sub: TEST_PATIENT_ID, role: 'PATIENT' });
  });

  describe('Strict Consent Governance', () => {
    test('Operation is rejected with 400 CONSENT_REQUIRED if consent not granted prior to enrollment', async () => {
      const res = await request(app)
        .post('/api/v1/abha/create/otp')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ aadhaar: '123456789012' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CONSENT_REQUIRED');
    });

    test('Patient can grant consent and action is recorded in audit_log', async () => {
      const res = await request(app)
        .post('/api/v1/abha/consent')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ purpose: 'Health insurance linkage and emergency bed reservations' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.purpose).toBe('Health insurance linkage and emergency bed reservations');
      expect(res.body.data.badge).toBe('Sandbox / Mock');

      // Verify recorded in database state
      expect(testState.abha_consents.length).toBe(1);
      expect(testState.abha_consents[0].user_id).toBe(TEST_PATIENT_ID);

      // Verify immutable audit log
      const auditEntry = testState.audit_log.find(a => a.action === 'ABHA_CONSENT_GRANTED');
      expect(auditEntry).toBeDefined();
      expect(auditEntry.actor_id).toBe(TEST_PATIENT_ID);
    });

    test('Patient can revoke consent, blocking future ABDM operations', async () => {
      // 1. Grant consent first
      await request(app)
        .post('/api/v1/abha/consent')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ purpose: 'Initial consent' });

      expect(testState.abha_consents[0].revoked_at).toBeNull();

      // 2. Revoke consent
      const res = await request(app)
        .delete('/api/v1/abha/consent')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.revoked).toBe(true);

      const auditRevoke = testState.audit_log.find(a => a.action === 'ABHA_CONSENT_REVOKED');
      expect(auditRevoke).toBeDefined();

      // 3. Subsequent create OTP attempt must now fail
      const otpRes = await request(app)
        .post('/api/v1/abha/create/otp')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ aadhaar: '123456789012' });

      expect(otpRes.status).toBe(400);
      expect(otpRes.body.error.code).toBe('CONSENT_REQUIRED');
    });
  });

  describe('ABHA Enrollment & Creation Lifecycle (Aadhaar -> OTP -> Address -> Link)', () => {
    beforeEach(async () => {
      // Pre-grant consent for enrollment lifecycle tests
      await request(app)
        .post('/api/v1/abha/consent')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ purpose: 'Enrollment test' });
    });

    test('Full creation flow: Aadhaar OTP -> Verify -> Suggestions -> Create Address', async () => {
      const rawAadhaar = '999988887777';

      // 1. Request OTP via Aadhaar
      const otpRes = await request(app)
        .post('/api/v1/abha/create/otp')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ aadhaar: rawAadhaar });

      expect(otpRes.status).toBe(200);
      expect(otpRes.body.data.txnId).toBeDefined();
      expect(otpRes.body.data.badge).toBe('Sandbox / Mock');
      const txnId = otpRes.body.data.txnId;

      // Privacy Invariant: Zero Aadhaar persistence in DB or audit logs
      const auditOtpReq = testState.audit_log.find(a => a.action === 'ABHA_CREATE_OTP_REQUESTED');
      expect(auditOtpReq).toBeDefined();
      expect(JSON.stringify(auditOtpReq)).not.toContain(rawAadhaar);
      expect(JSON.stringify(testState.abha_consents)).not.toContain(rawAadhaar);

      // 2. Verify with wrong OTP fails (422 INVALID_OTP)
      const wrongOtpRes = await request(app)
        .post('/api/v1/abha/create/verify')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ txnId, otp: '000000' });

      expect(wrongOtpRes.status).toBe(422);
      expect(wrongOtpRes.body.error.code).toBe('INVALID_OTP');

      // 3. Verify with correct mock OTP 123456
      const validVerifyRes = await request(app)
        .post('/api/v1/abha/create/verify')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ txnId, otp: '123456' });

      expect(validVerifyRes.status).toBe(200);
      expect(validVerifyRes.body.data.verified).toBe(true);

      // 4. Retrieve address suggestions
      const suggRes = await request(app)
        .get(`/api/v1/abha/create/address-suggestions?txnId=${txnId}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(suggRes.status).toBe(200);
      expect(Array.isArray(suggRes.body.data.suggestions)).toBe(true);
      expect(suggRes.body.data.suggestions.length).toBeGreaterThan(0);

      const chosenAddress = suggRes.body.data.suggestions[0];

      // 5. Confirm address and complete enrollment
      const createRes = await request(app)
        .post('/api/v1/abha/create/address')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ txnId, abhaAddress: chosenAddress });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.maskedNumber).toBe('XX-XXXX-XXXX-9012');
      expect(createRes.body.data.abhaAddress).toBe(chosenAddress);
      expect(createRes.body.data.name).toBe('Citizen Patient');
      expect(createRes.body.data.status).toBe('LINKED');
      expect(createRes.body.data.badge).toBe('Sandbox / Mock');

      // Cryptographic verification: DB stores AES-256-GCM BYTEA & SHA-256 hash, NOT plain text
      const storedLink = testState.abha_links.find(l => l.user_id === TEST_PATIENT_ID);
      expect(storedLink).toBeDefined();
      expect(Buffer.isBuffer(storedLink.abha_number_enc)).toBe(true);
      expect(decryptAbhaNumber(storedLink.abha_number_enc)).toBe('14-1234-5678-9012');
      expect(storedLink.abha_number_hash).toBe(hashAbhaNumber('14-1234-5678-9012'));

      // 6. GET /me returns identity profile
      const meRes = await request(app)
        .get('/api/v1/abha/me')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.maskedNumber).toBe('XX-XXXX-XXXX-9012');
      expect(meRes.body.data.abhaAddress).toBe(chosenAddress);
    });
  });

  describe('Existing ABHA Linkage Flow (Init -> OTP -> Verify)', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/abha/consent')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ purpose: 'Link existing ABHA' });
    });

    test('Patient can link an existing ABHA with OTP verification', async () => {
      // 1. Initiate link
      const initRes = await request(app)
        .post('/api/v1/abha/link/init')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ abhaNumberOrAddress: 'patient@sbx' });

      expect(initRes.status).toBe(200);
      expect(initRes.body.data.txnId).toBeDefined();
      const txnId = initRes.body.data.txnId;

      // 2. Verify with invalid OTP -> 422
      const invalidRes = await request(app)
        .post('/api/v1/abha/link/verify')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ txnId, otp: '654321' });

      expect(invalidRes.status).toBe(422);
      expect(invalidRes.body.error.code).toBe('INVALID_OTP');

      // 3. Verify with valid OTP 123456
      const validRes = await request(app)
        .post('/api/v1/abha/link/verify')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ txnId, otp: '123456' });

      expect(validRes.status).toBe(200);
      expect(validRes.body.data.status).toBe('LINKED');
      expect(validRes.body.data.maskedNumber).toBe('XX-XXXX-XXXX-9012');

      const auditLink = testState.audit_log.find(a => a.action === 'ABHA_LINKED');
      expect(auditLink).toBeDefined();
    });

    test('Uniqueness Invariant: Reject duplicate linkage if ABHA is already bound to another user (409)', async () => {
      // Link ABHA to Patient 1
      const initRes = await request(app)
        .post('/api/v1/abha/link/init')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ abhaNumberOrAddress: 'patient@sbx' });

      await request(app)
        .post('/api/v1/abha/link/verify')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ txnId: initRes.body.data.txnId, otp: '123456' });

      // Patient 2 attempts to link the same ABHA
      const patient2Id = '77777777-7777-4777-a777-777777777777';
      const patient2Token = createTestAccessToken({ sub: patient2Id, role: 'PATIENT' });

      await request(app)
        .post('/api/v1/abha/consent')
        .set('Authorization', `Bearer ${patient2Token}`)
        .send({ purpose: 'Patient 2 consent' });

      const p2Init = await request(app)
        .post('/api/v1/abha/link/init')
        .set('Authorization', `Bearer ${patient2Token}`)
        .send({ abhaNumberOrAddress: 'patient@sbx' });

      const duplicateRes = await request(app)
        .post('/api/v1/abha/link/verify')
        .set('Authorization', `Bearer ${patient2Token}`)
        .send({ txnId: p2Init.body.data.txnId, otp: '123456' });

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.error.code).toBe('ABHA_ALREADY_LINKED');
    });
  });

  describe('Unlink and Data Deletion Governance', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/abha/consent')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ purpose: 'Unlink test' });

      const init = await request(app)
        .post('/api/v1/abha/link/init')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ abhaNumberOrAddress: 'patient@sbx' });

      await request(app)
        .post('/api/v1/abha/link/verify')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ txnId: init.body.data.txnId, otp: '123456' });
    });

    test('Patient can unlink ABHA: deletes stored records and writes audit log', async () => {
      expect(testState.abha_links.length).toBe(1);

      const delRes = await request(app)
        .delete('/api/v1/abha/me')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.data.unlinked).toBe(true);

      // Verify records purged from storage
      expect(testState.abha_links.find(l => l.user_id === TEST_PATIENT_ID)).toBeUndefined();

      // Verify audit trail
      const auditUnlink = testState.audit_log.find(a => a.action === 'ABHA_UNLINKED');
      expect(auditUnlink).toBeDefined();

      // Subsequent GET /me must return 404
      const meRes = await request(app)
        .get('/api/v1/abha/me')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(meRes.status).toBe(404);
      expect(meRes.body.error.code).toBe('ABHA_NOT_FOUND');
    });
  });

  describe('Security, Role-Based Access Control, & Rate Limiting', () => {
    test('Hospital Staff receives HTTP 403 Forbidden on ABHA endpoints', async () => {
      const staffToken = createTestAccessToken({ sub: TEST_STAFF_ID, role: 'HOSPITAL_STAFF' });
      const res = await request(app)
        .post('/api/v1/abha/consent')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ purpose: 'Unauthorized staff test' });

      expect(res.status).toBe(403);
    });

    test('City Admin receives HTTP 403 Forbidden on ABHA endpoints', async () => {
      const adminToken = createTestAccessToken({ sub: TEST_CITY_ADMIN_ID, role: 'CITY_ADMIN' });
      const res = await request(app)
        .post('/api/v1/abha/consent')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ purpose: 'Unauthorized admin test' });

      expect(res.status).toBe(403);
    });

    test('Unauthenticated request returns HTTP 401 Unauthorized', async () => {
      const res = await request(app)
        .get('/api/v1/abha/me');

      expect(res.status).toBe(401);
    });

    test('Rate Limiter: Rejects more than 5 requests per minute with 429 RATE_LIMIT_EXCEEDED', async () => {
      // Send 5 permitted requests
      for (let i = 0; i < 5; i++) {
        await request(app)
          .get('/api/v1/abha/me')
          .set('Authorization', `Bearer ${patientToken}`)
          .set('x-test-rate-limit', 'true');
      }

      // 6th request triggers rate limit
      const rateLimitedRes = await request(app)
        .get('/api/v1/abha/me')
        .set('Authorization', `Bearer ${patientToken}`)
        .set('x-test-rate-limit', 'true');

      expect(rateLimitedRes.status).toBe(429);
      expect(rateLimitedRes.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('ABDM National Gateway Partition & Down Simulation', () => {
    test('When ABDM Gateway is down, returns 503 ABDM_UNAVAILABLE while core API remains healthy', async () => {
      await request(app)
        .post('/api/v1/abha/consent')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ purpose: 'Gateway test' });

      // Simulate upstream gateway network partition
      abdmClient.setSimulateDown(true);

      const downRes = await request(app)
        .post('/api/v1/abha/create/otp')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ aadhaar: '123456789012' });

      expect(downRes.status).toBe(503);
      expect(downRes.body.error.code).toBe('ABDM_UNAVAILABLE');

      // Crucial Distributed Systems Guarantee: Core LifeLink endpoints remain fully functional
      const healthRes = await request(app).get('/health');
      expect(healthRes.status).toBe(200);

      const hospitalsRes = await request(app).get('/api/v1/hospitals');
      expect(hospitalsRes.status).toBe(200);
    });
  });
});
