import request from 'supertest';
import { createApp } from '../../src/app.js';
import {
  setupTestDbMock,
  TEST_HOSPITAL_AIIMS_ID
} from '../fixtures/test-helper.js';

describe('Forecast Module (Poisson Queuing & Equipment Telemetry)', () => {
  let app;

  beforeEach(() => {
    setupTestDbMock();
    app = createApp();
  });

  describe('GET /api/v1/hospitals/:id/forecast', () => {
    it('returns probabilistic availability forecast for 1h, 3h, and 6h horizons', async () => {
      const res = await request(app)
        .get(`/api/v1/hospitals/${TEST_HOSPITAL_AIIMS_ID}/forecast?wardType=ICU&horizons=1,3,6`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const data = res.body.data;

      expect(data.hospitalId).toBe(TEST_HOSPITAL_AIIMS_ID);
      expect(data.wardType).toBe('ICU');
      expect(data.currentFree).toBeDefined();
      expect(data.capacity).toBeGreaterThan(0);
      expect(['HIGH', 'MEDIUM', 'LOW']).toContain(data.confidence);

      // Verify horizon predictions
      const h1 = data.horizons['1h'];
      const h3 = data.horizons['3h'];
      const h6 = data.horizons['6h'];

      expect(h1).toBeDefined();
      expect(h1.horizonHours).toBe(1);
      expect(h1.expectedFree).toBeGreaterThanOrEqual(0);
      expect(h1.p10).toBeLessThanOrEqual(h1.p90);
      expect(h1.probabilityAtLeastOneFree).toBeGreaterThanOrEqual(0);
      expect(h1.probabilityAtLeastOneFree).toBeLessThanOrEqual(1.0);

      expect(h3).toBeDefined();
      expect(h6).toBeDefined();
    });

    it('returns HTTP 404 for non-existent ward', async () => {
      const res = await request(app)
        .get(`/api/v1/hospitals/${TEST_HOSPITAL_AIIMS_ID}/forecast?wardType=INVALID_WARD`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('WARD_NOT_FOUND');
    });
  });

  describe('GET /api/v1/hospitals/:id/equipment-forecast', () => {
    it('returns equipment return projections and telemetry durations', async () => {
      const res = await request(app)
        .get(`/api/v1/hospitals/${TEST_HOSPITAL_AIIMS_ID}/equipment-forecast?type=VENTILATOR`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const data = res.body.data;

      expect(data.hospitalId).toBe(TEST_HOSPITAL_AIIMS_ID);
      expect(data.equipmentType).toBe('VENTILATOR');
      expect(data.averageUsageDurationMinutes).toBeGreaterThan(0);
      expect(Array.isArray(data.items)).toBe(true);

      for (const item of data.items) {
        expect(item.type).toBe('VENTILATOR');
        expect(item.status).toBeDefined();
        expect(item.estimatedAvailableInMinutes).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('POST /api/v1/forecast/batch', () => {
    it('returns batch forecasts for multiple hospital wards', async () => {
      const payload = {
        requests: [
          { hospitalId: TEST_HOSPITAL_AIIMS_ID, wardType: 'ICU' },
          { hospitalId: TEST_HOSPITAL_AIIMS_ID, wardType: 'GENERAL' }
        ],
        horizons: [1, 3]
      };

      const res = await request(app)
        .post('/api/v1/forecast/batch')
        .send(payload)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].horizons['1h']).toBeDefined();
      expect(res.body.data[0].horizons['3h']).toBeDefined();
    });
  });
});

