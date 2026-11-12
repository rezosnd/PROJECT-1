import { pool, withTransaction } from '../../infra/db.js';
import { bloodRepository } from './blood.repository.js';
import { BLOOD_HOLD_MINUTES, BLOOD_COMPONENTS, COMPATIBLE_DONORS } from './blood.constants.js';
import { AppError } from '../../middleware/error-handler.js';
import { authRepository } from '../auth/auth.repository.js';

function mapStock(row) {
  return {
    id: row.id,
    hospitalId: row.hospital_id,
    bloodGroup: row.blood_group,
    component: row.component,
    unitsTotal: Number(row.units_total || 0),
    unitsReserved: Number(row.units_reserved || 0),
    unitsQuarantine: Number(row.units_quarantine || 0),
    unitsAvailable: Number(
      row.units_available ??
        Math.max(0, Number(row.units_total || 0) - Number(row.units_reserved || 0) - Number(row.units_quarantine || 0))
    ),
    expiringWithin7d: Number(row.expiring_within_7d || 0),
    version: Number(row.version || 1),
    updatedAt: row.updated_at,
  };
}

function mapRequest(row) {
  const snap = row.patient_snapshot || {};
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name || snap.fullName || null,
    patientEmail: row.patient_email || snap.email || null,
    patientBloodGroup: row.patient_blood_group || snap.bloodGroup || null,
    patientMobile: row.patient_mobile || snap.mobilePhone || null,
    hospitalId: row.hospital_id,
    hospitalName: row.hospital_name || null,
    hospitalAddress: row.hospital_address || null,
    hospitalPhone: row.blood_bank_phone || row.hospital_phone || null,
    bloodGroup: row.blood_group,
    component: row.component,
    unitsRequested: Number(row.units_requested || 1),
    urgency: row.urgency,
    reason: row.reason,
    doctorName: row.doctor_name,
    note: row.note,
    status: row.status,
    holdExpiresAt: row.hold_expires_at,
    decidedAt: row.decided_at,
    decisionReason: row.decision_reason,
    patientSnapshot: snap,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBank(row) {
  const stock = Array.isArray(row.stock) ? row.stock : [];
  return {
    hospitalId: row.id,
    name: row.name,
    address: row.address,
    city: row.city,
    phone: row.phone,
    type: row.type,
    ratingAvg: Number(row.rating_avg || 4.5),
    hasBloodBank: Boolean(row.has_blood_bank),
    bloodBankPhone: row.blood_bank_phone,
    bloodBankHours: row.blood_bank_hours,
    photoUrl: row.photo_url || null,
    distanceKm: Math.round((Number(row.distance_meters || 0) / 1000) * 10) / 10,
    location: {
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
    },
    stock: stock.map((s) => ({
      bloodGroup: s.bloodGroup || s.blood_group,
      component: s.component,
      unitsTotal: Number(s.unitsTotal ?? s.units_total ?? 0),
      unitsReserved: Number(s.unitsReserved ?? s.units_reserved ?? 0),
      unitsQuarantine: Number(s.unitsQuarantine ?? s.units_quarantine ?? 0),
      unitsAvailable: Number(s.unitsAvailable ?? s.units_available ?? 0),
      expiringWithin7d: Number(s.expiringWithin7d ?? s.expiring_within_7d ?? 0),
    })),
    totalUnitsAvailable: stock.reduce(
      (n, s) => n + Number(s.unitsAvailable ?? s.units_available ?? 0),
      0
    ),
  };
}

export const bloodService = {
  catalog() {
    return {
      bloodGroups: Object.keys(COMPATIBLE_DONORS),
      components: BLOOD_COMPONENTS,
      holdMinutes: BLOOD_HOLD_MINUTES,
      compatibleDonors: COMPATIBLE_DONORS,
    };
  },

  async getHospitalBloodBank(hospitalId) {
    const hospital = await bloodRepository.getHospitalBloodMeta(pool, hospitalId);
    if (!hospital) throw new AppError('Hospital not found', 404, 'HOSPITAL_NOT_FOUND');
    const stock = await bloodRepository.listInventory(pool, hospitalId);
    return {
      hospitalId: hospital.id,
      name: hospital.name,
      hasBloodBank: Boolean(hospital.has_blood_bank),
      bloodBankPhone: hospital.blood_bank_phone,
      bloodBankHours: hospital.blood_bank_hours,
      phone: hospital.phone,
      address: hospital.address,
      stock: stock.map(mapStock),
      summary: {
        groupsInStock: [...new Set(stock.filter((s) => Number(s.units_available) > 0).map((s) => s.blood_group))],
        totalAvailable: stock.reduce((n, s) => n + Number(s.units_available || 0), 0),
      },
    };
  },

  async updateSettings(hospitalId, body) {
    const updated = await bloodRepository.setHospitalBloodBank(pool, hospitalId, body);
    if (!updated) throw new AppError('Hospital not found', 404, 'HOSPITAL_NOT_FOUND');
    return this.getHospitalBloodBank(hospitalId);
  },

  async upsertStock(hospitalId, row) {
    const hospital = await bloodRepository.getHospitalBloodMeta(pool, hospitalId);
    if (!hospital) throw new AppError('Hospital not found', 404, 'HOSPITAL_NOT_FOUND');
    if (!hospital.has_blood_bank) {
      await bloodRepository.setHospitalBloodBank(pool, hospitalId, { hasBloodBank: true });
    }
    const saved = await bloodRepository.upsertInventoryRow(pool, {
      hospitalId,
      bloodGroup: row.bloodGroup,
      component: row.component || 'PRBC',
      unitsTotal: row.unitsTotal,
      unitsReserved: row.unitsReserved,
      unitsQuarantine: row.unitsQuarantine,
      expiringWithin7d: row.expiringWithin7d,
    });
    return mapStock(saved);
  },

  async bulkUpsertStock(hospitalId, rows) {
    const out = [];
    for (const row of rows) {
      out.push(await this.upsertStock(hospitalId, row));
    }
    return out;
  },

  async search({ bloodGroup, component, lat, lng, radiusKm, limit }) {
    const rows = await bloodRepository.searchBloodBanks(pool, {
      bloodGroup,
      component,
      lat,
      lng,
      radiusKm,
      limit,
    });
    const banks = rows.map(mapBank);
    return {
      bloodGroup: bloodGroup || null,
      component: component || null,
      compatibleDonors: bloodGroup ? COMPATIBLE_DONORS[bloodGroup] || [bloodGroup] : null,
      count: banks.length,
      banks,
      holdMinutes: BLOOD_HOLD_MINUTES,
      disclaimer: 'Not a medical device. Crossmatch & clinician approval required before transfusion.',
    };
  },

  async createRequest(patientId, body, idempotencyKey = null) {
    const patient = await authRepository.findUserById(pool, patientId);
    if (!patient || patient.role !== 'PATIENT') {
      throw new AppError('Only patients can hold blood units', 403, 'FORBIDDEN');
    }
    if (!patient.profile_complete) {
      throw new AppError('Complete your profile before requesting blood', 422, 'PROFILE_INCOMPLETE');
    }

    const hospital = await bloodRepository.getHospitalBloodMeta(pool, body.hospitalId);
    if (!hospital || hospital.status !== 'VERIFIED' || !hospital.has_blood_bank) {
      throw new AppError('This hospital blood bank is not available', 400, 'BLOOD_BANK_UNAVAILABLE');
    }

    const holdExpiresAt = new Date(Date.now() + BLOOD_HOLD_MINUTES * 60 * 1000);
    const snapshot = {
      fullName: patient.full_name || patient.name,
      email: patient.email,
      bloodGroup: patient.blood_group,
      ageYears: patient.age_years,
      gender: patient.gender,
      mobilePhone: patient.mobile_phone || patient.emergency_contact_phone,
      emergencyContactName: patient.emergency_contact_name,
      emergencyContactPhone: patient.emergency_contact_phone,
      allergies: patient.allergies,
    };

    return await withTransaction(async (client) => {
      let stock = await bloodRepository.lockStock(
        client,
        body.hospitalId,
        body.bloodGroup,
        body.component || 'PRBC'
      );
      if (!stock) {
        throw new AppError(
          `No ${body.component || 'PRBC'} stock listed for ${body.bloodGroup}`,
          409,
          'BLOOD_STOCK_MISSING'
        );
      }
      if (Number(stock.units_available) < body.unitsRequested) {
        throw new AppError(
          `Only ${stock.units_available} unit(s) available for ${body.bloodGroup} ${body.component || 'PRBC'}`,
          409,
          'BLOOD_INSUFFICIENT'
        );
      }

      await bloodRepository.adjustReserved(client, stock.id, body.unitsRequested, 0);

      const created = await bloodRepository.createRequest(client, {
        patientId,
        hospitalId: body.hospitalId,
        bloodGroup: body.bloodGroup,
        component: body.component || 'PRBC',
        unitsRequested: body.unitsRequested,
        urgency: body.urgency || 'NORMAL',
        reason: body.reason,
        doctorName: body.doctorName,
        note: body.note,
        status: 'PENDING',
        holdExpiresAt,
        patientSnapshot: snapshot,
        idempotencyKey,
      });

      const full = await bloodRepository.findRequestById(client, created.id);
      return mapRequest(full || created);
    });
  },

  async listMine(patientId) {
    const rows = await bloodRepository.listPatientRequests(pool, patientId);
    return rows.map(mapRequest);
  },

  async listHospitalQueue(hospitalId) {
    const rows = await bloodRepository.listHospitalRequests(pool, hospitalId);
    return rows.map(mapRequest);
  },

  async cancel(requestId, patientId) {
    return await withTransaction(async (client) => {
      const req = await bloodRepository.findRequestById(client, requestId);
      if (!req) throw new AppError('Blood request not found', 404, 'NOT_FOUND');
      if (req.patient_id !== patientId) throw new AppError('Forbidden', 403, 'FORBIDDEN');
      if (!['PENDING', 'APPROVED'].includes(req.status)) {
        throw new AppError('Only pending/approved holds can be cancelled', 409, 'INVALID_STATUS');
      }

      const stock = await bloodRepository.lockStock(
        client,
        req.hospital_id,
        req.blood_group,
        req.component
      );
      if (stock) {
        await bloodRepository.adjustReserved(client, stock.id, -Number(req.units_requested), 0);
      }

      const updated = await bloodRepository.updateRequestStatus(client, requestId, {
        status: 'CANCELLED',
        decidedAt: new Date(),
        decisionReason: 'Cancelled by patient',
      });
      return mapRequest({ ...req, ...updated });
    });
  },

  async decide(requestId, actor, { decision, reason }) {
    return await withTransaction(async (client) => {
      const req = await bloodRepository.findRequestById(client, requestId);
      if (!req) throw new AppError('Blood request not found', 404, 'NOT_FOUND');

      if (
        actor.role !== 'CITY_ADMIN' &&
        actor.hospitalId &&
        actor.hospitalId !== req.hospital_id
      ) {
        throw new AppError('Cross-hospital access denied', 403, 'TENANT_ACCESS_DENIED');
      }

      const stock = await bloodRepository.lockStock(
        client,
        req.hospital_id,
        req.blood_group,
        req.component
      );

      if (decision === 'APPROVE') {
        if (req.status !== 'PENDING') {
          throw new AppError('Only pending holds can be approved', 409, 'INVALID_STATUS');
        }
        const updated = await bloodRepository.updateRequestStatus(client, requestId, {
          status: 'APPROVED',
          decidedBy: actor.id || actor.sub,
          decidedAt: new Date(),
          decisionReason: reason || 'Approved by blood bank / reception',
        });
        return mapRequest({ ...req, ...updated });
      }

      if (decision === 'REJECT') {
        if (!['PENDING', 'APPROVED'].includes(req.status)) {
          throw new AppError('Cannot reject this request', 409, 'INVALID_STATUS');
        }
        if (stock) {
          await bloodRepository.adjustReserved(client, stock.id, -Number(req.units_requested), 0);
        }
        const updated = await bloodRepository.updateRequestStatus(client, requestId, {
          status: 'REJECTED',
          decidedBy: actor.id || actor.sub,
          decidedAt: new Date(),
          decisionReason: reason || 'Rejected by blood bank',
        });
        return mapRequest({ ...req, ...updated });
      }

      if (decision === 'ISSUE') {
        if (!['PENDING', 'APPROVED'].includes(req.status)) {
          throw new AppError('Only pending/approved holds can be issued', 409, 'INVALID_STATUS');
        }
        if (stock) {
          // Release reserve and decrement physical stock (issued to patient)
          await bloodRepository.adjustReserved(
            client,
            stock.id,
            -Number(req.units_requested),
            -Number(req.units_requested)
          );
        }
        const updated = await bloodRepository.updateRequestStatus(client, requestId, {
          status: 'ISSUED',
          decidedBy: actor.id || actor.sub,
          decidedAt: new Date(),
          decisionReason: reason || 'Units issued after crossmatch',
        });
        return mapRequest({ ...req, ...updated });
      }

      throw new AppError('Unknown decision', 400, 'INVALID_DECISION');
    });
  },

  async expireHolds() {
    const expired = await bloodRepository.expireOverdue(pool);
    for (const row of expired) {
      await withTransaction(async (client) => {
        const stock = await bloodRepository.lockStock(
          client,
          row.hospital_id,
          row.blood_group,
          row.component
        );
        if (stock) {
          await bloodRepository.adjustReserved(client, stock.id, -Number(row.units_requested), 0);
        }
      }).catch(() => {});
    }
    return { expired: expired.length };
  },
};
