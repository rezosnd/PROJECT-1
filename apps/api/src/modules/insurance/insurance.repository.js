import { pool } from '../../infra/db.js';

export const insuranceRepository = {
  async listInsurers(db = pool, { activeOnly = true } = {}) {
    const { rows } = await db.query(
      `SELECT id, code, name, type, logo_url, active, created_at
       FROM insurers
       WHERE ($1::boolean IS FALSE OR active = TRUE)
       ORDER BY type ASC, name ASC`,
      [activeOnly]
    );
    return rows;
  },

  async findInsurerById(db = pool, id) {
    const { rows } = await db.query('SELECT * FROM insurers WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async findInsurerByCode(db = pool, code) {
    const { rows } = await db.query('SELECT * FROM insurers WHERE code = $1', [code]);
    return rows[0] || null;
  },

  async listPatientInsurance(db = pool, patientId) {
    const { rows } = await db.query(
      `SELECT pi.*, i.code AS insurer_code, i.name AS insurer_name, i.type AS insurer_type
       FROM patient_insurance pi
       JOIN insurers i ON i.id = pi.insurer_id
       WHERE pi.patient_id = $1
       ORDER BY pi.is_primary DESC, i.name ASC`,
      [patientId]
    );
    return rows;
  },

  async replacePatientInsurance(db = pool, patientId, policies = []) {
    await db.query('DELETE FROM patient_insurance WHERE patient_id = $1', [patientId]);
    if (!policies.length) return [];

    const inserted = [];
    for (const p of policies) {
      const { rows } = await db.query(
        `INSERT INTO patient_insurance
           (patient_id, insurer_id, policy_number, member_id, plan_name, valid_until, is_primary, meta)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
         RETURNING *`,
        [
          patientId,
          p.insurerId,
          p.policyNumber || null,
          p.memberId || null,
          p.planName || null,
          p.validUntil || null,
          Boolean(p.isPrimary),
          JSON.stringify(p.meta || {}),
        ]
      );
      inserted.push(rows[0]);
    }
    return inserted;
  },

  async listHospitalInsurers(db = pool, hospitalId) {
    const { rows } = await db.query(
      `SELECT hi.hospital_id, hi.insurer_id, hi.cashless, hi.notes,
              hi.discount_percent, hi.benefits, hi.plan_label, hi.updated_at,
              i.code, i.name, i.type, i.logo_url, i.active
       FROM hospital_insurers hi
       JOIN insurers i ON i.id = hi.insurer_id
       WHERE hi.hospital_id = $1
       ORDER BY i.type ASC, i.name ASC`,
      [hospitalId]
    );
    return rows;
  },

  async setHospitalInsurers(db = pool, hospitalId, networks = []) {
    await db.query('DELETE FROM hospital_insurers WHERE hospital_id = $1', [hospitalId]);
    for (const n of networks) {
      const benefits = Array.isArray(n.benefits) ? n.benefits : [];
      await db.query(
        `INSERT INTO hospital_insurers
           (hospital_id, insurer_id, cashless, notes, discount_percent, benefits, plan_label, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, NOW())
         ON CONFLICT (hospital_id, insurer_id) DO UPDATE SET
           cashless = EXCLUDED.cashless,
           notes = EXCLUDED.notes,
           discount_percent = EXCLUDED.discount_percent,
           benefits = EXCLUDED.benefits,
           plan_label = EXCLUDED.plan_label,
           updated_at = NOW()`,
        [
          hospitalId,
          n.insurerId,
          n.cashless !== false,
          n.notes || null,
          Number(n.discountPercent) || 0,
          JSON.stringify(benefits),
          n.planLabel || null,
        ]
      );
    }
    return this.listHospitalInsurers(db, hospitalId);
  },

  async getAcceptedInsurerIdsForHospitals(db = pool, hospitalIds = []) {
    if (!hospitalIds.length) return new Map();
    const { rows } = await db.query(
      `SELECT hospital_id, array_agg(insurer_id::text) AS insurer_ids
       FROM hospital_insurers
       WHERE hospital_id = ANY($1::uuid[])
       GROUP BY hospital_id`,
      [hospitalIds]
    );
    const map = new Map();
    for (const r of rows) {
      map.set(r.hospital_id, new Set(r.insurer_ids || []));
    }
    return map;
  },

  async listDoctorsDirectory(db = pool, { limit = 40 } = {}) {
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.email, u.picture_url, u.doctor_specialty, u.doctor_license_no,
              u.hospital_id, h.name AS hospital_name, h.address AS hospital_address,
              h.city AS hospital_city, h.phone AS hospital_phone,
              h.latitude, h.longitude, h.rating_avg, h.photo_url AS hospital_photo
       FROM users u
       LEFT JOIN hospitals h ON h.id = u.hospital_id
       WHERE u.role = 'DOCTOR' AND u.status = 'ACTIVE'
       ORDER BY u.doctor_specialty NULLS LAST, u.name ASC
       LIMIT $1`,
      [Math.min(Math.max(limit, 1), 100)]
    );
    return rows;
  },
};
