import { pool } from '../../infra/db.js';

export function formatHospitalRow(h) {
  if (!h) return null;
  return {
    ...h,
    registrationNo: h.registration_no || h.registrationNo || '',
    emergency24x7: h.emergency_24x7 !== undefined ? Boolean(h.emergency_24x7) : Boolean(h.emergency24x7 ?? true),
    traumaLevel: Number(h.trauma_level ?? h.traumaLevel ?? 0),
    ratingAvg: Number(h.rating_avg ?? h.ratingAvg ?? 4.5),
    photoUrl: h.photo_url || h.photoUrl || null
  };
}

export const hospitalsRepository = {
  async findById(db = pool, id) {
    const { rows } = await db.query(
      `SELECT id, name, type, registration_no, address, city, pin,
              ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude,
              phone, email, emergency_24x7, trauma_level, specialties, facilities, rating_avg, status, photo_url,
              created_at, updated_at
       FROM hospitals WHERE id = $1`,
      [id]
    );
    return formatHospitalRow(rows[0]);
  },

  /**
   * Comprehensive detail view including live derived bed inventory and equipment summary
   */
  async findByIdWithSummary(db = pool, id) {
    const hospital = await this.findById(db, id);
    if (!hospital) return null;

    // Derived free beds across all ward types
    const { rows: beds } = await db.query(
      `SELECT ward_type, total, occupied, reserved, cleaning, maintenance,
              has_ventilator_beds,
              (total - occupied - reserved - cleaning - maintenance) AS free,
              version, updated_at
       FROM bed_inventory
       WHERE hospital_id = $1
       ORDER BY ward_type ASC`,
      [id]
    );

    // Live equipment count grouped by type and availability
    const { rows: equipment } = await db.query(
      `SELECT type,
              COUNT(*) as total,
              COUNT(*) FILTER (WHERE status = 'AVAILABLE') as available
       FROM equipment
       WHERE hospital_id = $1
       GROUP BY type
       ORDER BY type ASC`,
      [id]
    );

    return {
      ...hospital,
      beds,
      equipment
    };
  },

  /**
   * PostGIS geospatial search with multi-criteria filtering and sorting
   */
  async searchHospitals(db = pool, {
    lat = 20.2961, // Bhubaneswar default latitude
    lng = 85.8245, // Bhubaneswar default longitude
    radiusMeters = 25000,
    type,
    specialty,
    status,
    q,
    sort = 'distance',
    page = 1,
    limit = 20
  }) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [lng, lat, radiusMeters];
    let paramIndex = 4;

    if (status && status !== 'ALL') {
      conditions.push(`status = $${paramIndex++}`);
      values.push(status);
    } else if (!status) {
      conditions.push("status = 'VERIFIED'");
    }

    conditions.push(`ST_DWithin(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)`);

    if (type) {
      conditions.push(`type = $${paramIndex++}`);
      values.push(type);
    }

    if (specialty) {
      conditions.push(`$${paramIndex++} = ANY(specialties)`);
      values.push(specialty);
    }

    if (q) {
      conditions.push(`(name ILIKE $${paramIndex} OR address ILIKE $${paramIndex})`);
      values.push(`%${q}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Total matching count
    const countSql = `SELECT COUNT(*) as total FROM hospitals WHERE ${whereClause}`;
    const countRes = await db.query(countSql, values);
    const total = parseInt(countRes.rows[0].total, 10);

    const orderBy = sort === 'rating' ? 'rating_avg DESC, distance_meters ASC' : 'distance_meters ASC';

    const dataSql = `
      SELECT id, name, type, address, city, pin, phone, email, emergency_24x7, trauma_level,
             specialties, facilities, rating_avg, status, photo_url,
             ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude,
             ROUND(ST_Distance(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)) as distance_meters
      FROM hospitals
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const dataRes = await db.query(dataSql, [...values, limit, offset]);

    return {
      hospitals: dataRes.rows.map(formatHospitalRow),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  },

  async createHospital(db = pool, data) {
    const { rows } = await db.query(
      `INSERT INTO hospitals (
        name, type, registration_no, address, city, pin,
        location, phone, email, emergency_24x7, trauma_level,
        specialties, facilities, status
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        ST_SetSRID(ST_MakePoint($7, $8), 4326)::geography,
        $9, $10, $11, $12, $13, $14, 'VERIFIED'
      )
      RETURNING id, name, type, registration_no, address, city, pin, phone, email,
                emergency_24x7, trauma_level, specialties, facilities, status, created_at`,
      [
        data.name, data.type, data.registrationNo, data.address, data.city, data.pin,
        data.longitude, data.latitude,
        data.phone, data.email.toLowerCase(), data.emergency24x7, data.traumaLevel,
        data.specialties, data.facilities
      ]
    );

    const hospital = formatHospitalRow(rows[0]);

    // Seed default zero inventory for all 10 ward types
    const WARD_TYPES = ['ICU', 'NICU', 'PICU', 'HDU', 'CCU', 'GENERAL', 'SEMI_PRIVATE', 'PRIVATE', 'EMERGENCY', 'ISOLATION'];
    for (const wardType of WARD_TYPES) {
      await db.query(
        `INSERT INTO bed_inventory (hospital_id, ward_type, total, occupied, reserved, cleaning, maintenance, version)
         VALUES ($1, $2, 0, 0, 0, 0, 0, 1)
         ON CONFLICT (hospital_id, ward_type) DO NOTHING`,
        [hospital.id, wardType]
      );
    }

    return hospital;
  },

  async updateHospital(db = pool, id, data) {
    const updates = [];
    const values = [id];
    let idx = 2;

    if (data.name !== undefined) { updates.push(`name = $${idx++}`); values.push(data.name); }
    if (data.phone !== undefined) { updates.push(`phone = $${idx++}`); values.push(data.phone); }
    if (data.address !== undefined) { updates.push(`address = $${idx++}`); values.push(data.address); }
    if (data.emergency24x7 !== undefined) { updates.push(`emergency_24x7 = $${idx++}`); values.push(data.emergency24x7); }
    if (data.specialties !== undefined) { updates.push(`specialties = $${idx++}`); values.push(data.specialties); }
    if (data.facilities !== undefined) { updates.push(`facilities = $${idx++}`); values.push(data.facilities); }
    if (data.ratingAvg !== undefined) { updates.push(`rating_avg = $${idx++}`); values.push(data.ratingAvg); }

    if (updates.length === 0) {
      return await this.findById(db, id);
    }

    updates.push('updated_at = NOW()');

    const { rows } = await db.query(
      `UPDATE hospitals SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );

    return formatHospitalRow(rows[0]);
  },

  async verifyHospital(db = pool, id, status) {
    const { rows } = await db.query(
      `UPDATE hospitals SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, status]
    );
    return formatHospitalRow(rows[0]);
  }
};
