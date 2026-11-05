import { redis, isRedisAvailable } from '../infra/redis.js';
import { AppError } from './error-handler.js';
import { logger } from '../infra/logger.js';

// In-memory sliding window fallback when Redis is offline
const memoryBuckets = new Map();

function cleanMemoryBuckets() {
  const now = Date.now();
  for (const [key, record] of memoryBuckets.entries()) {
    if (now > record.resetAt) {
      memoryBuckets.delete(key);
    }
  }
}
const _rlCleanup = setInterval(cleanMemoryBuckets, 60000);
if (typeof _rlCleanup.unref === 'function') _rlCleanup.unref();

/**
 * Distributed Systems Note: Coordinated Rate Limiting with Degraded Fallback.
 * Multiple load-balanced API instances coordinate request quotas through a shared Redis sliding window.
 * If the Redis cluster suffers network partitioning, the limiter automatically switches to an in-memory
 * node-local counter, protecting service availability without allowing unconstrained denial-of-service.
 */
export function rateLimiter({ max = 100, windowMs = 60000, prefix = 'rl:global' } = {}) {
  return async (req, res, next) => {
    // In test environment, allow tests to run without rate limiting hurdles unless specifically tested
    if (process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit']) {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const key = `${prefix}:${ip}`;

    // 1. Try Redis sliding counter if available
    if (isRedisAvailable()) {
      try {
        const current = await redis.incr(key);
        if (current === 1) {
          await redis.pexpire(key, windowMs);
        }

        res.setHeader('x-ratelimit-limit', max);
        res.setHeader('x-ratelimit-remaining', Math.max(0, max - current));

        if (current > max) {
          return next(new AppError('Rate limit exceeded. Please retry later.', 429, 'RATE_LIMIT_EXCEEDED'));
        }

        return next();
      } catch (err) {
        logger.warn({ err: err.message }, '[RateLimiter] Redis failure; falling back to memory counter');
      }
    }

    // 2. In-memory fallback
    const now = Date.now();
    let record = memoryBuckets.get(key);

    if (!record || now > record.resetAt) {
      record = { count: 1, resetAt: now + windowMs };
      memoryBuckets.set(key, record);
    } else {
      record.count += 1;
    }

    res.setHeader('x-ratelimit-limit', max);
    res.setHeader('x-ratelimit-remaining', Math.max(0, max - record.count));

    if (record.count > max) {
      return next(new AppError('Rate limit exceeded. Please retry later.', 429, 'RATE_LIMIT_EXCEEDED'));
    }

    next();
  };
}

