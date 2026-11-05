import { pool } from '../../infra/db.js';

export const abhaRepository = {
  async createConsent(client, { userId, purpose }) {
    const db = client || pool;
    const res = await db.query(
      `INSERT INTO abha_consents (user_id, purpose, granted_at)
       VALUES ($1, $2, NOW())
       RETURNING id, user_id, purpose, granted_at`,
      [userId, purpose]
    );
    return res.rows[0];
  },

  async getActiveConsent(client, userId) {
    const db = client || pool;
    const res = await db.query(
      `SELECT id, user_id, purpose, granted_at
       FROM abha_consents
       WHERE user_id = $1 AND revoked_at IS NULL
       ORDER BY granted_at DESC
       LIMIT 1`,
      [userId]
    );
    return res.rows[0] || null;
  },

  async revokeConsent(client, userId) {
    const db = client || pool;
    const res = await db.query(
      `UPDATE abha_consents
       SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL
       RETURNING id, user_id, purpose, granted_at, revoked_at`,
      [userId]
    );
    return res.rows;
  },

  async findLinkByUserId(client, userId) {
    const db = client || pool;
    const res = await db.query(
      `SELECT user_id, abha_number_enc, abha_number_hash, abha_address, name,
              photo_url, gender, date_of_birth, mobile, meta,
              qr_payload, qr_image_url,
              verified_at, status, created_at, updated_at
       FROM abha_links
       WHERE user_id = $1`,
      [userId]
    );
    return res.rows[0] || null;
  },

  async findLinkByHash(client, abhaHash) {
    const db = client || pool;
    const res = await db.query(
      `SELECT user_id, abha_number_enc, abha_number_hash, abha_address, name,
              photo_url, gender, date_of_birth, mobile, meta,
              qr_payload, qr_image_url,
              verified_at, status, created_at, updated_at
       FROM abha_links
       WHERE abha_number_hash = $1`,
      [abhaHash]
    );
    return res.rows[0] || null;
  },

  async upsertLink(
    client,
    {
      userId,
      abhaNumberEnc,
      abhaNumberHash,
      abhaAddress,
      name,
      photoUrl = null,
      gender = null,
      dateOfBirth = null,
      mobile = null,
      meta = null,
      qrPayload = null,
      qrImageUrl = null,
    }
  ) {
    const db = client || pool;
    const res = await db.query(
      `INSERT INTO abha_links (
         user_id,
         abha_number_enc,
         abha_number_hash,
         abha_address,
         name,
         photo_url,
         gender,
         date_of_birth,
         mobile,
         meta,
         qr_payload,
         qr_image_url,
         verified_at,
         status,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10::jsonb, '{}'::jsonb), $11, $12, NOW(), 'LINKED', NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         abha_number_enc = EXCLUDED.abha_number_enc,
         abha_number_hash = EXCLUDED.abha_number_hash,
         abha_address = EXCLUDED.abha_address,
         name = COALESCE(NULLIF(TRIM(EXCLUDED.name), ''), abha_links.name, 'ABHA User'),
         photo_url = COALESCE(EXCLUDED.photo_url, abha_links.photo_url),
         gender = COALESCE(EXCLUDED.gender, abha_links.gender),
         date_of_birth = COALESCE(EXCLUDED.date_of_birth, abha_links.date_of_birth),
         mobile = COALESCE(EXCLUDED.mobile, abha_links.mobile),
         meta = COALESCE(EXCLUDED.meta, abha_links.meta),
         qr_payload = COALESCE(EXCLUDED.qr_payload, abha_links.qr_payload),
         qr_image_url = COALESCE(EXCLUDED.qr_image_url, abha_links.qr_image_url),
         verified_at = NOW(),
         status = 'LINKED',
         updated_at = NOW()
       RETURNING user_id, abha_number_enc, abha_address, name, photo_url, gender,
                 date_of_birth, mobile, meta, qr_payload, qr_image_url, verified_at, status`,
      [
        userId,
        abhaNumberEnc,
        abhaNumberHash,
        abhaAddress,
        name,
        photoUrl,
        gender,
        dateOfBirth,
        mobile,
        meta ? JSON.stringify(meta) : null,
        qrPayload,
        qrImageUrl,
      ]
    );
    return res.rows[0];
  },

  async updateQr(client, userId, { qrPayload, qrImageUrl }) {
    const db = client || pool;
    const res = await db.query(
      `UPDATE abha_links
       SET qr_payload = $2,
           qr_image_url = $3,
           updated_at = NOW()
       WHERE user_id = $1
       RETURNING user_id, qr_payload, qr_image_url`,
      [userId, qrPayload, qrImageUrl]
    );
    return res.rows[0] || null;
  },

  async unlink(client, userId) {
    const db = client || pool;
    const res = await db.query(
      `DELETE FROM abha_links
       WHERE user_id = $1
       RETURNING user_id, abha_address, name`,
      [userId]
    );
    return res.rows[0] || null;
  },

  async createAuditEntry(client, { actorId, action, resourceType, resourceId, ip, meta }) {
    const db = client || pool;
    const res = await db.query(
      `INSERT INTO audit_log (actor_id, action, resource_type, resource_id, ip, meta, at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id`,
      [actorId, action, resourceType, resourceId, ip, meta ? JSON.stringify(meta) : null]
    );
    return res.rows[0];
  }
};
