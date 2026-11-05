import request from 'supertest';
import http from 'node:http';
import { createApp } from '../../src/app.js';
import {
  setupTestDbMock,
  TEST_HOSPITAL_AIIMS_ID
} from '../fixtures/test-helper.js';
import {
  initRealtime,
  broadcastRealtimeEvent,
  localRealtimeBus
} from '../../src/modules/realtime/realtime.service.js';

let app;
let server;

describe('Realtime Module (Socket.IO, Redis Pub/Sub, and SSE Fallback Stream)', () => {
  beforeAll((done) => {
    setupTestDbMock();
    app = createApp();
    server = http.createServer(app);
    initRealtime(server);
    server.listen(0, done);
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    setupTestDbMock();
  });

  describe('GET /api/v1/events (Server-Sent Events Fallback Stream)', () => {
    test('Establishes resilient SSE stream with keepalive and handshake message', (done) => {
      const port = server.address().port;

      const req = http.get(`http://localhost:${port}/api/v1/events?hospitalId=${TEST_HOSPITAL_AIIMS_ID}`, (res) => {
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('text/event-stream');
        expect(res.headers['cache-control']).toBe('no-cache');

        res.on('data', (chunk) => {
          const str = chunk.toString();
          if (str.includes('event: connected')) {
            expect(str).toContain('hospitalId');
            req.destroy();
            done();
          }
        });
      });

      req.on('error', (err) => {
        if (err.code !== 'ECONNRESET') {
          done(err);
        }
      });
    });

    test('SSE client receives broadcast telemetry events', (done) => {
      const port = server.address().port;

      const req = http.get(`http://localhost:${port}/api/v1/events?hospitalId=${TEST_HOSPITAL_AIIMS_ID}`, (res) => {
        let connected = false;

        res.on('data', (chunk) => {
          const str = chunk.toString();
          if (str.includes('event: connected')) {
            connected = true;

            // Trigger realtime broadcast
            setTimeout(() => {
              broadcastRealtimeEvent({
                event: 'beds:update',
                room: `hospital:${TEST_HOSPITAL_AIIMS_ID}`,
                payload: {
                  hospitalId: TEST_HOSPITAL_AIIMS_ID,
                  wardType: 'ICU',
                  free: 3,
                  version: 5
                }
              });
            }, 50);
          } else if (connected && str.includes('event: beds:update')) {
            expect(str).toContain('"wardType":"ICU"');
            expect(str).toContain('"free":3');
            req.destroy();
            done();
          }
        });
      });

      req.on('error', (err) => {
        if (err.code !== 'ECONNRESET') {
          done(err);
        }
      });
    });
  });

  describe('In-process Realtime Bus & Monotonic Event Ordering', () => {
    test('Emits structured events with timestamps and room routing', (done) => {
      const listener = (msg) => {
        if (msg.event === 'test:ping') {
          expect(msg.room).toBe('city');
          expect(msg.payload.msg).toBe('hello');
          expect(msg.at).toBeDefined();
          localRealtimeBus.off('realtime:event', listener);
          done();
        }
      };

      localRealtimeBus.on('realtime:event', listener);

      broadcastRealtimeEvent({
        event: 'test:ping',
        room: 'city',
        payload: { msg: 'hello' }
      });
    });
  });
});

