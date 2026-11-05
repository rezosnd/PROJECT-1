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

// Distributed Systems Note: Active SSE Client Pool.
// When mobile clients operate behind aggressive HTTP/2 firewalls or cellular proxies
// that drop WebSocket upgrade requests, Server-Sent Events (SSE) provide a resilient unidirectional fallback.
const sseClients = new Set();

/**
 * Initialize Socket.IO with Redis Adapter (for cluster-wide pub/sub)
 * and in-memory fallback when Redis is offline.
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

  // Attach Redis adapter if Redis is reachable
  if (isRedisAvailable() && config.NODE_ENV !== 'test') {
    try {
      subClient = redis.duplicate();
      subClient.connect().then(() => {
        io.adapter(createAdapter(redis, subClient));
        logger.info('[Realtime] Socket.IO mounted with Redis Cluster Adapter');
      }).catch(err => {
        logger.warn({ err: err.message }, '[Realtime] Redis adapter failed to attach; using in-memory bus');
      });
    } catch (err) {
      logger.warn({ err: err.message }, '[Realtime] Error configuring Redis adapter');
    }
  }

  // Socket.IO Handshake Authentication (JWT optional for public rooms, required for staff)
  io.use((socket, next) => {
    const rawToken = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    if (rawToken) {
      const token = rawToken.startsWith('Bearer ') ? rawToken.slice(7).trim() : rawToken.trim();
      try {
        const decoded = verifyAccessToken(token);
        socket.user = decoded;
      } catch {
        logger.debug('[Realtime] Socket connected with unverified/expired token; treating as public viewer');
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    logger.debug({ socketId: socket.id, user: socket.user?.sub }, '[Realtime] Client connected');

    // Every client automatically joins the global city room for city-level bed summary broadcasts
    socket.join('city');

    // If client is authenticated hospital staff, join their hospital room automatically
    if (socket.user?.hospitalId) {
      socket.join(`hospital:${socket.user.hospitalId}`);
    }

    // If authenticated patient, join private user room for reservation notifications
    if (socket.user?.sub) {
      socket.join(`user:${socket.user.sub}`);
    }

    // Allow clients to subscribe to specific hospital rooms
    socket.on('join:hospital', (hospitalId) => {
      if (hospitalId) {
        socket.join(`hospital:${hospitalId}`);
        logger.debug({ socketId: socket.id, hospitalId }, '[Realtime] Client joined hospital room');
      }
    });

    socket.on('leave:hospital', (hospitalId) => {
      if (hospitalId) {
        socket.leave(`hospital:${hospitalId}`);
      }
    });

    socket.on('disconnect', () => {
      logger.debug({ socketId: socket.id }, '[Realtime] Client disconnected');
    });
  });

  return io;
}

export function getIO() {
  return io;
}

/**
 * Distributed Systems Note: Multi-node Event Broadcasting with Monotonic Versioning.
 * After a transaction commits in PostgreSQL, events are broadcast via Redis pub/sub and local Socket.IO.
 * The payload includes a version integer. Clients maintain a lastKnownVersion per entity
 * and ignore any out-of-order event where event.version <= lastKnownVersion.
 */
export async function broadcastRealtimeEvent({ event, room, payload }) {
  const message = {
    event,
    room,
    payload,
    at: new Date().toISOString()
  };

  // 1. Emit to local Socket.IO server if initialized
  if (io) {
    if (room) {
      io.to(room).emit(event, payload);
    } else {
      io.emit(event, payload);
    }
  }

  // 2. Publish on Redis channel if available
  if (isRedisAvailable()) {
    try {
      await redis.publish('cityhealth:events', JSON.stringify(message));

      const hospitalId = payload?.hospitalId || (room?.startsWith('hospital:') ? room.split(':')[1] : null);
      if (hospitalId) {
        await redis.publish(`hospital:${hospitalId}:updates`, JSON.stringify(message));
      }
    } catch (err) {
      logger.warn({ err: err.message }, '[Realtime] Failed to publish event on Redis channel');
    }
  }

  // 3. Emit on in-process bus for local SSE clients and background test monitors
  localRealtimeBus.emit('realtime:event', message);

  // 4. Push to active SSE streams
  pushToSSEClients(message);

  // 5. Invalidate matching and hospital search caches upon inventory/equipment mutation
  if (['beds:update', 'equipment:status', 'equipment:register', 'alert:critical-equipment'].includes(event)) {
    import('../matching/matching.service.js').then(m => m.matchingService.invalidateMatchingCache()).catch(() => {});
    import('../hospitals/hospitals.service.js').then(m => m.hospitalsService.invalidateCache()).catch(() => {});
  }
}

function pushToSSEClients(message) {
  for (const client of sseClients) {
    try {
      // Check if client is filtering by hospitalId
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
 * Server-Sent Events (SSE) Stream Controller
 * GET /api/v1/events?hospitalId=&token=
 */
export function handleSSE(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  const hospitalId = req.query.hospitalId || null;
  const clientRecord = { res, hospitalId };
  sseClients.add(clientRecord);

  // Initial connection handshake event
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', hospitalId, timestamp: new Date().toISOString() })}\n\n`);

  // 15-second heartbeat to keep connection alive through aggressive reverse proxies
  const heartbeatTimer = setInterval(() => {
    res.write(': ping\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeatTimer);
    sseClients.delete(clientRecord);
  });
}

