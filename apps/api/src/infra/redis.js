import Redis from 'ioredis';
import { config } from '../config/index.js';
import { logger } from './logger.js';

let isConnected = false;

// Distributed Systems Note: Resilient Fallback Pattern.
// In high-reliability distributed systems, the cache/pub-sub tier must not be a single point of failure (SPOF).
// If Redis becomes partitioned or crashes, the API gracefully falls back to direct database reads,
// logging degraded operation without failing user requests.
export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 1,
  enableReadyCheck: false,
  retryStrategy(times) {
    if (config.NODE_ENV === 'test') {
      return null; // Stop reconnecting immediately in test mode
    }
    const delay = Math.min(times * 500, 3000);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
  lazyConnect: true
});

redis.on('connect', () => {
  isConnected = true;
  logger.info('[Redis] Connected to cluster/instance successfully');
});

redis.on('ready', () => {
  isConnected = true;
});

redis.on('error', (err) => {
  isConnected = false;
  logger.warn({ err: err.message }, '[Redis] Warning: Connection unavailable, fallback active');
});

redis.on('close', () => {
  isConnected = false;
});

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const redisLooksLocal =
  !config.REDIS_URL ||
  /localhost|127\.0\.0\.1/.test(config.REDIS_URL);

// Attempt initial connection without blocking process boot.
// On Vercel without a real Redis URL, skip connect — rate limit falls back to memory.
if (config.NODE_ENV !== 'test' && !(isServerless && redisLooksLocal)) {
  redis.connect().catch((err) => {
    logger.warn(
      { err: err.message },
      '[Redis] Initial connection deferred, API operating in resilient fallback mode'
    );
  });
}

export function isRedisAvailable() {
  return isConnected;
}

export async function checkRedisHealth() {
  if (!isConnected) return false;
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

