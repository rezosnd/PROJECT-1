import { pool } from '../../infra/db.js';

export const bedsRepository = {
  /**
   * Free beds are strictly derived in queries (total - occupied - reserved - cleaning - maintenance)
   */
  async getHospitalBedInventory(db = pool, hospitalId) {
    const { rows } = await db.query(
      `SELECT id, hospital_id, ward_type, total, occupied, reserved, cleaning, maintenance,
              has_ventilator_beds,
              (total - occupied - reserved - cleaning - maintenance) AS free,
              version, updated_at
       FROM bed_inventory
       WHERE hospital_id = $1
       ORDER BY ward_type ASC`,
      [hospitalId]
    );
    return rows;
  },

  /**
   * Distributed Systems Note: Pessimistic Row Lock (SELECT ... FOR UPDATE).
   * Serializes concurrent bed allocations on the exact ward row at the PostgreSQL storage engine.
   */
  async lockWardForUpdate(client, hospitalId, wardType) {
    const { rows } = await client.query(
      `SELECT id, hospital_id, ward_type, total, occupied, reserved, cleaning, maintenance,
              has_ventilator_beds,
              (total - occupied - reserved - cleaning - maintenance) AS free,
              version
       FROM bed_inventory
       WHERE hospital_id = $1 AND ward_type = $2
       FOR UPDATE`,
      [hospitalId, wardType]
    );
    return rows[0] || null;
  },

  async updateWardCounters(client, { id, total, occupied, reserved, cleaning, maintenance, hasVentilatorBeds }) {
    const { rows } = await client.query(
      `UPDATE bed_inventory
       SET total = $2,
           occupied = $3,
           reserved = $4,
           cleaning = $5,
           maintenance = $6,
           has_ventilator_beds = COALESCE($7, has_ventilator_beds),
           version = version + 1,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, hospital_id, ward_type, total, occupied, reserved, cleaning, maintenance,
                 has_ventilator_beds,
                 (total - occupied - reserved - cleaning - maintenance) AS free,
                 version, updated_at`,
      [id, total, occupied, reserved, cleaning, maintenance, hasVentilatorBeds]
    );
    return rows[0] || null;
  },

  async appendLedgerEntry(client, { hospitalId, wardType, field, delta, reason, actorId }) {
    await client.query(
      `INSERT INTO bed_ledger (hospital_id, ward_type, field, delta, reason, actor_id, at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [hospitalId, wardType, field, delta, reason, actorId]
    );
  },

  /**
   * Tracks hourly admissions and discharges for predictive models
   */
  async recordFlowHourly(client, { hospitalId, wardType, deltaAdmissions = 0, deltaDischarges = 0 }) {
    await client.query(
      `INSERT INTO bed_flow_hourly (hospital_id, ward_type, hour_start, admissions, discharges)
       VALUES ($1, $2, date_trunc('hour', NOW()), $3, $4)
       ON CONFLICT (hospital_id, ward_type, hour_start)
       DO UPDATE SET
         admissions = bed_flow_hourly.admissions + EXCLUDED.admissions,
         discharges = bed_flow_hourly.discharges + EXCLUDED.discharges`,
      [hospitalId, wardType, Math.max(0, deltaAdmissions), Math.max(0, deltaDischarges)]
    );
  },

  async insertSnapshot(client, { hospitalId, wardType, total, occupied, reserved, free }) {
    await client.query(
      `INSERT INTO bed_snapshots (hospital_id, ward_type, at, total, occupied, reserved, free)
       VALUES ($1, $2, NOW(), $3, $4, $5, $6)`,
      [hospitalId, wardType, total, occupied, reserved, free]
    );
  },

  async insertExpectedDischarges(client, { hospitalId, wardType, expectedAtList }) {
    for (const exp of expectedAtList) {
      await client.query(
        `INSERT INTO expected_discharges (hospital_id, ward_type, expected_at)
         VALUES ($1, $2, $3)`,
        [hospitalId, wardType, exp]
      );
    }
  },

  // --- BED REQUESTS ---

  async createBedRequest(client, {
    patientId,
    hospitalId,
    wardType,
    urgency,
    conditionId,
    note,
    shareAbha,
    holdExpiresAt,
    idempotencyKey,
    patientSnapshot = null
  }) {
    const { rows } = await client.query(
      `INSERT INTO bed_requests (
        patient_id, hospital_id, ward_type, urgency, condition_id,
        note, share_abha, status, hold_expires_at, idempotency_key, patient_snapshot
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, $9, $10)
      RETURNING *`,
      [
        patientId, hospitalId, wardType, urgency, conditionId || null,
        note || null, shareAbha || false, holdExpiresAt, idempotencyKey,
        patientSnapshot ? JSON.stringify(patientSnapshot) : null
      ]
    );
    return rows[0];
  },

  async findBedRequestById(db = pool, id) {
    const { rows } = await db.query(
      `SELECT br.*, h.name as hospital_name
       FROM bed_requests br
       JOIN hospitals h ON br.hospital_id = h.id
       WHERE br.id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async findBedRequestByIdForUpdate(client, id) {
    const { rows } = await client.query(
      `SELECT * FROM bed_requests WHERE id = $1 FOR UPDATE`,
      [id]
    );
    return rows[0] || null;
  },

  async findBedRequestsByPatient(db = pool, patientId) {
    const { rows } = await db.query(
      `SELECT br.id, br.hospital_id, h.name as hospital_name, br.ward_type, br.urgency,
              br.status, br.hold_expires_at, br.created_at, br.reason,
              GREATEST(0, ROUND(EXTRACT(EPOCH FROM (br.hold_expires_at - NOW())))) as remaining_seconds
       FROM bed_requests br
       JOIN hospitals h ON br.hospital_id = h.id
       WHERE br.patient_id = $1
       ORDER BY br.created_at DESC`,
      [patientId]
    );
    return rows;
  },

  /**
   * Retrieves hospital bed requests.
   * If patient opted to share ABHA, returns masked ABHA number and verified legal name.
   */
  async findBedRequestsByHospital(db = pool, hospitalId, status = null) {
    const conditions = ['br.hospital_id = $1'];
    const values = [hospitalId];

    if (status) {
      conditions.push('br.status = $2');
      values.push(status);
    }

    const { rows } = await db.query(
      `SELECT br.id, br.patient_id, br.hospital_id, u.name as patient_name, u.email as patient_email,
              br.ward_type, br.urgency, br.condition_id, br.note, br.share_abha,
              br.status, br.hold_expires_at, br.created_at, br.patient_snapshot,
              u.blood_group, u.gender, u.age_years, u.emergency_contact_name, u.emergency_contact_phone,
              u.allergies, u.city_name, u.address_line,
              GREATEST(0, ROUND(EXTRACT(EPOCH FROM (br.hold_expires_at - NOW())))) as remaining_seconds,
              al.abha_address,
              al.name as abha_verified_name,
              al.abha_number_enc,
              al.status as abha_status,
              CASE
                WHEN br.share_abha = true AND al.status = 'LINKED' THEN
                  json_build_object(
                    'maskedNumber', CONCAT('**-****-****-', RIGHT(al.abha_address, 4)),
                    'abhaAddress', al.abha_address,
                    'verifiedName', al.name
                  )
                ELSE NULL
              END as abha
       FROM bed_requests br
       JOIN users u ON br.patient_id = u.id
       LEFT JOIN abha_links al ON br.patient_id = al.user_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY
         CASE br.urgency WHEN 'CRITICAL' THEN 1 WHEN 'URGENT' THEN 2 ELSE 3 END,
         br.created_at ASC`,
      values
    );
    return rows;
  },

  async updateBedRequestStatus(client, id, { status, decidedBy, reason }) {
    const { rows } = await client.query(
      `UPDATE bed_requests
       SET status = $2,
           decided_by = COALESCE($3, decided_by),
           reason = COALESCE($4, reason),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status, decidedBy, reason]
    );
    return rows[0] || null;
  },

  async findExpiredPendingRequests(client) {
    const { rows } = await client.query(
      `SELECT id, hospital_id, ward_type, patient_id
       FROM bed_requests
       WHERE status = 'PENDING' AND hold_expires_at < NOW()
       FOR UPDATE SKIP LOCKED`
    );
    return rows;
  },

  /**
   * City-wide aggregated inventory summary for municipal monitoring
   */
  async getCitySummary(db = pool) {
    const { rows } = await db.query(
      `SELECT h.id as hospital_id, h.name as hospital_name, h.type, h.trauma_level,
              bi.ward_type, bi.total, bi.occupied, bi.reserved, bi.cleaning, bi.maintenance,
              bi.has_ventilator_beds,
              (bi.total - bi.occupied - bi.reserved - bi.cleaning - bi.maintenance) as free
       FROM bed_inventory bi
       JOIN hospitals h ON bi.hospital_id = h.id
       WHERE h.status = 'VERIFIED'
       ORDER BY h.name ASC, bi.ward_type ASC`
    );
    return rows;
  }
};
