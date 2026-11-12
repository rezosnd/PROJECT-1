import { pool } from '../../infra/db.js';

export const bloodRepository = {
  async getHospitalBloodMeta(db = pool, hospitalId) {
    const { rows } = await db.query(
      `SELECT id, name, address, city, phone, has_blood_bank, blood_bank_phone, blood_bank_hours,
              facilities, status,
              ST_Y(location::geometry) AS latitude,
              ST_X(location::geometry) AS longitude
       FROM hospitals WHERE id = $1`,
      [hospitalId]
    );
    return rows[0] || null;
  },

  async listInventory(db = pool, hospitalId) {
    const { rows } = await db.query(
      `SELECT *,
              GREATEST(0, units_total - units_reserved - units_quarantine) AS units_available
       FROM blood_inventory
       WHERE hospital_id = $1
       ORDER BY blood_group, component`,
      [hospitalId]
    );
    return rows;
  },

  async upsertInventoryRow(db = pool, {
    hospitalId,
    bloodGroup,
    component,
    unitsTotal,
    unitsReserved,
    unitsQuarantine,
    expiringWithin7d,
  }) {
    const { rows } = await db.query(
      `INSERT INTO blood_inventory (
         hospital_id, blood_group, component, units_total, units_reserved,
         units_quarantine, expiring_within_7d, version, updated_at
       ) VALUES ($1,$2,$3,$4,COALESCE($5,0),COALESCE($6,0),COALESCE($7,0),1,NOW())
       ON CONFLICT (hospital_id, blood_group, component)
       DO UPDATE SET
         units_total = EXCLUDED.units_total,
         units_reserved = COALESCE($5, blood_inventory.units_reserved),
         units_quarantine = COALESCE($6, blood_inventory.units_quarantine),
         expiring_within_7d = COALESCE($7, blood_inventory.expiring_within_7d),
         version = blood_inventory.version + 1,
         updated_at = NOW()
       RETURNING *,
         GREATEST(0, units_total - units_reserved - units_quarantine) AS units_available`,
      [
        hospitalId,
        bloodGroup,
        component,
        unitsTotal,
        unitsReserved ?? null,
        unitsQuarantine ?? null,
        expiringWithin7d ?? null,
      ]
    );
    return rows[0];
  },

  async lockStock(db, hospitalId, bloodGroup, component) {
    const { rows } = await db.query(
      `SELECT *,
              GREATEST(0, units_total - units_reserved - units_quarantine) AS units_available
       FROM blood_inventory
       WHERE hospital_id = $1 AND blood_group = $2 AND component = $3
       FOR UPDATE`,
      [hospitalId, bloodGroup, component]
    );
    return rows[0] || null;
  },

  async adjustReserved(db, id, deltaReserved, deltaTotal = 0) {
    const { rows } = await db.query(
      `UPDATE blood_inventory
       SET units_reserved = GREATEST(0, units_reserved + $2),
           units_total = GREATEST(0, units_total + $3),
           version = version + 1,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *,
         GREATEST(0, units_total - units_reserved - units_quarantine) AS units_available`,
      [id, deltaReserved, deltaTotal]
    );
    return rows[0];
  },

  async setHospitalBloodBank(db = pool, hospitalId, { hasBloodBank, bloodBankPhone, bloodBankHours }) {
    const { rows } = await db.query(
      `UPDATE hospitals SET
         has_blood_bank = COALESCE($2, has_blood_bank),
         blood_bank_phone = COALESCE($3, blood_bank_phone),
         blood_bank_hours = COALESCE($4, blood_bank_hours),
         facilities = CASE
           WHEN $2 IS TRUE AND NOT ('Blood Bank' = ANY(COALESCE(facilities, ARRAY[]::text[])))
             THEN array_append(COALESCE(facilities, ARRAY[]::text[]), 'Blood Bank')
           WHEN $2 IS FALSE
             THEN array_remove(COALESCE(facilities, ARRAY[]::text[]), 'Blood Bank')
           ELSE facilities
         END,
         updated_at = NOW()
       WHERE id = $1
       RETURNING id, has_blood_bank, blood_bank_phone, blood_bank_hours, facilities`,
      [hospitalId, hasBloodBank ?? null, bloodBankPhone ?? null, bloodBankHours ?? null]
    );
    return rows[0];
  },

  async searchBloodBanks(db = pool, { bloodGroup, component, lat, lng, radiusKm = 25, limit = 20 }) {
    const radiusMeters = radiusKm * 1000;
    const params = [lat, lng, radiusMeters, limit];
    let stockFilter = '';
    if (bloodGroup) {
      params.push(bloodGroup);
      const bgIdx = params.length;
      if (component) {
        params.push(component);
        stockFilter = `
          AND EXISTS (
            SELECT 1 FROM blood_inventory bi
            WHERE bi.hospital_id = h.id
              AND bi.blood_group = $${bgIdx}
              AND bi.component = $${params.length}
              AND (bi.units_total - bi.units_reserved - bi.units_quarantine) > 0
          )`;
      } else {
        stockFilter = `
          AND EXISTS (
            SELECT 1 FROM blood_inventory bi
            WHERE bi.hospital_id = h.id
              AND bi.blood_group = $${bgIdx}
              AND (bi.units_total - bi.units_reserved - bi.units_quarantine) > 0
          )`;
      }
    }

    const { rows } = await db.query(
      `SELECT
         h.id, h.name, h.address, h.city, h.phone, h.type, h.rating_avg,
         h.has_blood_bank, h.blood_bank_phone, h.blood_bank_hours, h.photo_url,
         ST_Y(h.location::geometry) AS latitude,
         ST_X(h.location::geometry) AS longitude,
         ST_Distance(h.location, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) AS distance_meters,
         COALESCE((
           SELECT json_agg(json_build_object(
             'bloodGroup', bi.blood_group,
             'component', bi.component,
             'unitsTotal', bi.units_total,
             'unitsReserved', bi.units_reserved,
             'unitsQuarantine', bi.units_quarantine,
             'unitsAvailable', GREATEST(0, bi.units_total - bi.units_reserved - bi.units_quarantine),
             'expiringWithin7d', bi.expiring_within_7d
           ) ORDER BY bi.blood_group, bi.component)
           FROM blood_inventory bi WHERE bi.hospital_id = h.id
         ), '[]'::json) AS stock
       FROM hospitals h
       WHERE h.status = 'VERIFIED'
         AND h.has_blood_bank = TRUE
         AND ST_DWithin(h.location, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)
         ${stockFilter}
       ORDER BY distance_meters ASC
       LIMIT $4`,
      params
    );
    return rows;
  },

  async createRequest(db, row) {
    const { rows } = await db.query(
      `INSERT INTO blood_requests (
         patient_id, hospital_id, blood_group, component, units_requested,
         urgency, reason, doctor_name, note, status, hold_expires_at,
         patient_snapshot, idempotency_key
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13)
       RETURNING *`,
      [
        row.patientId,
        row.hospitalId,
        row.bloodGroup,
        row.component,
        row.unitsRequested,
        row.urgency,
        row.reason || null,
        row.doctorName || null,
        row.note || null,
        row.status || 'PENDING',
        row.holdExpiresAt,
        JSON.stringify(row.patientSnapshot || {}),
        row.idempotencyKey || null,
      ]
    );
    return rows[0];
  },

  async findRequestById(db = pool, id) {
    const { rows } = await db.query(
      `SELECT br.*,
              h.name AS hospital_name, h.address AS hospital_address, h.phone AS hospital_phone,
              h.blood_bank_phone,
              u.full_name AS patient_name, u.email AS patient_email, u.blood_group AS patient_blood_group
       FROM blood_requests br
       JOIN hospitals h ON h.id = br.hospital_id
       JOIN users u ON u.id = br.patient_id
       WHERE br.id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async listPatientRequests(db = pool, patientId) {
    const { rows } = await db.query(
      `SELECT br.*,
              h.name AS hospital_name, h.address AS hospital_address, h.phone AS hospital_phone,
              h.blood_bank_phone
       FROM blood_requests br
       JOIN hospitals h ON h.id = br.hospital_id
       WHERE br.patient_id = $1
       ORDER BY br.created_at DESC
       LIMIT 100`,
      [patientId]
    );
    return rows;
  },

  async listHospitalRequests(db = pool, hospitalId) {
    const { rows } = await db.query(
      `SELECT br.*,
              u.full_name AS patient_name, u.email AS patient_email,
              u.blood_group AS patient_blood_group,
              u.mobile_phone AS patient_mobile,
              u.emergency_contact_name, u.emergency_contact_phone
       FROM blood_requests br
       JOIN users u ON u.id = br.patient_id
       WHERE br.hospital_id = $1
       ORDER BY
         CASE br.status WHEN 'PENDING' THEN 0 WHEN 'APPROVED' THEN 1 ELSE 2 END,
         br.created_at DESC
       LIMIT 200`,
      [hospitalId]
    );
    return rows;
  },

  async updateRequestStatus(db, id, patch) {
    const { rows } = await db.query(
      `UPDATE blood_requests SET
         status = COALESCE($2, status),
         decided_by = COALESCE($3, decided_by),
         decided_at = COALESCE($4, decided_at),
         decision_reason = COALESCE($5, decision_reason),
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        patch.status || null,
        patch.decidedBy || null,
        patch.decidedAt || null,
        patch.decisionReason || null,
      ]
    );
    return rows[0];
  },

  async expireOverdue(db = pool) {
    const { rows } = await db.query(
      `UPDATE blood_requests
       SET status = 'EXPIRED', updated_at = NOW()
       WHERE status = 'PENDING'
         AND hold_expires_at IS NOT NULL
         AND hold_expires_at < NOW()
       RETURNING id, hospital_id, blood_group, component, units_requested`
    );
    return rows;
  },
};
