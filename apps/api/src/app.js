import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config/index.js';
import { traceMiddleware } from './middleware/trace.js';
import { requestLoggerMiddleware } from './middleware/request-logger.js';
import { rateLimiter } from './middleware/rate-limiter.js';
import { notFoundHandler, errorHandler } from './middleware/error-handler.js';
import { checkDbHealth } from './infra/db.js';
import { checkRedisHealth, isRedisAvailable } from './infra/redis.js';

import authRoutes from './modules/auth/auth.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import hospitalsRoutes from './modules/hospitals/hospitals.routes.js';
import { bedRequestsRouter, citySummaryRouter } from './modules/beds/beds.routes.js';
import { equipmentRouter } from './modules/equipment/equipment.routes.js';
import realtimeRoutes from './modules/realtime/realtime.routes.js';
import conditionsRoutes from './modules/conditions/conditions.routes.js';
import matchingRoutes from './modules/matching/matching.routes.js';
import forecastRoutes from './modules/forecast/forecast.routes.js';
import abhaRoutes from './modules/abha/abha.routes.js';

export function createApp() {
  const app = express();

  // 1. Core security headers
  app.use(helmet());

  // 2. Cross-Origin Resource Sharing (CORS) with allow-list
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (config.corsOriginsList.includes(origin) || config.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      callback(new Error(`Origin ${origin} not permitted by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'x-trace-id', 'x-idempotency-key']
  }));

  // 3. Request body parsers (JSON only, up to 1mb)
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));

  // 4. Trace & Logging middlewares
  app.use(traceMiddleware);
  app.use(requestLoggerMiddleware);

  // 5. Global rate limiter (100 req/min per IP)
  app.use(rateLimiter({
    max: config.RATE_LIMIT_GLOBAL_MAX,
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    prefix: 'rl:global'
  }));

  // 6. Probes: Health and Readiness (Checks Postgres & Redis)
  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      data: {
        status: 'pass',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
      }
    });
  });

  app.get('/ready', async (req, res) => {
    const isDbUp = await checkDbHealth();
    const isRedisUp = await checkRedisHealth();

    // Distributed Systems Note: Degraded Mode Availability.
    // If Redis is restarting or partitioned, the API continues to serve critical traffic using Postgres.
    // The readiness endpoint marks the node as degraded rather than completely dead.
    if (isDbUp) {
      return res.status(200).json({
        success: true,
        data: {
          status: isRedisUp ? 'ready' : 'degraded',
          postgres: 'up',
          redis: isRedisUp ? 'up' : (isRedisAvailable() ? 'degraded' : 'down'),
          timestamp: new Date().toISOString()
        }
      });
    }

    return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Primary database connection is down'
      },
      traceId: req.traceId
    });
  });

  // 7. Mount Module Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/hospitals', hospitalsRoutes);
  app.use('/api/v1/bed-requests', bedRequestsRouter);
  app.use('/api/v1/city-summary', citySummaryRouter);
  app.use('/api/v1/equipment', equipmentRouter);
  app.use('/api/v1/events', realtimeRoutes);
  app.use('/api/v1/conditions', conditionsRoutes);
  app.use('/api/v1/match', matchingRoutes);
  app.use('/api/v1/forecast', forecastRoutes);
  app.use('/api/v1/abha', abhaRoutes);

  // 8. 404 and Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

