import { matchingService } from '../matching/matching.service.js';
import { pool } from '../../infra/db.js';
import { bloodService } from '../blood/blood.service.js';

/**
 * Controlled tool functions the AI may request — never arbitrary SQL from the model.
 */
export const aiTools = {
  async searchNearbyHospitals({ lat, lng, radiusKm = 20, q = null, severity = null, limit = 8, patientId = null }) {
    if (lat == null || lng == null || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) {
      return { ok: false, error: 'Valid latitude and longitude are required' };
    }
    const result = await matchingService.findMatches({
      q: q || 'Trauma',
      lat: Number(lat),
      lng: Number(lng),
      radiusKm: Math.min(50, Number(radiusKm) || 20),
      severity,
      limit: Math.min(15, Number(limit) || 8),
      patientId,
    });
    return {
      ok: true,
      condition: result.condition,
      matches: (result.matches || []).map((m) => ({
        hospitalId: m.hospitalId,
        name: m.hospitalName,
        distanceKm: m.distanceKm,
        etaMinutes: m.etaMinutes,
        matchScore: m.matchScore,
        freeBedsNow: m.freeBedsNow,
        allocatedWard: m.allocatedWard,
        explanation: m.explanation,
        insuranceCoverage: m.insuranceCoverage,
        phone: m.phone,
        address: m.address,
        traumaLevel: m.traumaLevel,
        location: m.location,
        forecast: m.forecast,
      })),
      excludedCount: result.excludedCount,
      disclaimer: result.disclaimer,
      timestamp: result.timestamp,
    };
  },

  async getHospitalDetails(hospitalId) {
    const { rows } = await pool.query(
      `SELECT id, name, type, address, city, pin, phone, email, emergency_24x7, trauma_level,
              specialties, facilities, rating_avg, status, has_blood_bank, blood_bank_phone,
              ST_Y(location::geometry) AS latitude,
              ST_X(location::geometry) AS longitude,
              updated_at
       FROM hospitals WHERE id = $1`,
      [hospitalId]
    );
    const h = rows[0];
    if (!h) return { ok: false, error: 'Hospital not found' };
    return {
      ok: true,
      hospital: {
        id: h.id,
        name: h.name,
        type: h.type,
        address: h.address,
        city: h.city,
        pin: h.pin,
        phone: h.phone,
        email: h.email,
        emergency24x7: h.emergency_24x7,
        traumaLevel: h.trauma_level,
        specialties: h.specialties || [],
        facilities: h.facilities || [],
        ratingAvg: Number(h.rating_avg || 0),
        status: h.status,
        hasBloodBank: Boolean(h.has_blood_bank),
        bloodBankPhone: h.blood_bank_phone,
        latitude: Number(h.latitude),
        longitude: Number(h.longitude),
        updatedAt: h.updated_at,
      },
    };
  },

  async getHospitalBedAvailability(hospitalId) {
    const { rows } = await pool.query(
      `SELECT ward_type, total, occupied, reserved, cleaning, maintenance,
              GREATEST(0, total - occupied - reserved - cleaning - maintenance) AS free,
              updated_at
       FROM bed_inventory WHERE hospital_id = $1 ORDER BY ward_type`,
      [hospitalId]
    );
    return {
      ok: true,
      wards: rows.map((r) => ({
        wardType: r.ward_type,
        total: Number(r.total),
        occupied: Number(r.occupied),
        reserved: Number(r.reserved),
        free: Number(r.free),
        updatedAt: r.updated_at,
      })),
      timestamp: new Date().toISOString(),
    };
  },

  async getHospitalEquipment(hospitalId) {
    const { rows } = await pool.query(
      `SELECT id, type, name, status, criticality, available_at, updated_at
       FROM equipment WHERE hospital_id = $1 ORDER BY type, name`,
      [hospitalId]
    );
    return {
      ok: true,
      equipment: rows.map((r) => ({
        id: r.id,
        type: r.type,
        name: r.name,
        status: r.status,
        criticality: r.criticality,
        availableAt: r.available_at,
        updatedAt: r.updated_at,
      })),
      summary: {
        total: rows.length,
        available: rows.filter((r) => r.status === 'AVAILABLE').length,
        inUse: rows.filter((r) => r.status === 'IN_USE').length,
        maintenance: rows.filter((r) => ['MAINTENANCE', 'FAULTY', 'OFFLINE'].includes(r.status)).length,
      },
    };
  },

  async getEmergencyFacilities({ lat, lng, radiusKm = 25 }) {
    return this.searchNearbyHospitals({
      lat,
      lng,
      radiusKm,
      q: 'Trauma',
      severity: 'CRITICAL',
      limit: 10,
    });
  },

  async searchBloodBanks({ lat, lng, bloodGroup, component = 'PRBC' }) {
    if (lat == null || lng == null) return { ok: false, error: 'Location required' };
    const data = await bloodService.search({
      bloodGroup,
      component,
      lat: Number(lat),
      lng: Number(lng),
      radiusKm: 30,
      limit: 10,
    });
    return { ok: true, ...data };
  },

  async searchMedicalKnowledge(query, { limit = 5, language = 'en' } = {}) {
    const q = String(query || '').trim();
    if (!q) return { ok: true, articles: [] };
    const { rows } = await pool.query(
      `SELECT id, title, content, category, source_name, source_url, language,
              ts_rank(search_vector, plainto_tsquery('english', $1)) AS rank
       FROM medical_knowledge
       WHERE verification_status = 'VERIFIED'
         AND (language = $2 OR language = 'en')
         AND search_vector @@ plainto_tsquery('english', $1)
       ORDER BY rank DESC
       LIMIT $3`,
      [q, language, limit]
    );
    // Fallback ILIKE if FTS misses
    if (!rows.length) {
      const { rows: soft } = await pool.query(
        `SELECT id, title, content, category, source_name, source_url, language, 0.1 AS rank
         FROM medical_knowledge
         WHERE verification_status = 'VERIFIED'
           AND (title ILIKE $1 OR content ILIKE $1 OR category ILIKE $1)
         ORDER BY updated_at DESC
         LIMIT $2`,
        [`%${q.split(/\s+/)[0]}%`, limit]
      );
      return {
        ok: true,
        articles: soft.map((r) => ({
          id: r.id,
          title: r.title,
          excerpt: r.content.slice(0, 600),
          category: r.category,
          sourceName: r.source_name,
          sourceUrl: r.source_url,
        })),
      };
    }
    return {
      ok: true,
      articles: rows.map((r) => ({
        id: r.id,
        title: r.title,
        excerpt: r.content.slice(0, 800),
        category: r.category,
        sourceName: r.source_name,
        sourceUrl: r.source_url,
        rank: Number(r.rank),
      })),
    };
  },
};
