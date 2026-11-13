import { pool } from '../../infra/db.js';

export const sosRepository = {
  async createSos(db = pool, {
    patientId,
    lng,
    lat,
    note,
    patientPhone,
    addressText,
    severity,
    radiusM,
  }) {
    const res = await db.query(
      `INSERT INTO sos_requests (
         patient_id, note, patient_phone, address_text, severity, search_radius_m,
         location
       ) VALUES (
         $1, $2, $3, $4, $5, $6,
         ST_SetSRID(ST_MakePoint($7, $8), 4326)::geography
       )
       RETURNING *`,
      [patientId, note || null, patientPhone || null, addressText || null, severity || 'CRITICAL', radiusM || 15000, lng, lat]
    );
    return res.rows[0];
  },

  async findNearbyAmbulances(db = pool, { lng, lat, radiusM = 15000, limit = 25 }) {
    const res = await db.query(
      `SELECT
         a.id,
         a.user_id AS "userId",
         a.call_sign AS "callSign",
         a.vehicle_no AS "vehicleNo",
         a.ambulance_type AS "ambulanceType",
         a.phone,
         a.status,
         a.hospital_id AS "hospitalId",
         h.name AS "hospitalName",
         ST_Y(a.location::geometry) AS latitude,
         ST_X(a.location::geometry) AS longitude,
         ST_Distance(
           a.location,
           ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
         ) AS distance_m
       FROM ambulances a
       LEFT JOIN hospitals h ON h.id = a.hospital_id
       WHERE a.active = TRUE
         AND a.status = 'AVAILABLE'
         AND a.location IS NOT NULL
         AND ST_DWithin(
           a.location,
           ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
           $3
         )
       ORDER BY distance_m ASC
       LIMIT $4`,
      [lng, lat, radiusM, limit]
    );
    return res.rows;
  },

  async insertDispatchTargets(db = pool, sosId, targets) {
    if (!targets.length) return;
    const values = [];
    const params = [];
    targets.forEach((t, i) => {
      const o = i * 4;
      values.push(`($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4})`);
      params.push(sosId, t.id, t.distance_m ?? null, true);
    });
    await db.query(
      `INSERT INTO sos_dispatch_targets (sos_id, ambulance_id, distance_m, push_sent)
       VALUES ${values.join(',')}
       ON CONFLICT DO NOTHING`,
      params
    );
  },

  async setNotifiedCount(db = pool, sosId, count) {
    await db.query(
      `UPDATE sos_requests SET notified_count = $2, updated_at = NOW() WHERE id = $1`,
      [sosId, count]
    );
  },

  async getById(db = pool, id) {
    const res = await db.query(
      `SELECT
         s.*,
         ST_Y(s.location::geometry) AS latitude,
         ST_X(s.location::geometry) AS longitude,
         u.name AS patient_name,
         u.email AS patient_email,
         a.call_sign AS ambulance_call_sign,
         a.vehicle_no AS ambulance_vehicle_no,
         a.ambulance_type AS ambulance_type,
         a.phone AS ambulance_phone,
         au.name AS ambulance_driver_name,
         h.name AS destination_hospital_name
       FROM sos_requests s
       JOIN users u ON u.id = s.patient_id
       LEFT JOIN ambulances a ON a.id = s.accepted_ambulance_id
       LEFT JOIN users au ON au.id = s.accepted_by_user_id
       LEFT JOIN hospitals h ON h.id = s.destination_hospital_id
       WHERE s.id = $1`,
      [id]
    );
    return res.rows[0] || null;
  },

  async listForPatient(db = pool, patientId, limit = 20) {
    const res = await db.query(
      `SELECT
         s.id, s.status, s.severity, s.note, s.created_at, s.accepted_at, s.expires_at,
         ST_Y(s.location::geometry) AS latitude,
         ST_X(s.location::geometry) AS longitude,
         a.call_sign AS ambulance_call_sign,
         a.vehicle_no AS ambulance_vehicle_no,
         a.phone AS ambulance_phone,
         au.name AS ambulance_driver_name
       FROM sos_requests s
       LEFT JOIN ambulances a ON a.id = s.accepted_ambulance_id
       LEFT JOIN users au ON au.id = s.accepted_by_user_id
       WHERE s.patient_id = $1
       ORDER BY s.created_at DESC
       LIMIT $2`,
      [patientId, limit]
    );
    return res.rows;
  },

  async listOpenForAmbulance(db = pool, ambulanceId, lng, lat, radiusM = 20000) {
    const res = await db.query(
      `SELECT
         s.id, s.status, s.severity, s.note, s.patient_phone, s.created_at, s.expires_at,
         ST_Y(s.location::geometry) AS latitude,
         ST_X(s.location::geometry) AS longitude,
         s.address_text,
         u.name AS patient_name,
         ST_Distance(
           s.location,
           COALESCE(
             (SELECT location FROM ambulances WHERE id = $1),
             ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography
           )
         ) AS distance_m,
         EXISTS (
           SELECT 1 FROM sos_dispatch_targets d
           WHERE d.sos_id = s.id AND d.ambulance_id = $1
         ) AS was_notified
       FROM sos_requests s
       JOIN users u ON u.id = s.patient_id
       WHERE s.status = 'OPEN'
         AND s.expires_at > NOW()
         AND ST_DWithin(
           s.location,
           COALESCE(
             (SELECT location FROM ambulances WHERE id = $1),
             ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography
           ),
           $4
         )
       ORDER BY distance_m ASC
       LIMIT 30`,
      [ambulanceId, lng, lat, radiusM]
    );
    return res.rows;
  },

  /**
   * First-come-first-serve accept. Only succeeds if still OPEN.
   */
  async acceptFcfs(db = pool, { sosId, ambulanceId, userId }) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const lock = await client.query(
        `SELECT id, status FROM sos_requests WHERE id = $1 FOR UPDATE`,
        [sosId]
      );
      if (!lock.rows[0]) {
        await client.query('ROLLBACK');
        return { ok: false, code: 'SOS_NOT_FOUND' };
      }
      if (lock.rows[0].status !== 'OPEN') {
        await client.query('ROLLBACK');
        return { ok: false, code: 'ALREADY_TAKEN', status: lock.rows[0].status };
      }

      const amb = await client.query(
        `SELECT id, status, user_id FROM ambulances WHERE id = $1 AND active = TRUE FOR UPDATE`,
        [ambulanceId]
      );
      if (!amb.rows[0] || amb.rows[0].user_id !== userId) {
        await client.query('ROLLBACK');
        return { ok: false, code: 'AMBULANCE_FORBIDDEN' };
      }
      // Allow AVAILABLE / OFFLINE. If stuck BUSY/EN_ROUTE with no live SOS, recover.
      if (amb.rows[0].status !== 'AVAILABLE' && amb.rows[0].status !== 'OFFLINE') {
        const active = await client.query(
          `SELECT id FROM sos_requests
           WHERE accepted_ambulance_id = $1
             AND status IN ('ACCEPTED', 'EN_ROUTE', 'ARRIVED')
           LIMIT 1`,
          [ambulanceId]
        );
        if (active.rows[0]) {
          await client.query('ROLLBACK');
          return { ok: false, code: 'AMBULANCE_BUSY' };
        }
      }

      const upd = await client.query(
        `UPDATE sos_requests
         SET status = 'ACCEPTED',
             accepted_ambulance_id = $2,
             accepted_by_user_id = $3,
             accepted_at = NOW(),
             updated_at = NOW()
         WHERE id = $1 AND status = 'OPEN'
         RETURNING *`,
        [sosId, ambulanceId, userId]
      );
      if (!upd.rows[0]) {
        await client.query('ROLLBACK');
        return { ok: false, code: 'ALREADY_TAKEN' };
      }

      await client.query(
        `UPDATE ambulances SET status = 'BUSY', updated_at = NOW() WHERE id = $1`,
        [ambulanceId]
      );

      await client.query('COMMIT');
      return { ok: true, row: upd.rows[0] };
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* ignore */
      }
      throw err;
    } finally {
      client.release();
    }
  },

  async updateSosStatus(db = pool, { sosId, status, ambulanceId, destinationHospitalId }) {
    // Cast every bind explicitly — reusing $2 as both varchar status and in CASE
    // caused: "inconsistent types deduced for parameter $2"
    const dest =
      destinationHospitalId && String(destinationHospitalId).trim()
        ? String(destinationHospitalId).trim()
        : null;
    const res = await db.query(
      `UPDATE sos_requests
       SET status = $2::varchar,
           destination_hospital_id = COALESCE($3::uuid, destination_hospital_id),
           completed_at = CASE
             WHEN $2::text IN ('COMPLETED', 'CANCELLED') THEN NOW()
             ELSE completed_at
           END,
           cancelled_at = CASE
             WHEN $2::text = 'CANCELLED' THEN NOW()
             ELSE cancelled_at
           END,
           updated_at = NOW()
       WHERE id = $1::uuid
         AND accepted_ambulance_id = $4::uuid
         AND status IN ('ACCEPTED', 'EN_ROUTE', 'ARRIVED')
       RETURNING *`,
      [sosId, String(status), dest, ambulanceId]
    );
    return res.rows[0] || null;
  },

  async cancelByPatient(db = pool, { sosId, patientId, reason }) {
    const res = await db.query(
      `UPDATE sos_requests
       SET status = 'CANCELLED',
           cancel_reason = $3,
           cancelled_at = NOW(),
           updated_at = NOW()
       WHERE id = $1 AND patient_id = $2 AND status IN ('OPEN', 'ACCEPTED', 'EN_ROUTE')
       RETURNING *`,
      [sosId, patientId, reason || null]
    );
    return res.rows[0] || null;
  },

  async releaseAmbulance(db = pool, ambulanceId) {
    await db.query(
      `UPDATE ambulances SET status = 'AVAILABLE', updated_at = NOW() WHERE id = $1`,
      [ambulanceId]
    );
  },

  async getAmbulanceByUser(db = pool, userId) {
    const res = await db.query(
      `SELECT
         a.*,
         ST_Y(a.location::geometry) AS latitude,
         ST_X(a.location::geometry) AS longitude,
         h.name AS hospital_name
       FROM ambulances a
       LEFT JOIN hospitals h ON h.id = a.hospital_id
       WHERE a.user_id = $1`,
      [userId]
    );
    return res.rows[0] || null;
  },

  async upsertAmbulanceForUser(db = pool, {
    userId,
    callSign,
    vehicleNo,
    ambulanceType,
    phone,
    hospitalId,
    lng,
    lat,
    status = 'AVAILABLE',
  }) {
    const res = await db.query(
      `INSERT INTO ambulances (
         user_id, call_sign, vehicle_no, ambulance_type, phone, hospital_id, status, location, last_location_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7,
         CASE WHEN $8 IS NOT NULL AND $9 IS NOT NULL
           THEN ST_SetSRID(ST_MakePoint($8, $9), 4326)::geography
           ELSE NULL END,
         CASE WHEN $8 IS NOT NULL THEN NOW() ELSE NULL END
       )
       ON CONFLICT (user_id) DO UPDATE SET
         call_sign = EXCLUDED.call_sign,
         vehicle_no = EXCLUDED.vehicle_no,
         ambulance_type = EXCLUDED.ambulance_type,
         phone = COALESCE(EXCLUDED.phone, ambulances.phone),
         hospital_id = COALESCE(EXCLUDED.hospital_id, ambulances.hospital_id),
         status = EXCLUDED.status,
         location = COALESCE(EXCLUDED.location, ambulances.location),
         last_location_at = COALESCE(EXCLUDED.last_location_at, ambulances.last_location_at),
         updated_at = NOW()
       RETURNING *`,
      [userId, callSign, vehicleNo, ambulanceType || 'ALS', phone || null, hospitalId || null, status, lng ?? null, lat ?? null]
    );
    return res.rows[0];
  },

  async updateAmbulanceLocation(db = pool, { userId, lng, lat, status }) {
    const res = await db.query(
      `UPDATE ambulances
       SET location = ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
           last_location_at = NOW(),
           status = COALESCE($4, status),
           updated_at = NOW()
       WHERE user_id = $1
       RETURNING id, status,
         ST_Y(location::geometry) AS latitude,
         ST_X(location::geometry) AS longitude`,
      [userId, lng, lat, status || null]
    );
    return res.rows[0] || null;
  },

  async listHospitalSos(db = pool, hospitalId, limit = 40) {
    const res = await db.query(
      `SELECT
         s.id, s.status, s.severity, s.note, s.created_at, s.accepted_at,
         ST_Y(s.location::geometry) AS latitude,
         ST_X(s.location::geometry) AS longitude,
         u.name AS patient_name,
         a.call_sign AS ambulance_call_sign,
         a.vehicle_no AS ambulance_vehicle_no
       FROM sos_requests s
       JOIN users u ON u.id = s.patient_id
       LEFT JOIN ambulances a ON a.id = s.accepted_ambulance_id
       WHERE s.destination_hospital_id = $1
          OR a.hospital_id = $1
          OR (
            s.status IN ('OPEN', 'ACCEPTED', 'EN_ROUTE')
            AND ST_DWithin(
              s.location,
              (SELECT location FROM hospitals WHERE id = $1),
              20000
            )
          )
       ORDER BY s.created_at DESC
       LIMIT $2`,
      [hospitalId, limit]
    );
    return res.rows;
  },

  async expireOpen(db = pool) {
    const res = await db.query(
      `UPDATE sos_requests
       SET status = 'EXPIRED', updated_at = NOW()
       WHERE status = 'OPEN' AND expires_at < NOW()
       RETURNING id`
    );
    return res.rowCount;
  },
};
