import crypto from 'node:crypto';
import { pool, withTransaction } from '../../infra/db.js';
import { redis, isRedisAvailable } from '../../infra/redis.js';
import { logger } from '../../infra/logger.js';
import { hospitalsRepository } from './hospitals.repository.js';
import { AppError } from '../../middleware/error-handler.js';
import { broadcastRealtimeEvent } from '../realtime/realtime.service.js';
import { cloudinaryService } from '../../infra/cloudinary.js';
import { emailService } from '../../infra/email.js';

// Distributed Systems Note: Single-flight Pattern (Request Coalescing).
// Under sudden traffic spikes (e.g. city-wide emergency), hundreds of concurrent queries for the same location
// could miss cache simultaneously and cause a cache stampede on PostGIS.
// Single-flight ensures exactly one database query runs, and all concurrent promises resolve to the identical result.
const inFlightSearches = new Map();

function generateCacheKey(params) {
  const normalized = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {});
  const hash = crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex').slice(0, 16);
  return `hospitals:search:${hash}`;
}

export const hospitalsService = {
  /**
   * Search hospitals with PostGIS, 30s Redis cache-aside, and single-flight request coalescing
   */
  async searchHospitals(params) {
    const cacheKey = generateCacheKey(params);

    // 1. Check Redis Cache
    if (isRedisAvailable()) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        logger.warn({ err: err.message }, '[Hospitals Cache] Redis read failed; falling back to PostGIS');
      }
    }

    // 2. Single-flight coalescing
    if (inFlightSearches.has(cacheKey)) {
      return await inFlightSearches.get(cacheKey);
    }

    const queryPromise = (async () => {
      try {
        const result = await hospitalsRepository.searchHospitals(pool, params);

        // 3. Populate Redis Cache (TTL: 30 seconds)
        if (isRedisAvailable()) {
          redis.set(cacheKey, JSON.stringify(result), 'EX', 30).catch(err => {
            logger.warn({ err: err.message }, '[Hospitals Cache] Failed to cache search results');
          });
        }

        return result;
      } finally {
        inFlightSearches.delete(cacheKey);
      }
    })();

    inFlightSearches.set(cacheKey, queryPromise);
    return await queryPromise;
  },

  async getHospitalById(id) {
    const hospital = await hospitalsRepository.findByIdWithSummary(pool, id);
    if (!hospital) {
      throw new AppError('Hospital not found', 404, 'HOSPITAL_NOT_FOUND');
    }
    return hospital;
  },

  async createHospital(data, actorId) {
    return await withTransaction(async (client) => {
      const hospital = await hospitalsRepository.createHospital(client, data);

      await client.query(
        `INSERT INTO audit_log (actor_id, action, resource_type, resource_id, at)
         VALUES ($1, 'HOSPITAL_CREATED', 'HOSPITAL', $2, NOW())`,
        [actorId, hospital.id]
      );

      this.invalidateCache();

      // Transmit hospital registration confirmation email asynchronously
      if (hospital.email) {
        emailService.sendHospitalRegistrationEmail({
          to: hospital.email,
          hospitalName: hospital.name,
          registrationNo: hospital.registration_no,
          traumaLevel: hospital.trauma_level,
          photoUrl: hospital.photo_url || null
        }).catch(() => {});
      }

      broadcastRealtimeEvent({
        event: 'hospital:created',
        room: 'city',
        payload: { hospitalId: hospital.id, name: hospital.name }
      });

      return hospital;
    });
  },

  async updateHospital(id, data, actor) {
    // Tenant check: Staff can only touch their own hospital
    if (actor.role === 'HOSPITAL_STAFF' || actor.role === 'HOSPITAL_ADMIN') {
      if (actor.hospitalId !== id) {
        throw new AppError('Tenant access denied. Staff can only edit their own hospital.', 403, 'TENANT_ACCESS_DENIED');
      }
    } else if (actor.role !== 'CITY_ADMIN') {
      throw new AppError('Insufficient privileges to modify hospital directory', 403, 'FORBIDDEN');
    }

    return await withTransaction(async (client) => {
      const updated = await hospitalsRepository.updateHospital(client, id, data);
      if (!updated) {
        throw new AppError('Hospital not found', 404, 'HOSPITAL_NOT_FOUND');
      }

      await client.query(
        `INSERT INTO audit_log (actor_id, action, resource_type, resource_id, at)
         VALUES ($1, 'HOSPITAL_UPDATED', 'HOSPITAL', $2, NOW())`,
        [actor.sub, id]
      );

      this.invalidateCache();

      // Transmit hospital update confirmation email asynchronously
      if (updated.email) {
        emailService.sendHospitalRegistrationEmail({
          to: updated.email,
          hospitalName: updated.name,
          registrationNo: updated.registration_no,
          traumaLevel: updated.trauma_level,
          photoUrl: updated.photo_url || null
        }).catch(() => {});
      }

      broadcastRealtimeEvent({
        event: 'hospital:updated',
        room: `hospital:${id}`,
        payload: { hospitalId: id, name: updated.name }
      });

      return updated;
    });
  },

  async verifyHospital(id, status, actorId) {
    const updated = await hospitalsRepository.verifyHospital(pool, id, status);
    if (!updated) {
      throw new AppError('Hospital not found', 404, 'HOSPITAL_NOT_FOUND');
    }

    await pool.query(
      `INSERT INTO audit_log (actor_id, action, resource_type, resource_id, meta, at)
       VALUES ($1, 'HOSPITAL_STATUS_CHANGED', 'HOSPITAL', $2, $3, NOW())`,
      [actorId, id, JSON.stringify({ status })]
    );

    this.invalidateCache();
    return updated;
  },

  async uploadHospitalPhoto(hospitalId, imageData, actor) {
    if (!imageData) {
      throw new AppError('Image payload (base64 data URI or image URL) is required', 400, 'INVALID_IMAGE');
    }

    const uploadRes = await cloudinaryService.uploadHospitalPhoto({
      hospitalId,
      image: imageData
    });

    await pool.query(
      `UPDATE hospitals SET photo_url = $1, updated_at = NOW() WHERE id = $2`,
      [uploadRes.url, hospitalId]
    );

    this.invalidateCache();
    return {
      hospitalId,
      photoUrl: uploadRes.url,
      publicId: uploadRes.publicId
    };
  },

  async uploadAsset(imageData, folder) {
    if (!imageData) {
      throw new AppError('Image payload is required', 400, 'INVALID_IMAGE');
    }
    return await cloudinaryService.uploadHospitalPhoto({
      hospitalId: `asset_${Date.now()}`,
      image: imageData,
      folder: folder || 'lifelink/assets'
    });
  },

  /**
   * Distributed Systems Note: Active Cache Invalidation on Mutation.
   * Whenever hospital metadata is created, modified, or verified, we invalidate search cache keys
   * to prevent serving stale discovery lists to ambulance dispatchers and emergency patients.
   */
  async invalidateCache() {
    if (!isRedisAvailable()) return;
    try {
      const keys = await redis.keys('hospitals:search:*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (err) {
      logger.warn({ err: err.message }, '[Hospitals Cache] Failed to invalidate cache keys');
    }
  }
};

