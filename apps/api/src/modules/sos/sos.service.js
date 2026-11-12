import { AppError } from '../../middleware/error-handler.js';
import { broadcastRealtimeEvent } from '../realtime/realtime.service.js';
import { notifyUsers } from '../push/push.service.js';
import { sosRepository } from './sos.repository.js';
import { pool } from '../../infra/db.js';
import { logger } from '../../infra/logger.js';

function mapSos(row) {
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    severity: row.severity,
    note: row.note,
    patientPhone: row.patient_phone || row.patientPhone,
    addressText: row.address_text,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    notifiedCount: row.notified_count,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
    expiresAt: row.expires_at,
    patientName: row.patient_name,
    distanceM: row.distance_m != null ? Math.round(Number(row.distance_m)) : undefined,
    distanceKm:
      row.distance_m != null ? Math.round((Number(row.distance_m) / 1000) * 10) / 10 : undefined,
    ambulance: row.accepted_ambulance_id || row.ambulance_call_sign
      ? {
          id: row.accepted_ambulance_id,
          callSign: row.ambulance_call_sign,
          vehicleNo: row.ambulance_vehicle_no,
          type: row.ambulance_type,
          phone: row.ambulance_phone,
          driverName: row.ambulance_driver_name,
        }
      : null,
    destinationHospitalName: row.destination_hospital_name || null,
    emergencyNumber: '112',
  };
}

export const sosService = {
  async createSos(patient, body) {
    const lng = Number(body.longitude);
    const lat = Number(body.latitude);
    if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      throw new AppError('Valid latitude and longitude are required', 400, 'INVALID_COORDINATES');
    }

    // Expire stale OPEN requests before dispatch
    await sosRepository.expireOpen(pool);

    const open = await pool.query(
      `SELECT id FROM sos_requests
       WHERE patient_id = $1 AND status IN ('OPEN', 'ACCEPTED', 'EN_ROUTE')
       ORDER BY created_at DESC LIMIT 1`,
      [patient.id]
    );
    if (open.rows[0]) {
      const existing = await sosRepository.getById(pool, open.rows[0].id);
      return { ...mapSos(existing), reused: true };
    }

    const row = await sosRepository.createSos(pool, {
      patientId: patient.id,
      lng,
      lat,
      note: body.note,
      patientPhone: body.patientPhone || patient.mobile || null,
      addressText: body.addressText,
      severity: body.severity || 'CRITICAL',
      radiusM: body.radiusM || 15000,
    });

    const nearby = await sosRepository.findNearbyAmbulances(pool, {
      lng,
      lat,
      radiusM: body.radiusM || 15000,
      limit: 25,
    });

    await sosRepository.insertDispatchTargets(pool, row.id, nearby);
    await sosRepository.setNotifiedCount(pool, row.id, nearby.length);

    const driverIds = nearby.map((a) => a.userId).filter(Boolean);
    const title = '🚨 SOS — patient needs ambulance';
    const pushBody = nearby.length
      ? `Emergency near you (${Math.round(Number(nearby[0].distance_m) / 100) / 10} km). First to accept wins.`
      : 'Emergency SOS in Bhubaneswar. Open CityHealth Ambulance to respond.';

    await notifyUsers(driverIds, {
      title,
      body: pushBody,
      data: { type: 'SOS', sosId: row.id, severity: row.severity },
    });

    await broadcastRealtimeEvent({
      event: 'sos:created',
      room: 'ambulance:city',
      payload: {
        sosId: row.id,
        severity: row.severity,
        latitude: lat,
        longitude: lng,
        notifiedCount: nearby.length,
        targets: nearby.slice(0, 10).map((a) => ({
          ambulanceId: a.id,
          callSign: a.callSign,
          distanceM: Math.round(Number(a.distance_m)),
        })),
      },
    });

    for (const a of nearby) {
      if (!a.userId) continue;
      await broadcastRealtimeEvent({
        event: 'sos:offer',
        room: `user:${a.userId}`,
        payload: {
          sosId: row.id,
          severity: row.severity,
          latitude: lat,
          longitude: lng,
          distanceM: Math.round(Number(a.distance_m)),
          note: body.note || null,
        },
      });
    }

    const full = await sosRepository.getById(pool, row.id);
    logger.info(
      { sosId: row.id, notified: nearby.length },
      '[SOS] Created and dispatched'
    );

    return {
      ...mapSos(full),
      notifiedAmbulances: nearby.length,
      nearbyPreview: nearby.slice(0, 5).map((a) => ({
        callSign: a.callSign,
        distanceKm: Math.round((Number(a.distance_m) / 1000) * 10) / 10,
        type: a.ambulanceType,
      })),
      guidance:
        nearby.length === 0
          ? 'No online ambulances in range right now. Call 112 immediately.'
          : `${nearby.length} nearby ambulance(s) notified. First to accept will be assigned.`,
    };
  },

  async getById(id, requester) {
    const row = await sosRepository.getById(pool, id);
    if (!row) throw new AppError('SOS request not found', 404, 'SOS_NOT_FOUND');

    const isPatient = requester.role === 'PATIENT' && requester.id === row.patient_id;
    const isDriver =
      requester.role === 'AMBULANCE' &&
      (requester.id === row.accepted_by_user_id ||
        ['OPEN', 'ACCEPTED', 'EN_ROUTE'].includes(row.status));
    const isStaff = ['HOSPITAL_STAFF', 'HOSPITAL_ADMIN', 'CITY_ADMIN'].includes(requester.role);
    if (!isPatient && !isDriver && !isStaff) {
      throw new AppError('Not allowed to view this SOS', 403, 'FORBIDDEN');
    }
    return mapSos(row);
  },

  async listMine(patientId) {
    const rows = await sosRepository.listForPatient(pool, patientId);
    return rows.map(mapSos);
  },

  async listOffersForAmbulance(user) {
    const amb = await sosRepository.getAmbulanceByUser(pool, user.id);
    if (!amb) throw new AppError('Ambulance profile not registered', 400, 'AMBULANCE_NOT_FOUND');
    const lng = amb.longitude != null ? Number(amb.longitude) : 85.8245;
    const lat = amb.latitude != null ? Number(amb.latitude) : 20.2961;
    const rows = await sosRepository.listOpenForAmbulance(pool, amb.id, lng, lat);
    return rows.map(mapSos);
  },

  async accept(user, sosId) {
    const amb = await sosRepository.getAmbulanceByUser(pool, user.id);
    if (!amb) throw new AppError('Ambulance profile not registered', 400, 'AMBULANCE_NOT_FOUND');

    const result = await sosRepository.acceptFcfs(pool, {
      sosId,
      ambulanceId: amb.id,
      userId: user.id,
    });

    if (!result.ok) {
      if (result.code === 'ALREADY_TAKEN') {
        throw new AppError(
          'Another ambulance already accepted this SOS (first-come-first-serve).',
          409,
          'ALREADY_TAKEN'
        );
      }
      if (result.code === 'AMBULANCE_BUSY') {
        throw new AppError('Your unit is marked busy', 409, 'AMBULANCE_BUSY');
      }
      if (result.code === 'AMBULANCE_FORBIDDEN') {
        throw new AppError('Ambulance credentials mismatch', 403, 'FORBIDDEN');
      }
      throw new AppError('SOS not found', 404, 'SOS_NOT_FOUND');
    }

    const full = await sosRepository.getById(pool, sosId);

    await notifyUsers([full.patient_id], {
      title: 'Ambulance assigned',
      body: `${full.ambulance_call_sign || 'Unit'} (${full.ambulance_vehicle_no || '—'}) accepted your SOS. Driver: ${full.ambulance_driver_name || 'on the way'}.`,
      data: { type: 'SOS_ACCEPTED', sosId },
    });

    await broadcastRealtimeEvent({
      event: 'sos:accepted',
      room: `user:${full.patient_id}`,
      payload: mapSos(full),
    });
    await broadcastRealtimeEvent({
      event: 'sos:accepted',
      room: 'ambulance:city',
      payload: { sosId, status: 'ACCEPTED', ambulanceId: amb.id },
    });
    if (amb.hospital_id) {
      await broadcastRealtimeEvent({
        event: 'sos:accepted',
        room: `hospital:${amb.hospital_id}`,
        payload: mapSos(full),
      });
    }

    return mapSos(full);
  },

  async updateStatus(user, sosId, { status, destinationHospitalId }) {
    const allowed = ['EN_ROUTE', 'ARRIVED', 'COMPLETED', 'CANCELLED'];
    if (!allowed.includes(status)) {
      throw new AppError('Invalid status transition', 400, 'INVALID_STATUS');
    }
    const amb = await sosRepository.getAmbulanceByUser(pool, user.id);
    if (!amb) throw new AppError('Ambulance profile not registered', 400, 'AMBULANCE_NOT_FOUND');

    const current = await sosRepository.getById(pool, sosId);
    if (!current) throw new AppError('SOS not found', 404, 'SOS_NOT_FOUND');
    if (current.accepted_ambulance_id !== amb.id) {
      throw new AppError('Only the assigned ambulance can update this SOS', 403, 'FORBIDDEN');
    }

    const updated = await sosRepository.updateSosStatus(pool, {
      sosId,
      status,
      ambulanceId: amb.id,
      destinationHospitalId,
    });

    if (status === 'COMPLETED' || status === 'CANCELLED') {
      await sosRepository.releaseAmbulance(pool, amb.id);
    } else if (status === 'EN_ROUTE') {
      await pool.query(`UPDATE ambulances SET status = 'EN_ROUTE', updated_at = NOW() WHERE id = $1`, [
        amb.id,
      ]);
    }

    const full = await sosRepository.getById(pool, sosId);
    await notifyUsers([full.patient_id], {
      title: `Ambulance ${status.replace('_', ' ').toLowerCase()}`,
      body: `${full.ambulance_call_sign || 'Your ambulance'} is now ${status}.`,
      data: { type: 'SOS_STATUS', sosId, status },
    });
    await broadcastRealtimeEvent({
      event: 'sos:status',
      room: `user:${full.patient_id}`,
      payload: mapSos(full),
    });

    return mapSos(full);
  },

  async cancel(patientId, sosId, reason) {
    const row = await sosRepository.cancelByPatient(pool, { sosId, patientId, reason });
    if (!row) throw new AppError('Cannot cancel this SOS', 400, 'CANCEL_FAILED');
    if (row.accepted_ambulance_id) {
      await sosRepository.releaseAmbulance(pool, row.accepted_ambulance_id);
      if (row.accepted_by_user_id) {
        await notifyUsers([row.accepted_by_user_id], {
          title: 'SOS cancelled by patient',
          body: 'The patient cancelled the emergency request.',
          data: { type: 'SOS_CANCELLED', sosId },
        });
      }
    }
    await broadcastRealtimeEvent({
      event: 'sos:cancelled',
      room: 'ambulance:city',
      payload: { sosId, status: 'CANCELLED' },
    });
    return mapSos(await sosRepository.getById(pool, sosId));
  },

  async getMyAmbulance(userId) {
    const amb = await sosRepository.getAmbulanceByUser(pool, userId);
    if (!amb) return null;
    return {
      id: amb.id,
      callSign: amb.call_sign,
      vehicleNo: amb.vehicle_no,
      type: amb.ambulance_type,
      phone: amb.phone,
      status: amb.status,
      hospitalId: amb.hospital_id,
      hospitalName: amb.hospital_name,
      latitude: amb.latitude != null ? Number(amb.latitude) : null,
      longitude: amb.longitude != null ? Number(amb.longitude) : null,
      lastLocationAt: amb.last_location_at,
    };
  },

  async heartbeat(user, { latitude, longitude, status }) {
    const lng = Number(longitude);
    const lat = Number(latitude);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      throw new AppError('Valid coordinates required', 400, 'INVALID_COORDINATES');
    }
    const row = await sosRepository.updateAmbulanceLocation(pool, {
      userId: user.id,
      lng,
      lat,
      status,
    });
    if (!row) throw new AppError('Ambulance profile not registered', 400, 'AMBULANCE_NOT_FOUND');
    return {
      id: row.id,
      status: row.status,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
    };
  },

  async listHospital(hospitalId) {
    const rows = await sosRepository.listHospitalSos(pool, hospitalId);
    return rows.map(mapSos);
  },
};
