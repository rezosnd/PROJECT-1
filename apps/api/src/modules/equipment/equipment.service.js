import { pool, withTransaction } from '../../infra/db.js';
import { logger } from '../../infra/logger.js';
import { equipmentRepository } from './equipment.repository.js';
import { AppError } from '../../middleware/error-handler.js';
import { broadcastRealtimeEvent } from '../realtime/realtime.service.js';

export const equipmentService = {
  async listHospitalEquipment(hospitalId, filters = {}) {
    return await equipmentRepository.listByHospital(pool, hospitalId, filters);
  },

  async getHospitalEquipmentSummary(hospitalId) {
    return await equipmentRepository.getSummaryByHospital(pool, hospitalId);
  },

  async getEquipmentById(id) {
    const eq = await equipmentRepository.findById(pool, id);
    if (!eq) {
      throw new AppError('Equipment not found', 404, 'EQUIPMENT_NOT_FOUND');
    }
    return eq;
  },

  async searchEquipment({ type, status = 'AVAILABLE', lat, lng, radiusKm = 30, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const items = await equipmentRepository.searchEquipment(pool, {
      type,
      status,
      lat,
      lng,
      radiusKm,
      limit,
      offset
    });

    return {
      items,
      pagination: {
        page,
        limit,
        count: items.length
      }
    };
  },

  async createEquipment(hospitalId, data, actor) {
    return await withTransaction(async (client) => {
      const eq = await equipmentRepository.create(client, {
        hospitalId,
        type: data.type,
        name: data.name,
        model: data.model,
        serialNo: data.serialNo,
        status: data.status,
        criticality: data.criticality,
        availableAt: data.availableAt
      });

      // Audit registration
      await client.query(
        `INSERT INTO audit_log (actor_id, action, resource_type, resource_id, ip, meta, at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [actor.sub, 'EQUIPMENT_REGISTERED', 'equipment', eq.id, null, null]
      );

      // Broadcast update
      broadcastRealtimeEvent({
        event: 'equipment:update',
        room: `hospital:${hospitalId}`,
        payload: {
          hospitalId,
          equipmentId: eq.id,
          type: eq.type,
          name: eq.name,
          status: eq.status,
          criticality: eq.criticality,
          at: new Date().toISOString()
        }
      });

      return eq;
    });
  },

  /**
   * Distributed Systems Note: Critical Equipment Failure Alerting and Audit.
   * When life-support or imaging infrastructure transitions to OFFLINE, FAULTY, or MAINTENANCE,
   * an alert is synchronously pushed across the hospital's operational room to prompt immediate diversion.
   */
  async updateEquipmentStatus(equipmentId, { status: newStatus, availableAt, reason }, actor) {
    return await withTransaction(async (client) => {
      const eq = await equipmentRepository.findByIdForUpdate(client, equipmentId);
      if (!eq) {
        throw new AppError('Equipment not found', 404, 'EQUIPMENT_NOT_FOUND');
      }

      // Tenant isolation: Staff can only manipulate equipment within their assigned hospital
      if (eq.hospital_id !== actor.hospitalId && actor.role !== 'CITY_ADMIN') {
        throw new AppError('Cross-hospital tenant access denied', 403, 'TENANT_ACCESS_DENIED');
      }

      const result = await equipmentRepository.updateStatus(client, {
        equipmentId,
        newStatus,
        availableAt,
        actorId: actor.sub
      });

      // If critical unit has suffered failure, audit and emit alert
      const isCriticalFailure = 
        eq.criticality === 'CRITICAL' &&
        ['OFFLINE', 'FAULTY', 'MAINTENANCE'].includes(newStatus) &&
        !['OFFLINE', 'FAULTY', 'MAINTENANCE'].includes(eq.status);

      if (isCriticalFailure) {
        logger.warn(
          { equipmentId, hospitalId: eq.hospital_id, type: eq.type, newStatus },
          '[Critical Equipment Failure] Emitting immediate hospital alert'
        );

        await client.query(
          `INSERT INTO audit_log (actor_id, action, resource_type, resource_id, ip, meta, at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            actor.sub,
            'CRITICAL_EQUIPMENT_ALERT',
            'equipment',
            equipmentId,
            null,
            JSON.stringify({
              type: eq.type,
              name: eq.name,
              oldStatus: eq.status,
              newStatus,
              reason: reason || 'Critical unit transition'
            })
          ]
        );

        broadcastRealtimeEvent({
          event: 'alert:critical-equipment',
          room: `hospital:${eq.hospital_id}`,
          payload: {
            hospitalId: eq.hospital_id,
            equipmentId,
            type: eq.type,
            name: eq.name,
            status: newStatus,
            criticality: eq.criticality,
            reason: reason || 'Critical unit unavailable',
            at: new Date().toISOString()
          }
        });
      }

      // Standard telemetry broadcast
      broadcastRealtimeEvent({
        event: 'equipment:update',
        room: `hospital:${eq.hospital_id}`,
        payload: {
          hospitalId: eq.hospital_id,
          equipmentId,
          type: eq.type,
          status: newStatus,
          criticality: eq.criticality,
          at: new Date().toISOString()
        }
      });

      return result.equipment;
    });
  }
};
