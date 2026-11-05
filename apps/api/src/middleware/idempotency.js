import { pool } from '../infra/db.js';
import { logger } from '../infra/logger.js';

// Map to track in-flight idempotency keys and prevent duplicate concurrent executions
const inFlightRequests = new Map();

/**
 * Distributed Systems Note: Exactly-Once Semantics via Idempotency Keys.
 * In distributed networks with intermittent mobile connectivity, clients may retry mutative POST requests
 * (e.g. bed holds, staff registrations) when responses time out.
 * The idempotency middleware records the response of the first completed transaction.
 * Retried requests with the identical key are served from the registry without re-executing business logic.
 */
export function idempotencyMiddleware(arg1, arg2, arg3) {
  const handler = async (req, res, next) => {
    // Idempotency applies to state-mutating requests (POST, PATCH, PUT, DELETE)
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    const rawKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
    if (!rawKey || typeof rawKey !== 'string' || !rawKey.trim()) {
      return next();
    }

    const idempotencyKey = rawKey.trim();

    try {
      // 1. Check if an identical request is currently in-flight (SingleFlight / request coalescing)
      if (inFlightRequests.has(idempotencyKey)) {
        await inFlightRequests.get(idempotencyKey);
        const { rows: retryRows } = await pool.query(
          'SELECT response FROM idempotency_keys WHERE key = $1',
          [idempotencyKey]
        );
        if (retryRows.length > 0) {
          const cached = retryRows[0].response;
          res.setHeader('x-idempotency-replayed', 'true');
          return res.status(cached.status || 200).json(cached.body);
        }
      }

      // 2. Check if key has already been processed and cached in DB
      const { rows } = await pool.query(
        'SELECT response FROM idempotency_keys WHERE key = $1',
        [idempotencyKey]
      );

      if (rows.length > 0) {
        const cached = rows[0].response;
        logger.info({ idempotencyKey, route: req.originalUrl }, '[Idempotency] Serving cached response for retried request');
        res.setHeader('x-idempotency-replayed', 'true');
        return res.status(cached.status || 200).json(cached.body);
      }

      // Register in-flight promise for concurrent arrival coordination
      let resolveInFlight;
      const inFlightPromise = new Promise((resolve) => { resolveInFlight = resolve; });
      inFlightRequests.set(idempotencyKey, inFlightPromise);

      const cleanupInFlight = () => {
        inFlightRequests.delete(idempotencyKey);
        resolveInFlight();
      };

      res.on('finish', cleanupInFlight);
      res.on('close', cleanupInFlight);

      // 3. Intercept response to record upon successful completion
      const originalJson = res.json.bind(res);

      res.json = function (body) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const userId = req.user?.sub || null;
          const route = req.originalUrl;
          const responsePayload = {
            status: res.statusCode,
            body
          };

          pool.query(
            `INSERT INTO idempotency_keys (key, user_id, route, response)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (key) DO NOTHING`,
            [idempotencyKey, userId, route, responsePayload]
          ).catch((err) => {
            logger.error({ err: err.message, idempotencyKey }, '[Idempotency] Failed to persist idempotency key');
          });
        }

        return originalJson(body);
      };

      next();
    } catch (err) {
      logger.error({ err: err.message, idempotencyKey }, '[Idempotency] Lookup error, bypassing cache');
      next();
    }
  };

  // If invoked directly as middleware function (req, res, next)
  if (arg1 && arg2 && typeof arg3 === 'function') {
    return handler(arg1, arg2, arg3);
  }

  // If invoked as a middleware factory ()
  return handler;
}

