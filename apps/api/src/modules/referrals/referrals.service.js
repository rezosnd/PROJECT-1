import { pool } from '../../infra/db.js';
import { referralsRepository } from './referrals.repository.js';
import { insuranceRepository } from '../insurance/insurance.repository.js';
import { parsePatientQrInput } from '../patients/patient-qr.js';
import { bedsService } from '../beds/beds.service.js';
import { AppError } from '../../middleware/error-handler.js';
import { authRepository } from '../auth/auth.repository.js';

function mapPatientForDoctor(user, insurance = [], abha = null) {
  return {
    id: user.id,
    name: user.full_name || user.name,
    email: user.email,
    pictureUrl: user.abha_photo_url || user.picture_url,
    profileComplete: Boolean(user.profile_complete),
    qr: {
      token: user.patient_qr_token,
      imageUrl: user.patient_qr_image_url,
      payload: user.patient_qr_payload,
    },
    profile: {
      fullName: user.full_name || user.name,
      dateOfBirth: user.date_of_birth,
      gender: user.gender,
      bloodGroup: user.blood_group,
      ageYears: user.age_years,
      addressLine: user.address_line,
      cityName: user.city_name,
      pinCode: user.pin_code,
      emergencyContactName: user.emergency_contact_name,
      emergencyContactPhone: user.emergency_contact_phone,
      mobilePhone: user.mobile_phone || user.emergency_contact_phone,
      allergies: user.allergies,
      medicalNotes: user.medical_notes,
    },
    insurance: insurance.map((r) => ({
      insurerId: r.insurer_id,
      insurerCode: r.insurer_code,
      insurerName: r.insurer_name,
      insurerType: r.insurer_type,
      policyNumber: r.policy_number,
      planName: r.plan_name,
      isPrimary: Boolean(r.is_primary),
      validUntil: r.valid_until,
    })),
    abha: abha
      ? {
          linked: true,
          abhaAddress: abha.abha_address,
          maskedNumber: abha.masked_number || null,
        }
      : { linked: false },
  };
}

function mapReferral(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name || row.patient_snapshot?.fullName || null,
    doctorId: row.doctor_id,
    doctorName: row.doctor_name || null,
    doctorSpecialty: row.doctor_specialty || null,
    fromHospitalId: row.from_hospital_id,
    toHospitalId: row.to_hospital_id,
    toHospitalName: row.to_hospital_name || null,
    toDepartmentId: row.to_department_id,
    toDepartmentName: row.to_department_name || null,
    conditionId: row.condition_id,
    conditionName: row.condition_name || null,
    conditionCode: row.condition_code || null,
    urgency: row.urgency,
    reason: row.reason,
    clinicalNotes: row.clinical_notes,
    recommendedWard: row.recommended_ward,
    status: row.status,
    bedRequestId: row.bed_request_id,
    patientSnapshot: row.patient_snapshot,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const referralsService = {
  async getMyPatientQr(patientId) {
    let user = await authRepository.findUserById(pool, patientId);
    if (!user || user.role !== 'PATIENT') {
      throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
    }
    user = await referralsRepository.ensurePatientQr(pool, user);
    return {
      patientId: user.id,
      token: user.patient_qr_token,
      payload: user.patient_qr_payload,
      imageUrl: user.patient_qr_image_url,
    };
  },

  async scanPatient(qrPayload) {
    const parsed = parsePatientQrInput(qrPayload);
    if (!parsed || (!parsed.patientId && !parsed.token)) {
      throw new AppError('Invalid patient QR. Ask the patient to open Profile → Care QR.', 400, 'INVALID_PATIENT_QR');
    }

    let user = await referralsRepository.findPatientByQr(pool, parsed);
    if (!user) {
      throw new AppError('No active patient found for this QR', 404, 'PATIENT_NOT_FOUND');
    }
    user = await referralsRepository.ensurePatientQr(pool, user);

    const insurance = await insuranceRepository.listPatientInsurance(pool, user.id);

    let abha = null;
    try {
      const { rows } = await pool.query(
        `SELECT abha_address, meta->>'maskedNumber' AS masked_number
         FROM abha_links WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [user.id]
      );
      abha = rows[0] || null;
    } catch {
      abha = null;
    }

    return mapPatientForDoctor(user, insurance, abha);
  },

  async listDepartments(hospitalId) {
    const rows = await referralsRepository.listDepartments(pool, hospitalId);
    return rows.map((d) => ({
      id: d.id,
      hospitalId: d.hospital_id,
      code: d.code,
      name: d.name,
      specialty: d.specialty,
      wardHint: d.ward_hint,
    }));
  },

  async createReferral(doctor, body) {
    if (doctor.role !== 'DOCTOR') {
      throw new AppError('Only doctors can create referrals', 403, 'FORBIDDEN');
    }

    const patient = await authRepository.findUserById(pool, body.patientId);
    if (!patient || patient.role !== 'PATIENT' || patient.status !== 'ACTIVE') {
      throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
    }

    const { rows: hospitalRows } = await pool.query(
      `SELECT id, name, status FROM hospitals WHERE id = $1`,
      [body.toHospitalId]
    );
    const hospital = hospitalRows[0];
    if (!hospital || hospital.status !== 'VERIFIED') {
      throw new AppError('Destination hospital is not available', 400, 'HOSPITAL_UNAVAILABLE');
    }

    let department = null;
    if (body.toDepartmentId) {
      department = await referralsRepository.findDepartment(pool, body.toDepartmentId);
      if (!department || department.hospital_id !== body.toHospitalId) {
        throw new AppError('Department does not belong to selected hospital', 400, 'INVALID_DEPARTMENT');
      }
    }

    const insurance = await insuranceRepository.listPatientInsurance(pool, patient.id);
    const patientSnapshot = {
      fullName: patient.full_name || patient.name,
      gender: patient.gender,
      bloodGroup: patient.blood_group,
      ageYears: patient.age_years,
      mobilePhone: patient.mobile_phone || patient.emergency_contact_phone,
      allergies: patient.allergies,
      medicalNotes: patient.medical_notes,
      emergencyContactName: patient.emergency_contact_name,
      emergencyContactPhone: patient.emergency_contact_phone,
      insurance: insurance.map((i) => ({
        insurerId: i.insurer_id,
        insurerName: i.insurer_name,
        policyNumber: i.policy_number,
        isPrimary: i.is_primary,
      })),
      referredBy: {
        doctorId: doctor.id,
        doctorName: doctor.name,
        specialty: doctor.doctorSpecialty || doctor.doctor_specialty || null,
      },
    };

    const ward =
      body.recommendedWard ||
      department?.ward_hint ||
      (body.urgency === 'CRITICAL' ? 'ICU' : 'EMERGENCY');

    let bedRequestId = null;
    let status = 'SENT';

    if (body.createHold !== false) {
      try {
        const hold = await bedsService.createBedRequest({
          patientId: patient.id,
          hospitalId: body.toHospitalId,
          wardType: ward,
          urgency: body.urgency || 'NORMAL',
          conditionId: body.conditionId || null,
          note: [
            `Doctor referral: ${body.reason || 'Clinical transfer'}`,
            body.clinicalNotes ? `Notes: ${body.clinicalNotes}` : null,
            department ? `Dept: ${department.name}` : null,
          ]
            .filter(Boolean)
            .join(' | '),
          shareAbha: Boolean(body.shareAbha),
          idempotencyKey: `referral:${doctor.id}:${patient.id}:${body.toHospitalId}:${Date.now()}`,
        });
        bedRequestId = hold?.id || null;
        status = bedRequestId ? 'HOLD_CREATED' : 'SENT';
      } catch {
        // Referral still succeeds even if hold cannot be placed (no free beds)
        status = 'SENT';
      }
    }

    const created = await referralsRepository.createReferral(pool, {
      patientId: patient.id,
      doctorId: doctor.id,
      fromHospitalId: doctor.hospitalId || doctor.hospital_id || null,
      toHospitalId: body.toHospitalId,
      toDepartmentId: body.toDepartmentId || null,
      conditionId: body.conditionId || null,
      urgency: body.urgency || 'NORMAL',
      reason: body.reason || null,
      clinicalNotes: body.clinicalNotes || null,
      recommendedWard: ward,
      status,
      bedRequestId,
      patientSnapshot,
    });

    const full = await referralsRepository.getReferralById(pool, created.id);
    return mapReferral(full || created);
  },

  async listMineAsDoctor(doctorId) {
    const rows = await referralsRepository.listByDoctor(pool, doctorId);
    return rows.map(mapReferral);
  },

  async listMineAsPatient(patientId) {
    const rows = await referralsRepository.listByPatient(pool, patientId);
    return rows.map(mapReferral);
  },

  async listForHospital(hospitalId) {
    const rows = await referralsRepository.listByHospital(pool, hospitalId);
    return rows.map(mapReferral);
  },

  async getById(id, requester) {
    const row = await referralsRepository.getReferralById(pool, id);
    if (!row) throw new AppError('Referral not found', 404, 'REFERRAL_NOT_FOUND');

    const allowed =
      requester.role === 'CITY_ADMIN' ||
      requester.id === row.doctor_id ||
      requester.id === row.patient_id ||
      ((requester.role === 'HOSPITAL_ADMIN' || requester.role === 'HOSPITAL_STAFF') &&
        requester.hospitalId === row.to_hospital_id);

    if (!allowed) throw new AppError('Forbidden', 403, 'FORBIDDEN');
    return mapReferral(row);
  },
};
