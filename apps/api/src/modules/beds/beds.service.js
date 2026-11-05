import { pool, withTransaction, withAdvisoryLock } from '../../infra/db.js';
import { logger } from '../../infra/logger.js';
import { emailService } from '../../infra/email.js';
import { bedsRepository } from './beds.repository.js';
import { AppError } from '../../middleware/error-handler.js';
import { broadcastRealtimeEvent } from '../realtime/realtime.service.js';
import { maskAbhaNumber } from '../abha/abha.crypto.js';

export const bedsService = {
  async getHospitalBeds(hospitalId) {
    return await bedsRepository.getHospitalBedInventory(pool, hospitalId);
  },

  async getHospitalBedsEtag(hospitalId) {
    return await bedsRepository.getHospitalBedsEtag(pool, hospitalId);
  },

  /**
   * Distributed Systems Note: Atomic Bed Counter Adjustment with Row Locking.
   * Modifying bed counters executes in a single transaction with SELECT ... FOR UPDATE.
   * If any value violates invariant bounds (counter < 0 or free < 0), the transaction aborts with HTTP 409.
   * On success, append-only ledger and hourly flow tracking are recorded before emitting realtime events.
   */
  async adjustBedCounters(hospitalId, wardType, deltas, actorId) {
    return await withTransaction(async (client) => {
      const ward = await bedsRepository.lockWardForUpdate(client, hospitalId, wardType);
      if (!ward) {
        throw new AppError(`Ward '${wardType}' not configured for hospital`, 404, 'WARD_NOT_FOUND');
      }

      const newTotal = ward.total + (deltas.total || 0);
      const newOccupied = ward.occupied + (deltas.occupied || 0);
      const newReserved = ward.reserved + (deltas.reserved || 0);
      const newCleaning = ward.cleaning + (deltas.cleaning || 0);
      const newMaintenance = ward.maintenance + (deltas.maintenance || 0);

      // Invariant check: No counters can be negative, and total occupancy cannot exceed total capacity
      if (
        newTotal < 0 || newOccupied < 0 || newReserved < 0 || newCleaning < 0 || newMaintenance < 0 ||
        (newOccupied + newReserved + newCleaning + newMaintenance) > newTotal
      ) {
        throw new AppError(
          'Adjustment rejected: bed counters cannot be negative and total capacity must accommodate all bed allocations',
          409,
          'INVALID_BED_STATE'
        );
      }

      const updated = await bedsRepository.updateWardCounters(client, {
        id: ward.id,
        total: newTotal,
        occupied: newOccupied,
        reserved: newReserved,
        cleaning: newCleaning,
        maintenance: newMaintenance,
        hasVentilatorBeds: ward.has_ventilator_beds
      });

      // Record audit ledger for each non-zero delta
      const fields = ['total', 'occupied', 'reserved', 'cleaning', 'maintenance'];
      for (const field of fields) {
        const delta = deltas[field] || 0;
        if (delta !== 0) {
          await bedsRepository.appendLedgerEntry(client, {
            hospitalId,
            wardType,
            field,
            delta,
            reason: deltas.reason || 'MANUAL_STAFF_ADJUSTMENT',
            actorId
          });
        }
      }

      // Record admission / discharge flow for prediction
      const occupiedDelta = deltas.occupied || 0;
      if (occupiedDelta !== 0) {
        await bedsRepository.recordFlowHourly(client, {
          hospitalId,
          wardType,
          deltaAdmissions: occupiedDelta > 0 ? occupiedDelta : 0,
          deltaDischarges: occupiedDelta < 0 ? Math.abs(occupiedDelta) : 0
        });
      }

      // Record point-in-time snapshot
      await bedsRepository.insertSnapshot(client, {
        hospitalId,
        wardType,
        total: updated.total,
        occupied: updated.occupied,
        reserved: updated.reserved,
        free: updated.free
      });

      // Publish Realtime Events
      broadcastRealtimeEvent({
        event: 'beds:update',
        room: `hospital:${hospitalId}`,
        payload: {
          hospitalId,
          wardType,
          free: updated.free,
          total: updated.total,
          occupied: updated.occupied,
          reserved: updated.reserved,
          version: updated.version,
          at: new Date().toISOString()
        }
      });

      return updated;
    });
  },

  async putBedCounters(hospitalId, wardType, values, actorId) {
    const sum = values.occupied + values.reserved + values.cleaning + values.maintenance;
    if (sum > values.total) {
      throw new AppError('Total bed count must be greater than or equal to the sum of allocated beds', 409, 'INVALID_BED_STATE');
    }

    return await withTransaction(async (client) => {
      const ward = await bedsRepository.lockWardForUpdate(client, hospitalId, wardType);
      if (!ward) {
        throw new AppError(`Ward '${wardType}' not configured for hospital`, 404, 'WARD_NOT_FOUND');
      }

      const updated = await bedsRepository.updateWardCounters(client, {
        id: ward.id,
        total: values.total,
        occupied: values.occupied,
        reserved: values.reserved,
        cleaning: values.cleaning,
        maintenance: values.maintenance,
        hasVentilatorBeds: values.hasVentilatorBeds
      });

      await bedsRepository.appendLedgerEntry(client, {
        hospitalId,
        wardType,
        field: 'total',
        delta: values.total - ward.total,
        reason: values.reason || 'DIRECT_INVENTORY_SYNC',
        actorId
      });

      await bedsRepository.insertSnapshot(client, {
        hospitalId,
        wardType,
        total: updated.total,
        occupied: updated.occupied,
        reserved: updated.reserved,
        free: updated.free
      });

      broadcastRealtimeEvent({
        event: 'beds:update',
        room: `hospital:${hospitalId}`,
        payload: {
          hospitalId,
          wardType,
          free: updated.free,
          total: updated.total,
          occupied: updated.occupied,
          reserved: updated.reserved,
          version: updated.version,
          at: new Date().toISOString()
        }
      });

      return updated;
    });
  },

  async addExpectedDischarges(hospitalId, wardType, expectedAtList) {
    await bedsRepository.insertExpectedDischarges(pool, { hospitalId, wardType, expectedAtList });
    return { success: true, count: expectedAtList.length };
  },

  /**
   * Distributed Systems Note: Concurrency Control in Bed Reservation.
   * When 50 parallel requests contend for the last free ICU bed, SELECT ... FOR UPDATE
   * forces all 50 transactions to queue sequentially.
   * The first transaction increments reserved (free becomes 0) and commits.
   * The remaining 49 transactions observe free = 0 and immediately abort with HTTP 409 BED_NOT_AVAILABLE.
   */
  async createBedRequest({ patientId, hospitalId, wardType, urgency, conditionId, note, shareAbha, idempotencyKey }) {
    const { result, mailContext } = await withTransaction(async (client) => {
      const ward = await bedsRepository.lockWardForUpdate(client, hospitalId, wardType);
      if (!ward) {
        throw new AppError(`Ward '${wardType}' not available at this hospital`, 404, 'WARD_NOT_FOUND');
      }

      if (ward.free <= 0) {
        throw new AppError('No free beds available in the requested ward', 409, 'BED_NOT_AVAILABLE');
      }

      const freeBedsAtRequest = ward.free;

      const { rows: patientRows } = await client.query(
        `SELECT id, name, email, full_name, date_of_birth, gender, blood_group, age_years,
                address_line, city_name, pin_code, emergency_contact_name, emergency_contact_phone,
                allergies, medical_notes, profile_complete
         FROM users WHERE id = $1`,
        [patientId]
      );
      const patient = patientRows[0];
      if (!patient) {
        throw new AppError('Patient account not found', 404, 'USER_NOT_FOUND');
      }
      if (!patient.profile_complete) {
        throw new AppError(
          'Complete your patient profile before requesting a bed so the hospital receives your details',
          422,
          'PROFILE_INCOMPLETE'
        );
      }

      const { rows: hospitalRows } = await client.query(
        `SELECT name FROM hospitals WHERE id = $1`,
        [hospitalId]
      );
      const hospitalName = hospitalRows[0]?.name || 'Selected hospital';

      const patientSnapshot = {
        fullName: patient.full_name || patient.name,
        email: patient.email,
        dateOfBirth: patient.date_of_birth,
        gender: patient.gender,
        bloodGroup: patient.blood_group,
        ageYears: patient.age_years,
        addressLine: patient.address_line,
        cityName: patient.city_name,
        pinCode: patient.pin_code,
        emergencyContactName: patient.emergency_contact_name,
        emergencyContactPhone: patient.emergency_contact_phone,
        allergies: patient.allergies,
        medicalNotes: patient.medical_notes,
        capturedAt: new Date().toISOString()
      };

      const holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute hold deadline

      const updatedWard = await bedsRepository.updateWardCounters(client, {
        id: ward.id,
        total: ward.total,
        occupied: ward.occupied,
        reserved: ward.reserved + 1,
        cleaning: ward.cleaning,
        maintenance: ward.maintenance,
        hasVentilatorBeds: ward.has_ventilator_beds
      });

      const normalizedUrgency =
        urgency === 'IMMEDIATE' ? 'CRITICAL' :
        urgency === 'HIGH' ? 'URGENT' :
        urgency === 'MODERATE' ? 'NORMAL' :
        (urgency || 'NORMAL');

      const request = await bedsRepository.createBedRequest(client, {
        patientId,
        hospitalId,
        wardType,
        urgency: normalizedUrgency,
        conditionId: conditionId || null,
        note,
        shareAbha,
        holdExpiresAt,
        idempotencyKey,
        patientSnapshot
      });

      await bedsRepository.appendLedgerEntry(client, {
        hospitalId,
        wardType,
        field: 'reserved',
        delta: 1,
        reason: 'BED_HOLD_REQUEST',
        actorId: patientId
      });

      await bedsRepository.insertSnapshot(client, {
        hospitalId,
        wardType,
        total: updatedWard.total,
        occupied: updatedWard.occupied,
        reserved: updatedWard.reserved,
        free: updatedWard.free
      });

      // Broadcast inventory decrement
      broadcastRealtimeEvent({
        event: 'beds:update',
        room: `hospital:${hospitalId}`,
        payload: {
          hospitalId,
          wardType,
          free: updatedWard.free,
          total: updatedWard.total,
          occupied: updatedWard.occupied,
          reserved: updatedWard.reserved,
          version: updatedWard.version,
          at: new Date().toISOString()
        }
      });

      // Broadcast new request event to patient and hospital station
      broadcastRealtimeEvent({
        event: 'request:update',
        room: `hospital:${hospitalId}`,
        payload: {
          requestId: request.id,
          hospitalId,
          wardType,
          urgency,
          status: 'PENDING',
          patientId,
          holdExpiresAt: request.hold_expires_at
        }
      });

      return {
        result: {
          ...request,
          remainingSeconds: 900
        },
        mailContext: {
          to: patient.email,
          name: patient.full_name || patient.name,
          hospitalName,
          wardType,
          urgency: normalizedUrgency,
          holdExpiresAt: request.hold_expires_at || holdExpiresAt,
          requestId: request.id,
          freeBedsNow: freeBedsAtRequest,
        }
      };
    });

    // Formal confirmation email — never block the hold response
    if (mailContext?.to) {
      void emailService
        .sendBedReservationEmail(mailContext)
        .catch((err) => {
          logger.warn(
            { err: err?.message, requestId: mailContext.requestId },
            '[Beds] Bed reservation email failed (non-fatal)'
          );
        });
    }

    return result;
  },

  async getPatientRequests(patientId) {
    const rows = await bedsRepository.findBedRequestsByPatient(pool, patientId);
    return rows.map((r) => ({
      id: r.id,
      hospitalId: r.hospital_id,
      hospitalName: r.hospital_name,
      wardType: r.ward_type,
      urgency: r.urgency,
      status: r.status,
      holdExpiresAt: r.hold_expires_at,
      remainingSeconds: r.remaining_seconds,
      createdAt: r.created_at,
      reason: r.reason
    }));
  },

  async getHospitalRequests(hospitalId, status) {
    const rows = await bedsRepository.findBedRequestsByHospital(pool, hospitalId, status);
    return rows.map((r) => {
      let masked = null;
      if (r.share_abha && r.abha_number_enc) {
        try {
          masked = maskAbhaNumber(r.abha_number_enc);
        } catch {
          masked = 'XX-XXXX-XXXX-8921';
        }
      } else if (r.share_abha && r.abha_address) {
        masked = `XX-XXXX-XXXX-${r.abha_address.split('@')[0].slice(-4)}`;
      }

      return {
        id: r.id,
        hospital_id: r.hospital_id,
        hospitalId: r.hospital_id,
        patient_id: r.patient_id,
        patientId: r.patient_id,
        patient_name: r.patient_name,
        patientName: (r.patient_snapshot?.fullName) || r.patient_name || 'Emergency Citizen',
        patient_email: r.patient_email,
        patientEmail: r.patient_email,
        patientProfile: r.patient_snapshot || {
          fullName: r.patient_name,
          email: r.patient_email,
          bloodGroup: r.blood_group,
          gender: r.gender,
          ageYears: r.age_years,
          emergencyContactName: r.emergency_contact_name,
          emergencyContactPhone: r.emergency_contact_phone,
          allergies: r.allergies,
          cityName: r.city_name,
          addressLine: r.address_line
        },
        ward_type: r.ward_type,
        wardType: r.ward_type,
        urgency: r.urgency,
        condition_id: r.condition_id,
        conditionId: r.condition_id,
        note: r.note,
        share_abha: Boolean(r.share_abha),
        shareAbha: Boolean(r.share_abha),
        maskedAbha: masked || r.abha?.maskedNumber,
        status: r.status,
        hold_expires_at: r.hold_expires_at,
        holdExpiresAt: r.hold_expires_at,
        remaining_seconds: r.remaining_seconds,
        remainingSeconds: r.remaining_seconds,
        created_at: r.created_at,
        createdAt: r.created_at,
        abha: r.share_abha && (r.abha_status === 'LINKED' || r.abha) ? {
          maskedNumber: r.abha?.maskedNumber || masked || '**-****-****-abdm',
          abhaAddress: r.abha_address || r.abha?.abhaAddress,
          verifiedName: r.abha_verified_name || r.abha?.verifiedName || r.patient_name
        } : null
      };
    });
  },

  async decideBedRequest(requestId, decision, reason, staff) {
    return await withTransaction(async (client) => {
      const request = await bedsRepository.findBedRequestByIdForUpdate(client, requestId);
      if (!request) {
        throw new AppError('Bed request not found', 404, 'REQUEST_NOT_FOUND');
      }

      if (request.hospital_id !== staff.hospitalId && staff.role !== 'CITY_ADMIN') {
        throw new AppError('Cross-hospital tenant access denied', 403, 'TENANT_ACCESS_DENIED');
      }

      if (request.status !== 'PENDING') {
        throw new AppError(`Cannot decide on request with status '${request.status}'`, 400, 'REQUEST_ALREADY_DECIDED');
      }

      if (decision === 'REJECT') {
        // Release the held bed back into the free pool
        const ward = await bedsRepository.lockWardForUpdate(client, request.hospital_id, request.ward_type);
        if (ward) {
          const newReserved = Math.max(0, ward.reserved - 1);
          const updatedWard = await bedsRepository.updateWardCounters(client, {
            id: ward.id,
            total: ward.total,
            occupied: ward.occupied,
            reserved: newReserved,
            cleaning: ward.cleaning,
            maintenance: ward.maintenance,
            hasVentilatorBeds: ward.has_ventilator_beds
          });

          await bedsRepository.appendLedgerEntry(client, {
            hospitalId: request.hospital_id,
            wardType: request.ward_type,
            field: 'reserved',
            delta: -1,
            reason: 'BED_REQUEST_REJECTED',
            actorId: staff.sub
          });

          await bedsRepository.insertSnapshot(client, {
            hospitalId: request.hospital_id,
            wardType: request.ward_type,
            total: updatedWard.total,
            occupied: updatedWard.occupied,
            reserved: updatedWard.reserved,
            free: updatedWard.free
          });

          broadcastRealtimeEvent({
            event: 'beds:update',
            room: `hospital:${request.hospital_id}`,
            payload: {
              hospitalId: request.hospital_id,
              wardType: request.ward_type,
              free: updatedWard.free,
              total: updatedWard.total,
              version: updatedWard.version,
              at: new Date().toISOString()
            }
          });
        }
      }

      const updatedRequest = await bedsRepository.updateBedRequestStatus(client, requestId, {
        status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        decidedBy: staff.sub,
        reason
      });

      broadcastRealtimeEvent({
        event: 'request:update',
        room: `user:${request.patient_id}`,
        payload: {
          requestId,
          hospitalId: request.hospital_id,
          wardType: request.ward_type,
          status: updatedRequest.status,
          reason
        }
      });

      return updatedRequest;
    });
  },

  async cancelBedRequest(requestId, patientId) {
    return await withTransaction(async (client) => {
      const request = await bedsRepository.findBedRequestByIdForUpdate(client, requestId);
      if (!request) {
        throw new AppError('Bed request not found', 404, 'REQUEST_NOT_FOUND');
      }

      if (request.patient_id !== patientId) {
        throw new AppError('You can only cancel your own bed requests', 403, 'FORBIDDEN');
      }

      if (!['PENDING', 'APPROVED'].includes(request.status)) {
        throw new AppError(`Cannot cancel request with status '${request.status}'`, 400, 'CANNOT_CANCEL');
      }

      // Release reserved bed
      const ward = await bedsRepository.lockWardForUpdate(client, request.hospital_id, request.ward_type);
      if (ward) {
        const newReserved = Math.max(0, ward.reserved - 1);
        const updatedWard = await bedsRepository.updateWardCounters(client, {
          id: ward.id,
          total: ward.total,
          occupied: ward.occupied,
          reserved: newReserved,
          cleaning: ward.cleaning,
          maintenance: ward.maintenance,
          hasVentilatorBeds: ward.has_ventilator_beds
        });

        await bedsRepository.appendLedgerEntry(client, {
          hospitalId: request.hospital_id,
          wardType: request.ward_type,
          field: 'reserved',
          delta: -1,
          reason: 'BED_REQUEST_CANCELLED_BY_PATIENT',
          actorId: patientId
        });

        await bedsRepository.insertSnapshot(client, {
          hospitalId: request.hospital_id,
          wardType: request.ward_type,
          total: updatedWard.total,
          occupied: updatedWard.occupied,
          reserved: updatedWard.reserved,
          free: updatedWard.free
        });

        broadcastRealtimeEvent({
          event: 'beds:update',
          room: `hospital:${request.hospital_id}`,
          payload: {
            hospitalId: request.hospital_id,
            wardType: request.ward_type,
            free: updatedWard.free,
            total: updatedWard.total,
            version: updatedWard.version,
            at: new Date().toISOString()
          }
        });
      }

      const updated = await bedsRepository.updateBedRequestStatus(client, requestId, {
        status: 'CANCELLED',
        decidedBy: patientId,
        reason: 'Cancelled by patient'
      });

      broadcastRealtimeEvent({
        event: 'request:update',
        room: `hospital:${request.hospital_id}`,
        payload: {
          requestId,
          hospitalId: request.hospital_id,
          status: 'CANCELLED'
        }
      });

      return updated;
    });
  },

  async admitBedRequest(requestId, staff) {
    return await withTransaction(async (client) => {
      const request = await bedsRepository.findBedRequestByIdForUpdate(client, requestId);
      if (!request) {
        throw new AppError('Bed request not found', 404, 'REQUEST_NOT_FOUND');
      }

      if (request.hospital_id !== staff.hospitalId && staff.role !== 'CITY_ADMIN') {
        throw new AppError('Cross-hospital tenant access denied', 403, 'TENANT_ACCESS_DENIED');
      }

      if (!['PENDING', 'APPROVED'].includes(request.status)) {
        throw new AppError(`Cannot admit request with status '${request.status}'`, 400, 'CANNOT_ADMIT');
      }

      const ward = await bedsRepository.lockWardForUpdate(client, request.hospital_id, request.ward_type);
      if (!ward) {
        throw new AppError('Ward not found', 404, 'WARD_NOT_FOUND');
      }

      // Convert hold into official admission: reserved - 1, occupied + 1
      const newReserved = Math.max(0, ward.reserved - 1);
      const newOccupied = ward.occupied + 1;

      const updatedWard = await bedsRepository.updateWardCounters(client, {
        id: ward.id,
        total: ward.total,
        occupied: newOccupied,
        reserved: newReserved,
        cleaning: ward.cleaning,
        maintenance: ward.maintenance,
        hasVentilatorBeds: ward.has_ventilator_beds
      });

      await bedsRepository.appendLedgerEntry(client, {
        hospitalId: request.hospital_id,
        wardType: request.ward_type,
        field: 'reserved',
        delta: -1,
        reason: 'ADMISSION_TRANSITION',
        actorId: staff.sub
      });

      await bedsRepository.appendLedgerEntry(client, {
        hospitalId: request.hospital_id,
        wardType: request.ward_type,
        field: 'occupied',
        delta: 1,
        reason: 'PATIENT_ADMITTED',
        actorId: staff.sub
      });

      // Increment admissions in hourly flow tracker
      await bedsRepository.recordFlowHourly(client, {
        hospitalId: request.hospital_id,
        wardType: request.ward_type,
        deltaAdmissions: 1,
        deltaDischarges: 0
      });

      await bedsRepository.insertSnapshot(client, {
        hospitalId: request.hospital_id,
        wardType: request.ward_type,
        total: updatedWard.total,
        occupied: updatedWard.occupied,
        reserved: updatedWard.reserved,
        free: updatedWard.free
      });

      const updatedRequest = await bedsRepository.updateBedRequestStatus(client, requestId, {
        status: 'ADMITTED',
        decidedBy: staff.sub,
        reason: 'Patient formally admitted to ward'
      });

      broadcastRealtimeEvent({
        event: 'beds:update',
        room: `hospital:${request.hospital_id}`,
        payload: {
          hospitalId: request.hospital_id,
          wardType: request.ward_type,
          free: updatedWard.free,
          total: updatedWard.total,
          occupied: updatedWard.occupied,
          version: updatedWard.version,
          at: new Date().toISOString()
        }
      });

      broadcastRealtimeEvent({
        event: 'request:update',
        room: `user:${request.patient_id}`,
        payload: {
          requestId,
          hospitalId: request.hospital_id,
          status: 'ADMITTED'
        }
      });

      return updatedRequest;
    });
  },

  /**
   * Distributed Systems Note: Periodic Hold Expiry via Advisory Lock.
   * Every 30 seconds, one API instance acquires 'BED_HOLD_EXPIRY_LOCK' and frees overdue holds,
   * guaranteeing that patient reservation deadlines (15 minutes) are strictly enforced without double-releasing.
   */
  async expireOverdueHolds() {
    return await withAdvisoryLock('BED_HOLD_EXPIRY_JOB', async (client) => {
      const expired = await bedsRepository.findExpiredPendingRequests(client);
      if (expired.length === 0) return 0;

      logger.info({ count: expired.length }, '[Hold Expiry Job] Expiring overdue bed holds');

      for (const req of expired) {
        try {
          const ward = await bedsRepository.lockWardForUpdate(client, req.hospital_id, req.ward_type);
          if (ward) {
            const newReserved = Math.max(0, ward.reserved - 1);
            const updatedWard = await bedsRepository.updateWardCounters(client, {
              id: ward.id,
              total: ward.total,
              occupied: ward.occupied,
              reserved: newReserved,
              cleaning: ward.cleaning,
              maintenance: ward.maintenance,
              hasVentilatorBeds: ward.has_ventilator_beds
            });

            await bedsRepository.appendLedgerEntry(client, {
              hospitalId: req.hospital_id,
              wardType: req.ward_type,
              field: 'reserved',
              delta: -1,
              reason: 'HOLD_EXPIRED',
              actorId: null
            });

            await bedsRepository.insertSnapshot(client, {
              hospitalId: req.hospital_id,
              wardType: req.ward_type,
              total: updatedWard.total,
              occupied: updatedWard.occupied,
              reserved: updatedWard.reserved,
              free: updatedWard.free
            });

            broadcastRealtimeEvent({
              event: 'beds:update',
              room: `hospital:${req.hospital_id}`,
              payload: {
                hospitalId: req.hospital_id,
                wardType: req.ward_type,
                free: updatedWard.free,
                total: updatedWard.total,
                version: updatedWard.version,
                at: new Date().toISOString()
              }
            });
          }

          await bedsRepository.updateBedRequestStatus(client, req.id, {
            status: 'EXPIRED',
            decidedBy: null,
            reason: '15-minute reservation deadline elapsed without hospital confirmation'
          });

          broadcastRealtimeEvent({
            event: 'request:update',
            room: `user:${req.patient_id}`,
            payload: {
              requestId: req.id,
              hospitalId: req.hospital_id,
              status: 'EXPIRED'
            }
          });
        } catch (err) {
          logger.error({ err: err.message, requestId: req.id }, '[Hold Expiry Job] Failed to expire request');
        }
      }

      return expired.length;
    });
  },

  async getCitySummary() {
    return await bedsRepository.getCitySummary(pool);
  }
};

