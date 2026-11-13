import crypto from 'node:crypto';
import { pool } from '../../infra/db.js';

export const referralsRepository = {
  async findPatientByQr(db = pool, { patientId, token }) {
    const { isUuid } = await import('../patients/patient-qr.js');
    const id = isUuid(patientId) ? String(patientId).trim() : null;
    const tok = isUuid(token) ? String(token).trim() : null;
    if (!id && !tok) return null;

    const { rows } = await db.query(
      `SELECT id, google_sub, email, name, picture_url, abha_photo_url, mobile_phone, role, hospital_id, status,
              profile_complete, full_name, date_of_birth, gender, blood_group, age_years,
              address_line, city_name, pin_code, emergency_contact_name, emergency_contact_phone,
              allergies, medical_notes, preferred_language, profile_completed_at,
              patient_qr_token, patient_qr_payload, patient_qr_image_url
       FROM users
       WHERE role = 'PATIENT'
         AND status = 'ACTIVE'
         AND (
           ($1::uuid IS NOT NULL AND id = $1::uuid)
           OR ($2::uuid IS NOT NULL AND patient_qr_token = $2::uuid)
           OR ($2::uuid IS NOT NULL AND id = $2::uuid)
           OR ($1::uuid IS NOT NULL AND patient_qr_token = $1::uuid)
         )
       LIMIT 1`,
      [id, tok]
    );
    return rows[0] || null;
  },

  async ensurePatientQr(db = pool, user) {
    const payload = String(user.patient_qr_payload || '');
    // Rebuild legacy bulky JSON QRs → compact GMH1 (much more reliable to scan)
    const isCompact = payload.startsWith('GMH1:');
    if (
      user.patient_qr_token &&
      user.patient_qr_payload &&
      user.patient_qr_image_url &&
      isCompact
    ) {
      return user;
    }
    const { buildPatientQrBundle } = await import('../patients/patient-qr.js');
    const token = user.patient_qr_token || crypto.randomUUID();
    const { qrPayload, qrImageUrl } = buildPatientQrBundle({
      patientId: user.id,
      qrToken: token,
    });
    const { rows } = await db.query(
      `UPDATE users
       SET patient_qr_token = COALESCE(patient_qr_token, $2::uuid),
           patient_qr_payload = $3,
           patient_qr_image_url = $4,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [user.id, token, qrPayload, qrImageUrl]
    );
    return rows[0];
  },

  async listDepartments(db = pool, hospitalId) {
    const { rows } = await db.query(
      `SELECT id, hospital_id, code, name, specialty, ward_hint, active
       FROM hospital_departments
       WHERE hospital_id = $1 AND active = TRUE
       ORDER BY name ASC`,
      [hospitalId]
    );
    return rows;
  },

  async findDepartment(db = pool, departmentId) {
    const { rows } = await db.query(
      `SELECT * FROM hospital_departments WHERE id = $1 AND active = TRUE`,
      [departmentId]
    );
    return rows[0] || null;
  },

  async createReferral(db = pool, row) {
    const { rows } = await db.query(
      `INSERT INTO referrals (
         patient_id, doctor_id, from_hospital_id, to_hospital_id, to_department_id,
         condition_id, urgency, reason, clinical_notes, recommended_ward,
         status, bed_request_id, patient_snapshot
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb)
       RETURNING *`,
      [
        row.patientId,
        row.doctorId,
        row.fromHospitalId || null,
        row.toHospitalId,
        row.toDepartmentId || null,
        row.conditionId || null,
        row.urgency || 'NORMAL',
        row.reason || null,
        row.clinicalNotes || null,
        row.recommendedWard || null,
        row.status || 'SENT',
        row.bedRequestId || null,
        JSON.stringify(row.patientSnapshot || {}),
      ]
    );
    return rows[0];
  },

  async updateReferral(db = pool, id, patch) {
    const { rows } = await db.query(
      `UPDATE referrals SET
         status = COALESCE($2, status),
         bed_request_id = COALESCE($3, bed_request_id),
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, patch.status || null, patch.bedRequestId || null]
    );
    return rows[0] || null;
  },

  async getReferralById(db = pool, id) {
    const { rows } = await db.query(
      `SELECT r.*,
              p.full_name AS patient_name, p.email AS patient_email,
              d.name AS doctor_name, d.email AS doctor_email, d.doctor_specialty,
              th.name AS to_hospital_name,
              hd.name AS to_department_name,
              c.name AS condition_name, c.code AS condition_code
       FROM referrals r
       JOIN users p ON p.id = r.patient_id
       JOIN users d ON d.id = r.doctor_id
       JOIN hospitals th ON th.id = r.to_hospital_id
       LEFT JOIN hospital_departments hd ON hd.id = r.to_department_id
       LEFT JOIN conditions c ON c.id = r.condition_id
       WHERE r.id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async listByDoctor(db = pool, doctorId, { limit = 50 } = {}) {
    const { rows } = await db.query(
      `SELECT r.*,
              p.full_name AS patient_name,
              th.name AS to_hospital_name,
              hd.name AS to_department_name
       FROM referrals r
       JOIN users p ON p.id = r.patient_id
       JOIN hospitals th ON th.id = r.to_hospital_id
       LEFT JOIN hospital_departments hd ON hd.id = r.to_department_id
       WHERE r.doctor_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2`,
      [doctorId, limit]
    );
    return rows;
  },

  async listByPatient(db = pool, patientId, { limit = 50 } = {}) {
    const { rows } = await db.query(
      `SELECT r.*,
              d.name AS doctor_name, d.doctor_specialty,
              th.name AS to_hospital_name,
              hd.name AS to_department_name
       FROM referrals r
       JOIN users d ON d.id = r.doctor_id
       JOIN hospitals th ON th.id = r.to_hospital_id
       LEFT JOIN hospital_departments hd ON hd.id = r.to_department_id
       WHERE r.patient_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2`,
      [patientId, limit]
    );
    return rows;
  },

  async listByHospital(db = pool, hospitalId, { limit = 100 } = {}) {
    const { rows } = await db.query(
      `SELECT r.*,
              p.full_name AS patient_name,
              d.name AS doctor_name,
              hd.name AS to_department_name
       FROM referrals r
       JOIN users p ON p.id = r.patient_id
       JOIN users d ON d.id = r.doctor_id
       LEFT JOIN hospital_departments hd ON hd.id = r.to_department_id
       WHERE r.to_hospital_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2`,
      [hospitalId, limit]
    );
    return rows;
  },
};
