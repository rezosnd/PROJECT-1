import request from 'supertest';
import { createApp } from '../../src/app.js';
import {
  setupTestDbMock,
  createTestAccessToken,
  TEST_CITY_ADMIN_ID,
  TEST_PATIENT_ID,
  TEST_CONDITION_STROKE_ID
} from '../fixtures/test-helper.js';

describe('Conditions Module (Taxonomy, Autocomplete, & City-Admin Governance)', () => {
  let app;
  let cityAdminToken;
  let patientToken;

  beforeEach(() => {
    setupTestDbMock();
    app = createApp();
    cityAdminToken = createTestAccessToken({ sub: TEST_CITY_ADMIN_ID, role: 'CITY_ADMIN' });
    patientToken = createTestAccessToken({ sub: TEST_PATIENT_ID, role: 'PATIENT' });
  });

  describe('GET /api/v1/conditions', () => {
    it('returns list of clinical conditions with nested requirements', async () => {
      const res = await request(app)
        .get('/api/v1/conditions')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const stroke = res.body.data.find(c => c.code === 'STROKE');
      expect(stroke).toBeDefined();
      expect(stroke.requirements.length).toBeGreaterThan(0);
    });

    it('supports autocomplete search matching condition aliases (e.g. "Brain Stroke")', async () => {
      const res = await request(app)
        .get('/api/v1/conditions?q=Brain%20Stroke')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].code).toBe('STROKE');
    });
  });

  describe('GET /api/v1/conditions/:id', () => {
    it('returns condition details by UUID', async () => {
      const res = await request(app)
        .get(`/api/v1/conditions/${TEST_CONDITION_STROKE_ID}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(TEST_CONDITION_STROKE_ID);
      expect(res.body.data.code).toBe('STROKE');
    });

    it('returns condition details by condition code', async () => {
      const res = await request(app)
        .get('/api/v1/conditions/STROKE')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('STROKE');
    });

    it('returns 404 for unknown condition', async () => {
      const res = await request(app)
        .get('/api/v1/conditions/NON_EXISTENT_DISEASE')
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONDITION_NOT_FOUND');
    });
  });

  describe('CITY_ADMIN Capability Governance', () => {
    it('CITY_ADMIN can register a new clinical condition with requirements', async () => {
      const newConditionPayload = {
        code: 'ACUTE_ASTHMA_CRITICAL',
        name: 'Critical Status Asthmaticus',
        aliases: ['Asthma Attack', 'Bronchospasm Crisis'],
        icd10: 'J46',
        category: 'Respiratory',
        severityDefault: 'CRITICAL',
        requirements: [
          { kind: 'BED', value: 'HDU', qty: 1, mandatory: true, preferenceOrder: 1 },
          { kind: 'EQUIPMENT', value: 'VENTILATOR', qty: 1, mandatory: false, preferenceOrder: 1 }
        ]
      };

      const res = await request(app)
        .post('/api/v1/conditions')
        .set('Authorization', `Bearer ${cityAdminToken}`)
        .send(newConditionPayload)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('ACUTE_ASTHMA_CRITICAL');
      expect(res.body.data.requirements.length).toBe(2);
    });

    it('PATIENT role receives HTTP 403 Forbidden when trying to create a condition', async () => {
      const res = await request(app)
        .post('/api/v1/conditions')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          code: 'UNAUTHORIZED_CONDITION',
          name: 'Fake Condition',
          category: 'Test',
          severityDefault: 'NORMAL'
        })
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('CITY_ADMIN can update an existing condition and its requirements', async () => {
      const res = await request(app)
        .patch(`/api/v1/conditions/${TEST_CONDITION_STROKE_ID}`)
        .set('Authorization', `Bearer ${cityAdminToken}`)
        .send({
          name: 'Acute Stroke & Thrombolysis Protocol',
          severityDefault: 'CRITICAL'
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Acute Stroke & Thrombolysis Protocol');
    });

    it('CITY_ADMIN can delete a condition', async () => {
      const res = await request(app)
        .delete(`/api/v1/conditions/${TEST_CONDITION_STROKE_ID}`)
        .set('Authorization', `Bearer ${cityAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.deleted).toBe(true);
    });
  });
});

