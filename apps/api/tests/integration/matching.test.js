import request from 'supertest';
import { createApp } from '../../src/app.js';
import { matchingService } from '../../src/modules/matching/matching.service.js';
import {
  setupTestDbMock,
  createTestAccessToken,
  TEST_STAFF_ID,
  TEST_HOSPITAL_AIIMS_ID,
  TEST_EQUIPMENT_CT_AIIMS,
  TEST_CONDITION_STROKE_ID
} from '../fixtures/test-helper.js';

describe('Condition-Based Matching Module (Multi-Criteria Engine & Hard Filters)', () => {
  let app;

  beforeEach(() => {
    setupTestDbMock();
    app = createApp();
  });

  describe('POST /api/v1/match', () => {
    it('ranks eligible hospitals and attaches mandatory emergency disclaimer', async () => {
      const payload = {
        conditionId: TEST_CONDITION_STROKE_ID,
        lat: 20.2961,
        lng: 85.8245,
        radiusKm: 25,
        severity: 'CRITICAL',
        limit: 5
      };

      const res = await request(app)
        .post('/api/v1/match')
        .send(payload)
        .expect(200);

      expect(res.body.success).toBe(true);
      const data = res.body.data;

      // Mandatory medical disclaimer verification
      expect(data.disclaimer).toBe('Not a medical device; In an emergency call 112');
      expect(data.condition.code).toBe('STROKE');
      expect(Array.isArray(data.matches)).toBe(true);
      expect(Array.isArray(data.excluded)).toBe(true);

      // Verify top match structure
      if (data.matches.length > 0) {
        const topMatch = data.matches[0];
        expect(topMatch.hospitalName).toBeDefined();
        expect(topMatch.totalScore).toBeGreaterThanOrEqual(0);
        expect(topMatch.totalScore).toBeLessThanOrEqual(1.0);
        expect(topMatch.breakdown).toBeDefined();
        expect(topMatch.explanation).toBeDefined();
        expect(topMatch.allocatedWard).toBe('ICU');
        expect(topMatch.freeBedsNow).toBeGreaterThan(0);
        // Integrated Poisson predictive forecast
        expect(topMatch.forecast).toBeDefined();
        expect(topMatch.forecast['1h']).toBeDefined();
        expect(topMatch.forecast['3h']).toBeDefined();
        expect(topMatch.forecast['6h']).toBeDefined();
      }
    });

    it('matches condition by textual query autocomplete (q="Brain Stroke")', async () => {
      const payload = {
        q: 'Brain Stroke',
        lat: 20.2961,
        lng: 85.8245,
        radiusKm: 25
      };

      const res = await request(app)
        .post('/api/v1/match')
        .send(payload)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.condition.code).toBe('STROKE');
    });

    it('returns structured exclusion reasons when a hospital fails hard filters', async () => {
      const payload = {
        conditionId: TEST_CONDITION_STROKE_ID,
        lat: 20.2961,
        lng: 85.8245,
        radiusKm: 25
      };

      const res = await request(app)
        .post('/api/v1/match')
        .send(payload)
        .expect(200);

      expect(res.body.success).toBe(true);
      const data = res.body.data;

      // Check excluded array
      expect(Array.isArray(data.excluded)).toBe(true);
      for (const exc of data.excluded) {
        expect(exc.hospitalId).toBeDefined();
        expect(exc.reasons.length).toBeGreaterThan(0);
      }
    });

    it('revalidates or purges matching cache upon invalidation', async () => {
      const payload = {
        conditionId: TEST_CONDITION_STROKE_ID,
        lat: 20.2961,
        lng: 85.8245,
        radiusKm: 25
      };

      // First query caches response
      const res1 = await request(app)
        .post('/api/v1/match')
        .send(payload)
        .expect(200);

      expect(res1.body.success).toBe(true);

      // Invalidate matching caches
      await matchingService.invalidateMatchingCache();

      // Subsequent query recomputes cleanly
      const res2 = await request(app)
        .post('/api/v1/match')
        .send(payload)
        .expect(200);

      expect(res2.body.success).toBe(true);
      expect(res2.body.data.condition.code).toBe('STROKE');
    });

    it('changing equipment status changes the match within 2 seconds', async () => {
      const staffToken = createTestAccessToken({ sub: TEST_STAFF_ID, role: 'HOSPITAL_STAFF', hospitalId: TEST_HOSPITAL_AIIMS_ID });

      const payload = {
        conditionId: TEST_CONDITION_STROKE_ID,
        lat: 20.2961,
        lng: 85.8245,
        radiusKm: 25
      };

      // 1. Initial match query: AIIMS has working CT, so it matches
      const resInitial = await request(app)
        .post('/api/v1/match')
        .send(payload)
        .expect(200);

      const aiimsInitial = resInitial.body.data.matches.find(m => m.hospitalId === TEST_HOSPITAL_AIIMS_ID);
      expect(aiimsInitial).toBeDefined();

      // 2. Staff updates CT status to FAULTY
      const updateRes = await request(app)
        .patch(`/api/v1/equipment/${TEST_EQUIPMENT_CT_AIIMS}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          status: 'FAULTY',
          reason: 'X-ray tube calibration breakdown'
        })
        .expect(200);

      expect(updateRes.body.success).toBe(true);

      // 3. Match query executed immediately (< 2 seconds) now excludes AIIMS because mandatory CT is unavailable
      const resAfterStatusChange = await request(app)
        .post('/api/v1/match')
        .send(payload)
        .expect(200);

      const aiimsAfter = resAfterStatusChange.body.data.matches.find(m => m.hospitalId === TEST_HOSPITAL_AIIMS_ID);
      expect(aiimsAfter).toBeUndefined();

      const aiimsExcluded = resAfterStatusChange.body.data.excluded.find(e => e.hospitalId === TEST_HOSPITAL_AIIMS_ID);
      expect(aiimsExcluded).toBeDefined();
      expect(aiimsExcluded.reasons.some(r => r.includes('CT'))).toBe(true);
    });

    it('rejects payload missing both conditionId and query q with HTTP 422', async () => {
      const res = await request(app)
        .post('/api/v1/match')
        .send({
          lat: 20.2961,
          lng: 85.8245
        })
        .expect(422);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});

