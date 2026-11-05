import crypto from 'node:crypto';
import { pool } from '../../infra/db.js';
import { redis, isRedisAvailable } from '../../infra/redis.js';
import { logger } from '../../infra/logger.js';

const memory = new Map();
let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS oauth_mobile_sessions (
      id TEXT PRIMARY KEY,
      code_verifier TEXT NOT NULL,
      return_url TEXT NOT NULL DEFAULT '',
      scheme TEXT NOT NULL DEFAULT 'lifelink',
      handoff TEXT NOT NULL DEFAULT '',
      expires_at TIMESTAMPTZ NOT NULL
    )
  `);
  try {
    await pool.query(`ALTER TABLE oauth_mobile_sessions ADD COLUMN IF NOT EXISTS handoff TEXT NOT NULL DEFAULT ''`);
  } catch (_) {}
  tableReady = true;
}

function purgeMemory() {
  const now = Date.now();
  for (const [k, v] of memory.entries()) {
    if (!v || v.exp <= now) memory.delete(k);
  }
}

function randomId() {
  return crypto.randomBytes(16).toString('hex');
}

/** RFC 7636 code_verifier: 43–128 chars from unreserved set. */
export function createCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

export function createCodeChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

/**
 * Persist PKCE + Expo return URL under a short opaque state id.
 * Avoids stuffing long exp:// URLs + verifier into Google's state (causes Bad Request).
 */
export async function createMobileOAuthSession({
  codeVerifier,
  returnUrl = '',
  scheme = 'lifelink',
  handoff = '',
}) {
  const id = randomId();
  const verifier = String(codeVerifier || '');
  if (!verifier) throw new Error('missing_code_verifier');
  const payload = {
    codeVerifier: verifier,
    returnUrl: String(returnUrl || ''),
    scheme: String(scheme || 'lifelink').replace(/[^a-z0-9.-]/gi, '') || 'lifelink',
    handoff: String(handoff || '').replace(/[^a-f0-9]/gi, ''),
  };
  const ttlSec = 600;

  if (isRedisAvailable()) {
    try {
      await redis.set(`oauth:mobile:session:${id}`, JSON.stringify(payload), 'EX', ttlSec);
      return id;
    } catch (err) {
      logger.warn({ err: err.message }, '[OAuthSession] Redis set failed, trying DB');
    }
  }

  try {
    await ensureTable();
    await pool.query(
      `INSERT INTO oauth_mobile_sessions (id, code_verifier, return_url, scheme, handoff, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW() + ($6::text || ' seconds')::interval)
       ON CONFLICT (id) DO UPDATE SET
         code_verifier = EXCLUDED.code_verifier,
         return_url = EXCLUDED.return_url,
         scheme = EXCLUDED.scheme,
         handoff = EXCLUDED.handoff,
         expires_at = EXCLUDED.expires_at`,
      [id, payload.codeVerifier, payload.returnUrl, payload.scheme, payload.handoff, String(ttlSec)]
    );
    return id;
  } catch (err) {
    logger.warn({ err: err.message }, '[OAuthSession] DB store failed, using memory');
    purgeMemory();
    memory.set(id, { ...payload, exp: Date.now() + ttlSec * 1000 });
    return id;
  }
}

/** Load + delete session (one-time). */
export async function consumeMobileOAuthSession(stateId) {
  const id = String(stateId || '').replace(/[^a-f0-9]/gi, '');
  if (!id || id.length < 16) return null;

  if (isRedisAvailable()) {
    try {
      const key = `oauth:mobile:session:${id}`;
      const raw = await redis.get(key);
      if (raw) {
        await redis.del(key);
        const parsed = JSON.parse(raw);
        return {
          codeVerifier: parsed.codeVerifier,
          returnUrl: parsed.returnUrl || '',
          scheme: parsed.scheme || 'lifelink',
          handoff: parsed.handoff || '',
        };
      }
    } catch (err) {
      logger.warn({ err: err.message }, '[OAuthSession] Redis get failed');
    }
  }

  try {
    await ensureTable();
    const { rows } = await pool.query(
      `DELETE FROM oauth_mobile_sessions
       WHERE id = $1 AND expires_at > NOW()
       RETURNING code_verifier, return_url, scheme, handoff`,
      [id]
    );
    if (rows[0]) {
      return {
        codeVerifier: rows[0].code_verifier,
        returnUrl: rows[0].return_url || '',
        scheme: rows[0].scheme || 'lifelink',
        handoff: rows[0].handoff || '',
      };
    }
  } catch (err) {
    logger.warn({ err: err.message }, '[OAuthSession] DB redeem failed');
  }

  purgeMemory();
  const mem = memory.get(id);
  if (mem && mem.exp > Date.now()) {
    memory.delete(id);
    return {
      codeVerifier: mem.codeVerifier,
      returnUrl: mem.returnUrl || '',
      scheme: mem.scheme || 'lifelink',
      handoff: mem.handoff || '',
    };
  }
  memory.delete(id);
  return null;
}

const handoffMemory = new Map();

/** Publish ticket for Expo app to poll (Custom Tabs often block Open-app deep links). */
export async function publishMobileHandoff(handoffId, ticket) {
  const id = String(handoffId || '').replace(/[^a-f0-9]/gi, '');
  const t = String(ticket || '').replace(/[^a-f0-9]/gi, '');
  if (!id || !t) return;
  const ttlSec = 180;
  if (isRedisAvailable()) {
    try {
      await redis.set(`oauth:mobile:handoff:${id}`, t, 'EX', ttlSec);
      return;
    } catch (err) {
      logger.warn({ err: err.message }, '[OAuthHandoff] Redis set failed');
    }
  }
  handoffMemory.set(id, { ticket: t, exp: Date.now() + ttlSec * 1000 });
}

/** App polls this; returns ticket once then deletes. */
export async function takeMobileHandoff(handoffId) {
  const id = String(handoffId || '').replace(/[^a-f0-9]/gi, '');
  if (!id || id.length < 16) return null;

  if (isRedisAvailable()) {
    try {
      const key = `oauth:mobile:handoff:${id}`;
      const val = await redis.get(key);
      if (val) {
        await redis.del(key);
        return val;
      }
    } catch (err) {
      logger.warn({ err: err.message }, '[OAuthHandoff] Redis get failed');
    }
  }

  const mem = handoffMemory.get(id);
  if (mem && mem.exp > Date.now()) {
    handoffMemory.delete(id);
    return mem.ticket;
  }
  handoffMemory.delete(id);
  return null;
}
