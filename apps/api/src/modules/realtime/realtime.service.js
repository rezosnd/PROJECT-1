import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import EventEmitter from 'node:events';
import { redis, isRedisAvailable } from '../../infra/redis.js';
import { logger } from '../../infra/logger.js';
import { verifyAccessToken } from '../auth/jwt.js';
import { config } from '../../config/index.js';

class RealtimeEmitter extends EventEmitter {}
export const localRealtimeBus = new RealtimeEmitter();

let io = null;
let subClient = null;

const sseClients = new Set();

/**
 * Socket.IO only works on long-lived Node hosts (Railway/Render/Fly/local).
 * On Vercel serverless, clients should use SSE (/api/v1/events) + ETag bed polling.
 */
export function initRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || config.corsOriginsList.includes(origin) || config.NODE_ENV !== 'production') {
          return callback(null, true);
        }
        callback(new Error('Origin not allowed by CORS'));
      },
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  if (isRedisAvailable() && config.NODE_ENV !== 'test') {
    try {
      subClient = redis.duplicate();
      subClient.connect().then(() => {
        io.adapter(createAdapter(redis, subClient));
        logger.info('[Realtime] Socket.IO mounted with Redis Cluster Adapter');
      }).catch(err => {
        logger.warn({ err: err.message }, '[Realtime] Redis adapter failed; using in-memory bus');
      });
    } catch (err) {
      logger.warn({ err: err.message }, '[Realtime] Error configuring Redis adapter');
    }
  }

  io.use((socket, next) => {
    const rawToken = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    if (rawToken) {
      const token = rawToken.startsWith('Bearer ') ? rawToken.slice(7).trim() : rawToken.trim();
      try {
        socket.user = verifyAccessToken(token);
      } catch {
        /* public viewer */
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    socket.join('city');
    if (socket.user?.hospitalId) socket.join(`hospital:${socket.user.hospitalId}`);
    if (socket.user?.sub) socket.join(`user:${socket.user.sub}`);

    socket.on('join:hospital', (hospitalId) => {
      if (hospitalId) socket.join(`hospital:${hospitalId}`);
    });
    socket.on('leave:hospital', (hospitalId) => {
      if (hospitalId) socket.leave(`hospital:${hospitalId}`);
    });
  });

  return io;
}

export function getIO() {
  return io;
}

export async function broadcastRealtimeEvent({ event, room, payload }) {
  const message = {
    event,
    room,
    payload,
    at: new Date().toISOString()
  };

  if (io) {
    if (room) io.to(room).emit(event, payload);
    else io.emit(event, payload);
  }

  if (isRedisAvailable()) {
    try {
      await redis.publish('cityhealth:events', JSON.stringify(message));
      const hospitalId =
        payload?.hospitalId || (room?.startsWith('hospital:') ? room.split(':')[1] : null);
      if (hospitalId) {
        await redis.publish(`hospital:${hospitalId}:updates`, JSON.stringify(message));
      }
    } catch (err) {
      logger.warn({ err: err.message }, '[Realtime] Failed to publish on Redis');
    }
  }

  localRealtimeBus.emit('realtime:event', message);
  pushToSSEClients(message);

  if (['beds:update', 'equipment:status', 'equipment:register', 'alert:critical-equipment'].includes(event)) {
    import('../matching/matching.service.js').then((m) => m.matchingService.invalidateMatchingCache()).catch(() => {});
    import('../hospitals/hospitals.service.js').then((m) => m.hospitalsService.invalidateCache()).catch(() => {});
  }
}

function pushToSSEClients(message) {
  for (const client of sseClients) {
    try {
      if (client.hospitalId) {
        const matchesHospital =
          message.room === `hospital:${client.hospitalId}` ||
          message.payload?.hospitalId === client.hospitalId ||
          message.room === 'city';
        if (!matchesHospital) continue;
      }
      client.res.write(`event: ${message.event}\ndata: ${JSON.stringify(message.payload)}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

/**
 * SSE stream — works across Vercel instances when Redis is available
 * (each connection SUBSCRIBEs to hospital channel).
 * GET /api/v1/events?hospitalId=
 */
export async function handleSSE(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const hospitalId = req.query.hospitalId || null;
  const clientRecord = { res, hospitalId };
  sseClients.add(clientRecord);

  res.write(
    `event: connected\ndata: ${JSON.stringify({
      status: 'connected',
      hospitalId,
      mode: isRedisAvailable() ? 'redis+sse' : 'local+sse',
      timestamp: new Date().toISOString(),
    })}\n\n`
  );

  const onLocal = (message) => {
    try {
      if (hospitalId) {
        const matches =
          message.room === `hospital:${hospitalId}` ||
          message.payload?.hospitalId === hospitalId ||
          message.room === 'city';
        if (!matches) return;
      }
      res.write(`event: ${message.event}\ndata: ${JSON.stringify(message.payload)}\n\n`);
    } catch {
      /* closed */
    }
  };
  localRealtimeBus.on('realtime:event', onLocal);

  let redisSub = null;
  if (isRedisAvailable()) {
    try {
      redisSub = redis.duplicate();
      await redisSub.connect();
      const channels = hospitalId
        ? [`hospital:${hospitalId}:updates`, 'cityhealth:events']
        : ['cityhealth:events'];
      await redisSub.subscribe(...channels);
      redisSub.on('message', (_channel, raw) => {
        try {
          const message = JSON.parse(raw);
          if (hospitalId) {
            const matches =
              message.room === `hospital:${hospitalId}` ||
              message.payload?.hospitalId === hospitalId ||
              message.room === 'city' ||
              _channel === `hospital:${hospitalId}:updates`;
            if (!matches) return;
          }
          res.write(`event: ${message.event}\ndata: ${JSON.stringify(message.payload)}\n\n`);
        } catch {
          /* ignore bad payload */
        }
      });
    } catch (err) {
      logger.warn({ err: err.message }, '[Realtime] SSE Redis subscribe failed; local bus only');
    }
  }

  const heartbeatTimer = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(heartbeatTimer);
    }
  }, 10000);

  const cleanup = async () => {
    clearInterval(heartbeatTimer);
    sseClients.delete(clientRecord);
    localRealtimeBus.off('realtime:event', onLocal);
    if (redisSub) {
      try {
        await redisSub.quit();
      } catch {
        try {
          redisSub.disconnect();
        } catch {
          /* ignore */
        }
      }
    }
  };

  req.on('close', () => {
    void cleanup();
  });
}
