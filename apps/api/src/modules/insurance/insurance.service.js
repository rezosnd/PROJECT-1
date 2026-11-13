import { insuranceRepository } from './insurance.repository.js';
import { AppError } from '../../middleware/error-handler.js';
import { pool } from '../../infra/db.js';

function mapInsurer(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
    logoUrl: row.logo_url || null,
    active: row.active !== false,
  };
}

function mapPatientPolicy(row) {
  return {
    id: row.id,
    insurerId: row.insurer_id,
    insurerCode: row.insurer_code,
    insurerName: row.insurer_name,
    insurerType: row.insurer_type,
    policyNumber: row.policy_number,
    memberId: row.member_id,
    planName: row.plan_name,
    validUntil: row.valid_until,
    isPrimary: Boolean(row.is_primary),
  };
}

function parseBenefits(raw) {
  if (Array.isArray(raw)) return raw.filter((b) => typeof b === 'string' && b.trim());
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((b) => typeof b === 'string' && b.trim()) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapHospitalNetwork(row) {
  return {
    insurerId: row.insurer_id,
    code: row.code,
    name: row.name,
    type: row.type,
    logoUrl: row.logo_url || null,
    active: row.active !== false,
    cashless: Boolean(row.cashless),
    discountPercent: Number(row.discount_percent) || 0,
    benefits: parseBenefits(row.benefits),
    planLabel: row.plan_label || null,
    notes: row.notes || null,
  };
}

async function assertHospitalAccess(actor, hospitalId) {
  if (!actor) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }
  if (actor.role === 'CITY_ADMIN') return;
  if (
    (actor.role === 'HOSPITAL_ADMIN' || actor.role === 'HOSPITAL_STAFF') &&
    actor.hospitalId === hospitalId
  ) {
    return;
  }
  throw new AppError('Tenant access denied for hospital insurance network', 403, 'TENANT_ACCESS_DENIED');
}

export const insuranceService = {
  async listInsurers() {
    const rows = await insuranceRepository.listInsurers();
    return rows.map(mapInsurer);
  },

  async getMyInsurance(patientId) {
    const rows = await insuranceRepository.listPatientInsurance(undefined, patientId);
    return rows.map(mapPatientPolicy);
  },

  async saveMyInsurance(patientId, policies = []) {
    if (!Array.isArray(policies)) {
      throw new AppError('Insurance policies must be an array', 400, 'INVALID_INSURANCE');
    }

    for (const p of policies) {
      if (!p.insurerId) {
        throw new AppError('Each policy needs insurerId', 400, 'INVALID_INSURANCE');
      }
      const insurer = await insuranceRepository.findInsurerById(undefined, p.insurerId);
      if (!insurer || insurer.active === false) {
        throw new AppError(`Unknown insurer: ${p.insurerId}`, 400, 'INSURER_NOT_FOUND');
      }
    }

    let seenPrimary = false;
    const normalized = policies.map((p, idx) => {
      let isPrimary = Boolean(p.isPrimary);
      if (isPrimary && seenPrimary) isPrimary = false;
      if (isPrimary) seenPrimary = true;
      if (!seenPrimary && idx === 0) {
        isPrimary = true;
        seenPrimary = true;
      }
      return { ...p, isPrimary };
    });

    await insuranceRepository.replacePatientInsurance(undefined, patientId, normalized);
    return this.getMyInsurance(patientId);
  },

  async getHospitalInsurers(hospitalId) {
    const rows = await insuranceRepository.listHospitalInsurers(undefined, hospitalId);
    return rows.map(mapHospitalNetwork);
  },

  async saveHospitalInsurers(hospitalId, networks = [], actor) {
    await assertHospitalAccess(actor, hospitalId);

    const { rows: hospitalRows } = await pool.query(
      'SELECT id FROM hospitals WHERE id = $1',
      [hospitalId]
    );
    if (!hospitalRows[0]) {
      throw new AppError('Hospital not found', 404, 'HOSPITAL_NOT_FOUND');
    }

    if (!Array.isArray(networks)) {
      throw new AppError('networks must be an array', 400, 'INVALID_NETWORK');
    }

    const normalized = [];
    const seen = new Set();
    for (const n of networks) {
      if (!n?.insurerId) {
        throw new AppError('Each network entry needs insurerId', 400, 'INVALID_NETWORK');
      }
      if (seen.has(n.insurerId)) continue;
      seen.add(n.insurerId);

      const insurer = await insuranceRepository.findInsurerById(undefined, n.insurerId);
      if (!insurer || insurer.active === false) {
        throw new AppError(`Unknown insurer: ${n.insurerId}`, 400, 'INSURER_NOT_FOUND');
      }

      const benefits = Array.isArray(n.benefits)
        ? n.benefits.map((b) => String(b).trim()).filter(Boolean).slice(0, 24)
        : [];

      normalized.push({
        insurerId: n.insurerId,
        cashless: n.cashless !== false,
        discountPercent: Math.min(100, Math.max(0, Number(n.discountPercent) || 0)),
        benefits,
        planLabel: n.planLabel ? String(n.planLabel).trim() : null,
        notes: n.notes ? String(n.notes).trim() : null,
      });
    }

    const rows = await insuranceRepository.setHospitalInsurers(undefined, hospitalId, normalized);
    return rows.map(mapHospitalNetwork);
  },

  async listDoctorsDirectory(limit = 40) {
    const rows = await insuranceRepository.listDoctorsDirectory(undefined, { limit });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      specialty: r.doctor_specialty || 'General Medicine',
      qualification: r.doctor_qualification || null,
      degrees: r.doctor_degrees || null,
      experienceYears:
        r.doctor_experience_years != null ? Number(r.doctor_experience_years) : null,
      bio: r.doctor_bio || null,
      licenseNo: r.doctor_license_no || null,
      consultationFee:
        r.doctor_consultation_fee != null ? Number(r.doctor_consultation_fee) : null,
      clinicName: r.doctor_clinic_name || null,
      profileComplete: Boolean(r.doctor_profile_complete),
      pictureUrl: r.picture_url || r.hospital_photo || null,
      hospitalId: r.hospital_id || null,
      hospitalName: r.hospital_name || r.doctor_clinic_name || null,
      hospitalAddress: r.hospital_address || null,
      city: r.hospital_city || null,
      phone: r.doctor_phone || r.hospital_phone || null,
      latitude: r.latitude != null ? Number(r.latitude) : null,
      longitude: r.longitude != null ? Number(r.longitude) : null,
      ratingAvg: r.rating_avg != null ? Number(r.rating_avg) : null,
    }));
  },
};
