import { pool } from '../../infra/db.js';

export const adminRepository = {
  async hospitalExists(db = pool, hospitalId) {
    const { rows } = await db.query(
      'SELECT id, name FROM hospitals WHERE id = $1',
      [hospitalId]
    );
    return rows[0] || null;
  },

  async upsertPreregisteredStaff(db = pool, { email, role, hospitalId, specialty = null, licenseNo = null }) {
    const { rows } = await db.query(
      `INSERT INTO preregistered_staff (email, role, hospital_id, specialty, license_no)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email)
       DO UPDATE SET
         role = EXCLUDED.role,
         hospital_id = EXCLUDED.hospital_id,
         specialty = EXCLUDED.specialty,
         license_no = EXCLUDED.license_no,
         created_at = NOW()
       RETURNING *`,
      [email.toLowerCase(), role, hospitalId || null, specialty, licenseNo]
    );
    return rows[0];
  },

  async updateUserRoleAndHospital(db = pool, email, { role, hospitalId, specialty = null, licenseNo = null }) {
    const { rows } = await db.query(
      `UPDATE users
       SET role = $2,
           hospital_id = $3,
           doctor_specialty = COALESCE($4, doctor_specialty),
           doctor_license_no = COALESCE($5, doctor_license_no),
           updated_at = NOW()
       WHERE email = $1
       RETURNING id, email, name, role, hospital_id, status, doctor_specialty, doctor_license_no`,
      [email.toLowerCase(), role, hospitalId || null, specialty, licenseNo]
    );
    return rows[0] || null;
  },

  async findUserById(db = pool, id) {
    const { rows } = await db.query(
      'SELECT id, email, name, role, hospital_id, status, last_login_at, created_at FROM users WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  },

  async updateUserStatus(db = pool, id, status) {
    const { rows } = await db.query(
      `UPDATE users
       SET status = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, name, role, hospital_id, status, last_login_at, updated_at`,
      [id, status]
    );
    return rows[0] || null;
  },

  async listUsers(db = pool, { page = 1, limit = 20, role, status, search }) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (role) {
      conditions.push(`u.role = $${paramIndex++}`);
      values.push(role);
    }

    if (status) {
      conditions.push(`u.status = $${paramIndex++}`);
      values.push(status);
    }

    if (search) {
      conditions.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count query
    const countQuery = `SELECT COUNT(*) as total FROM users u ${whereClause}`;
    const countRes = await db.query(countQuery, values);
    const total = parseInt(countRes.rows[0].total, 10);

    // Data query with hospital name joined
    const dataQuery = `
      SELECT 
        u.id, u.email, u.name, u.picture_url, u.role, u.hospital_id,
        h.name as hospital_name,
        u.status, u.last_login_at, u.created_at,
        u.profile_complete, u.blood_group, u.gender, u.city_name,
        u.emergency_contact_phone, u.age_years
      FROM users u
      LEFT JOIN hospitals h ON u.hospital_id = h.id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const dataRes = await db.query(dataQuery, [...values, limit, offset]);

    return {
      users: dataRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
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

