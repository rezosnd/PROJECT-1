import { pool } from '../../infra/db.js';

export const authRepository = {
  async findUserByGoogleSub(db = pool, googleSub) {
    const { rows } = await db.query(
      'SELECT * FROM users WHERE google_sub = $1',
      [googleSub]
    );
    return rows[0] || null;
  },

  async findUserByEmail(db = pool, email) {
    const { rows } = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    return rows[0] || null;
  },

  async findUserById(db = pool, id) {
    const { rows } = await db.query(
      `SELECT id, google_sub, email, name, picture_url, abha_photo_url, mobile_phone, role, hospital_id, status,
              last_login_at, created_at, updated_at,
              profile_complete, full_name, date_of_birth, gender, blood_group, age_years,
              address_line, city_name, pin_code, emergency_contact_name, emergency_contact_phone,
              allergies, medical_notes, preferred_language, profile_completed_at
       FROM users WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async updatePatientProfile(db = pool, userId, profile) {
    const { rows } = await db.query(
      `UPDATE users SET
         full_name = COALESCE($2, full_name),
         name = COALESCE($2, name),
         date_of_birth = COALESCE($3, date_of_birth),
         gender = COALESCE($4, gender),
         blood_group = COALESCE($5, blood_group),
         age_years = COALESCE($6, age_years),
         address_line = COALESCE($7, address_line),
         city_name = COALESCE($8, city_name),
         pin_code = COALESCE($9, pin_code),
         emergency_contact_name = COALESCE($10, emergency_contact_name),
         emergency_contact_phone = COALESCE($11, emergency_contact_phone),
         allergies = COALESCE($12, allergies),
         medical_notes = COALESCE($13, medical_notes),
         preferred_language = COALESCE($14, preferred_language),
         mobile_phone = COALESCE($15, mobile_phone),
         abha_photo_url = COALESCE($16, abha_photo_url),
         profile_complete = TRUE,
         profile_completed_at = COALESCE(profile_completed_at, NOW()),
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        userId,
        profile.fullName || null,
        profile.dateOfBirth || null,
        profile.gender || null,
        profile.bloodGroup || null,
        profile.ageYears ?? null,
        profile.addressLine || null,
        profile.cityName || null,
        profile.pinCode || null,
        profile.emergencyContactName || null,
        profile.emergencyContactPhone || null,
        profile.allergies || null,
        profile.medicalNotes || null,
        profile.preferredLanguage || 'en',
        profile.mobilePhone || null,
        profile.abhaPhotoUrl || null,
      ]
    );
    return rows[0] || null;
  },

  async setAbhaPhoto(db = pool, userId, abhaPhotoUrl) {
    const { rows } = await db.query(
      `UPDATE users
       SET abha_photo_url = $2,
           picture_url = COALESCE($2, picture_url),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, abha_photo_url, picture_url`,
      [userId, abhaPhotoUrl]
    );
    return rows[0] || null;
  },

  async findPreregisteredStaff(db = pool, email) {
    const { rows } = await db.query(
      'SELECT * FROM preregistered_staff WHERE email = $1',
      [email.toLowerCase()]
    );
    return rows[0] || null;
  },

  async consumePreregisteredStaff(db = pool, id) {
    const { rows } = await db.query(
      'DELETE FROM preregistered_staff WHERE id = $1 RETURNING *',
      [id]
    );
    return rows[0] || null;
  },

  async createUser(db = pool, { googleSub, email, name, pictureUrl, role, hospitalId }) {
    const { rows } = await db.query(
      `INSERT INTO users (google_sub, email, name, picture_url, role, hospital_id, status, last_login_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', NOW())
       RETURNING *`,
      [googleSub, email.toLowerCase(), name, pictureUrl, role, hospitalId]
    );
    return rows[0];
  },

  async updateUserOnLogin(db = pool, id, { googleSub, name, pictureUrl, role, hospitalId }) {
    const { rows } = await db.query(
      `UPDATE users
       SET google_sub = COALESCE($2, google_sub),
           name = CASE WHEN abha_photo_url IS NOT NULL THEN name ELSE COALESCE($3, name) END,
           picture_url = COALESCE($4, picture_url),
           role = COALESCE($5, role),
           hospital_id = COALESCE($6, hospital_id),
           last_login_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, googleSub, name, pictureUrl, role, hospitalId]
    );
    return rows[0];
  },

  async createRefreshToken(db = pool, { userId, tokenHash, familyId, expiresAt }) {
    const { rows } = await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, tokenHash, familyId, expiresAt]
    );
    return rows[0];
  },

  async findRefreshTokenByHash(db = pool, tokenHash) {
    const { rows } = await db.query(
      'SELECT * FROM refresh_tokens WHERE token_hash = $1',
      [tokenHash]
    );
    return rows[0] || null;
  },

  async findRefreshTokenByHashForUpdate(db = pool, tokenHash) {
    const { rows } = await db.query(
      'SELECT * FROM refresh_tokens WHERE token_hash = $1 FOR UPDATE',
      [tokenHash]
    );
    return rows[0] || null;
  },

  async revokeRefreshToken(db = pool, id) {
    await db.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1',
      [id]
    );
  },

  async revokeFamily(db = pool, familyId) {
    await db.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE family_id = $1 AND revoked_at IS NULL',
      [familyId]
    );
  },

  async revokeAllUserTokens(db = pool, userId) {
    await db.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [userId]
    );
  },

  async insertAuditLog(db = pool, { actorId, action, resourceType, resourceId, ip, meta }) {
    await db.query(
      `INSERT INTO audit_log (actor_id, action, resource_type, resource_id, ip, meta, at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [actorId, action, resourceType, resourceId, ip, meta ? JSON.stringify(meta) : null]
    );
  }
};

