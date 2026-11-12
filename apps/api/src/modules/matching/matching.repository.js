import { pool } from '../../infra/db.js';

export const matchingRepository = {
  /**
   * PostGIS candidate discovery finding verified hospitals within radiusKm
   * Longitude is passed first to ST_MakePoint(lng, lat)
   */
  async findCandidatesWithinRadius(db = pool, { lat, lng, radiusMeters = 25000, maxCandidates = 100 }) {
    const query = `
      SELECT 
        h.id, h.name, h.type, h.address, h.city, h.pin, h.phone, h.email,
        h.emergency_24x7, h.trauma_level, h.rating_avg, h.specialties, h.facilities,
        ST_Y(h.location::geometry) AS latitude,
        ST_X(h.location::geometry) AS longitude,
        ST_Distance(h.location, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) AS distance_meters,
        COALESCE(
          (SELECT json_agg(json_build_object(
             'wardType', bi.ward_type,
             'total', bi.total,
             'occupied', bi.occupied,
             'reserved', bi.reserved,
             'cleaning', bi.cleaning,
             'maintenance', bi.maintenance,
             'hasVentilatorBeds', bi.has_ventilator_beds,
             'free', GREATEST(0, bi.total - (bi.occupied + bi.reserved + bi.cleaning + bi.maintenance))
           )) FROM bed_inventory bi WHERE bi.hospital_id = h.id),
          '[]'
        ) AS beds,
        COALESCE(
          (SELECT json_agg(json_build_object(
             'id', eq.id,
             'type', eq.type,
             'name', eq.name,
             'status', eq.status,
             'criticality', eq.criticality,
             'availableAt', eq.available_at
           )) FROM equipment eq WHERE eq.hospital_id = h.id),
          '[]'
        ) AS equipment,
        COALESCE(
          (SELECT array_agg(hi.insurer_id::text)
           FROM hospital_insurers hi
           WHERE hi.hospital_id = h.id),
          ARRAY[]::text[]
        ) AS accepted_insurer_ids,
        COALESCE(
          (SELECT json_agg(json_build_object(
              'insurerId', hi.insurer_id::text,
              'cashless', hi.cashless,
              'discountPercent', COALESCE(hi.discount_percent, 0),
              'benefits', COALESCE(hi.benefits, '[]'::jsonb),
              'planLabel', hi.plan_label
            ))
           FROM hospital_insurers hi
           WHERE hi.hospital_id = h.id),
          '[]'::json
        ) AS insurance_network
      FROM hospitals h
      WHERE h.status = 'VERIFIED'
        AND ST_DWithin(h.location, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)
      ORDER BY distance_meters ASC
      LIMIT $4;
    `;

    const { rows } = await db.query(query, [lat, lng, radiusMeters, maxCandidates]);
    return rows;
  }
};

