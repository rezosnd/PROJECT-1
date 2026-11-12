import { config } from '../../config/index.js';
import { logger } from '../../infra/logger.js';
import { pool } from '../../infra/db.js';

let firebaseApp = null;
let messaging = null;

function parseServiceAccount(raw) {
  if (!raw) return null;
  let cred = raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      cred = JSON.parse(trimmed);
    } else {
      // Support base64-encoded JSON (safer for Vercel env UI)
      const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
      cred = JSON.parse(decoded);
    }
  }
  if (!cred?.client_email || !cred?.private_key || !cred?.project_id) {
    throw new Error('Firebase service account missing client_email, private_key, or project_id');
  }
  // dotenv / paste often leaves literal \n in the PEM
  if (typeof cred.private_key === 'string' && cred.private_key.includes('\\n')) {
    cred.private_key = cred.private_key.replace(/\\n/g, '\n');
  }
  return cred;
}

async function ensureFirebase() {
  if (messaging) return messaging;
  const json = config.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json || !String(json).trim() || String(json).includes('REPLACE_ME')) return null;
  try {
    const admin = await import('firebase-admin');
    const cred = parseServiceAccount(json);
    if (!cred) return null;
    if (!admin.default.apps.length) {
      firebaseApp = admin.default.initializeApp({
        credential: admin.default.credential.cert(cred),
        projectId: cred.project_id,
      });
    } else {
      firebaseApp = admin.default.app();
    }
    messaging = admin.default.messaging(firebaseApp);
    logger.info({ projectId: cred.project_id }, '[Push] Firebase Admin ready');
    return messaging;
  } catch (err) {
    logger.warn({ err: err.message }, '[Push] Firebase Admin unavailable');
    return null;
  }
}

/**
 * Register / refresh a device push token for a user.
 */
export async function upsertPushToken(userId, { token, provider = 'EXPO', platform = 'UNKNOWN', appSlug }) {
  if (!token || !String(token).trim()) return null;
  const res = await pool.query(
    `INSERT INTO device_push_tokens (user_id, token, provider, platform, app_slug, last_seen_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (user_id, token)
     DO UPDATE SET
       provider = EXCLUDED.provider,
       platform = EXCLUDED.platform,
       app_slug = COALESCE(EXCLUDED.app_slug, device_push_tokens.app_slug),
       last_seen_at = NOW()
     RETURNING id, provider, platform`,
    [userId, String(token).trim(), provider, platform, appSlug || null]
  );
  return res.rows[0];
}

async function sendExpo(messages) {
  if (!messages.length) return { sent: 0 };
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      logger.warn({ body }, '[Push] Expo send failed');
      return { sent: 0, error: body };
    }
    return { sent: messages.length, body };
  } catch (err) {
    logger.warn({ err: err.message }, '[Push] Expo network error');
    return { sent: 0, error: err.message };
  }
}

async function sendFcm(tokens, { title, body, data }) {
  const msg = await ensureFirebase();
  if (!msg || !tokens.length) return { sent: 0 };
  try {
    const result = await msg.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data || {}).map(([k, v]) => [k, String(v ?? '')])
      ),
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default', contentAvailable: true } } },
    });
    return { sent: result.successCount, failureCount: result.failureCount };
  } catch (err) {
    logger.warn({ err: err.message }, '[Push] FCM send failed');
    return { sent: 0, error: err.message };
  }
}

/**
 * Notify a list of user IDs with title/body + data payload.
 * Uses Expo Push + optional Firebase FCM. Never throws to callers.
 */
export async function notifyUsers(userIds, { title, body, data = {}, sound = 'default' }) {
  const unique = [...new Set((userIds || []).filter(Boolean))];
  if (!unique.length) return { expo: 0, fcm: 0 };

  const { rows } = await pool.query(
    `SELECT user_id, token, provider FROM device_push_tokens
     WHERE user_id = ANY($1::uuid[])`,
    [unique]
  );

  const expoMsgs = [];
  const fcmTokens = [];
  for (const row of rows) {
    if (row.provider === 'FCM') {
      fcmTokens.push(row.token);
    } else {
      expoMsgs.push({
        to: row.token,
        sound,
        title,
        body,
        data,
        priority: 'high',
        channelId: 'sos',
      });
    }
  }

  const [expoRes, fcmRes] = await Promise.all([
    sendExpo(expoMsgs),
    sendFcm(fcmTokens, { title, body, data }),
  ]);

  return { expo: expoRes.sent || 0, fcm: fcmRes.sent || 0, tokens: rows.length };
}

export const pushService = { upsertPushToken, notifyUsers };
