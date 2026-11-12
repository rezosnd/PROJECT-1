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
              i.code, i.name, i.type
       FROM hospital_insurers hi
       JOIN insurers i ON i.id = hi.insurer_id
       WHERE hi.hospital_id = $1
       ORDER BY i.name ASC`,
      [hospitalId]
    );
    return rows;
  },

  async setHospitalInsurers(db = pool, hospitalId, insurerIds = [], { cashless = true } = {}) {
    await db.query('DELETE FROM hospital_insurers WHERE hospital_id = $1', [hospitalId]);
    for (const insurerId of insurerIds) {
      await db.query(
        `INSERT INTO hospital_insurers (hospital_id, insurer_id, cashless)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [hospitalId, insurerId, cashless]
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
};
