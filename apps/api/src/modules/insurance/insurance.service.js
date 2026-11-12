import { insuranceRepository } from './insurance.repository.js';
import { AppError } from '../../middleware/error-handler.js';

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

    // Validate insurers exist
    for (const p of policies) {
      if (!p.insurerId) {
        throw new AppError('Each policy needs insurerId', 400, 'INVALID_INSURANCE');
      }
      const insurer = await insuranceRepository.findInsurerById(undefined, p.insurerId);
      if (!insurer || insurer.active === false) {
        throw new AppError(`Unknown insurer: ${p.insurerId}`, 400, 'INSURER_NOT_FOUND');
      }
    }

    // Ensure at most one primary
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
    return rows.map((r) => ({
      insurerId: r.insurer_id,
      code: r.code,
      name: r.name,
      type: r.type,
      cashless: Boolean(r.cashless),
      notes: r.notes,
    }));
  },
};
