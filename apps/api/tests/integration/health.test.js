import request from 'supertest';
import { createApp } from '../../src/app.js';
import { setupTestDbMock } from '../fixtures/test-helper.js';

describe('Health and Readiness Endpoints', () => {
  let app;

  beforeAll(() => {
    setupTestDbMock();
    app = createApp();
  });

  test('GET /health returns liveness status and uptime', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('pass');
    expect(typeof res.body.data.uptimeSeconds).toBe('number');
  });

  test('GET /ready returns readiness status with database probe', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.postgres).toBe('up');
  });
});

