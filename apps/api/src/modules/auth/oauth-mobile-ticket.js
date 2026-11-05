import crypto from 'node:crypto';
import { pool } from '../../infra/db.js';
import { redis, isRedisAvailable } from '../../infra/redis.js';
import { logger } from '../../infra/logger.js';

const memory = new Map();
let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS oauth_mobile_tickets (
      id TEXT PRIMARY KEY,
      id_token TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    )
  `);
  tableReady = true;
}

function purgeMemory() {
  const now = Date.now();
  for (const [k, v] of memory.entries()) {
    if (!v || v.exp <= now) memory.delete(k);
  }
}

/**
 * Store Google id_token under a short one-time ticket.
 * Deep-linking the full JWT into Expo Go / Custom Tabs hangs on "Opening…".
 */
export async function createMobileOAuthTicket(idToken) {
  const id = crypto.randomBytes(16).toString('hex');
  const payload = String(idToken || '');
  if (!payload) throw new Error('missing_id_token');
  const ttlSec = 180;

  if (isRedisAvailable()) {
    try {
      await redis.set(`oauth:mobile:${id}`, payload, 'EX', ttlSec);
      return id;
    } catch (err) {
      logger.warn({ err: err.message }, '[OAuthTicket] Redis set failed, trying DB');
    }
  }

  try {
    await ensureTable();
    await pool.query(
      `INSERT INTO oauth_mobile_tickets (id, id_token, expires_at)
       VALUES ($1, $2, NOW() + ($3::text || ' seconds')::interval)
       ON CONFLICT (id) DO UPDATE
         SET id_token = EXCLUDED.id_token, expires_at = EXCLUDED.expires_at`,
      [id, payload, String(ttlSec)]
    );
    return id;
  } catch (err) {
    logger.warn({ err: err.message }, '[OAuthTicket] DB store failed, using memory');
    purgeMemory();
    memory.set(id, { idToken: payload, exp: Date.now() + ttlSec * 1000 });
    return id;
  }
}

/** Redeem once; returns id_token or null. */
export async function redeemMobileOAuthTicket(ticketId) {
  const id = String(ticketId || '').replace(/[^a-f0-9]/gi, '');
  if (!id || id.length < 16) return null;

  if (isRedisAvailable()) {
    try {
      const key = `oauth:mobile:${id}`;
      const val = await redis.get(key);
      if (val) {
        await redis.del(key);
        return val;
      }
    } catch (err) {
      logger.warn({ err: err.message }, '[OAuthTicket] Redis get failed');
    }
  }

  try {
    await ensureTable();
    const { rows } = await pool.query(
      `DELETE FROM oauth_mobile_tickets
       WHERE id = $1 AND expires_at > NOW()
       RETURNING id_token`,
      [id]
    );
    if (rows[0]?.id_token) return rows[0].id_token;
  } catch (err) {
    logger.warn({ err: err.message }, '[OAuthTicket] DB redeem failed');
  }

  purgeMemory();
  const mem = memory.get(id);
  if (mem && mem.exp > Date.now()) {
    memory.delete(id);
    return mem.idToken;
  }
  memory.delete(id);
  return null;
}

export function buildMobileDeepLinks({ returnUrl, scheme, ticket }) {
  const q = `ticket=${encodeURIComponent(ticket)}`;
  const links = [];
  const ret = String(returnUrl || '').trim();
  if (ret) {
    links.push(ret + (ret.includes('?') ? '&' : '?') + q);
  }
  const sch = String(scheme || 'lifelink').replace(/[^a-z0-9.-]/gi, '') || 'lifelink';
  links.push(`${sch}://oauth?${q}`);
  links.push(`exp://oauth?${q}`);

  // Android Intent for Expo Go when returnUrl is exp://host/--/path
  const m = ret.match(/^exp:\/\/([^/?#]+)(\/[^?#]*)?/i);
  if (m) {
    const host = m[1];
    const path = m[2] || '/';
    links.push(
      `intent://${host}${path}?${q}#Intent;scheme=exp;package=host.exp.exponent;end`
    );
  }

  return [...new Set(links.filter(Boolean))];
}
