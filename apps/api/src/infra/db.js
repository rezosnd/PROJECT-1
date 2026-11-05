import crypto from 'node:crypto';
import pg from 'pg';
import { config } from '../config/index.js';
import { logger } from './logger.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  min: config.DATABASE_POOL_MIN,
  max: config.DATABASE_POOL_MAX,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: config.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  logger.error({ err }, '[PostgreSQL] Unexpected error on idle client');
});

/**
 * Execute a query with standardized error logging and tracing.
 * Note: Query parameter values are intentionally excluded from error logs to prevent
 * accidental leakage of PII/PHI (ABHA numbers, secrets, tokens).
 */
export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (config.NODE_ENV === 'development') {
      logger.debug({ text, duration, rows: res.rowCount }, '[PostgreSQL] Query executed');
    }
    return res;
  } catch (err) {
    logger.error({ text, paramCount: params ? params.length : 0, err: err.message }, '[PostgreSQL] Query failed');
    throw err;
  }
}

/**
 * Transaction helper with automatic BEGIN, COMMIT, and ROLLBACK
 */
export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Normalize an advisory lock key (number or string) to a PostgreSQL-compatible 32-bit integer.
 */
function normalizeAdvisoryLockId(lockKey) {
  if (typeof lockKey === 'number' && Number.isInteger(lockKey)) {
    return lockKey;
  }
  const hash = crypto.createHash('sha256').update(String(lockKey)).digest();
  return hash.readInt32BE(0);
}

/**
 * Distributed Systems Note: Distributed mutual exclusion via Postgres Advisory Locks.
 * When multiple API replicas run background jobs (e.g. bed-hold expiry, snapshot generation),
 * pg_try_advisory_lock ensures exactly one worker acquires the lock without needing external
 * coordinators like ZooKeeper or Consul. If the node crashes, PostgreSQL automatically releases the session lock.
 */
export async function withAdvisoryLock(lockId, callback) {
  const client = await pool.connect();
  const numericLockId = normalizeAdvisoryLockId(lockId);
  try {
    const { rows } = await client.query('SELECT pg_try_advisory_lock($1) AS acquired', [numericLockId]);
    if (!rows[0].acquired) {
      logger.debug({ lockId, numericLockId }, '[Distributed Lock] Another instance currently holds advisory lock; skipping run');
      return null;
    }
    try {
      return await callback(client);
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [numericLockId]);
    }
  } finally {
    client.release();
  }
}

/**
 * DB Health probe for /ready endpoint
 */
export async function checkDbHealth() {
  try {
    const res = await pool.query('SELECT 1 as healthy');
    return res.rows[0]?.healthy === 1;
  } catch (err) {
    logger.warn({ err: err.message }, '[PostgreSQL] Health check failed');
    return false;
  }
}

