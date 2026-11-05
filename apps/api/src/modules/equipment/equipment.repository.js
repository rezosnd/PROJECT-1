import { pool } from '../../infra/db.js';

export const equipmentRepository = {
  async listByHospital(db = pool, hospitalId, filters = {}) {
    const conditions = ['hospital_id = $1'];
    const values = [hospitalId];
    let paramIndex = 2;

    if (filters.type) {
      conditions.push(`type = $${paramIndex++}`);
      values.push(filters.type.toUpperCase());
    }
    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }
    if (filters.criticality) {
      conditions.push(`criticality = $${paramIndex++}`);
      values.push(filters.criticality);
    }

    const { rows } = await db.query(
      `SELECT id, hospital_id, type, name, model, serial_no, status, available_at, criticality, created_at, updated_at
       FROM equipment
       WHERE ${conditions.join(' AND ')}
       ORDER BY criticality = 'CRITICAL' DESC, type ASC, name ASC`,
      values
    );
    return rows;
  },

  async getSummaryByHospital(db = pool, hospitalId) {
    const { rows } = await db.query(
      `SELECT
         type,
         status,
         COUNT(*)::int as count
       FROM equipment
       WHERE hospital_id = $1
       GROUP BY type, status
       ORDER BY type ASC`,
      [hospitalId]
    );

    const summary = {
      total: 0,
      available: 0,
      inUse: 0,
      maintenance: 0,
      faulty: 0,
      offline: 0,
      byType: {}
    };

    for (const r of rows) {
      const count = parseInt(r.count, 10);
      summary.total += count;

      if (!summary.byType[r.type]) {
        summary.byType[r.type] = {
          total: 0,
          available: 0,
          inUse: 0,
          maintenance: 0,
          faulty: 0,
          offline: 0
        };
      }

      summary.byType[r.type].total += count;

      switch (r.status) {
        case 'AVAILABLE':
          summary.available += count;
          summary.byType[r.type].available += count;
          break;
        case 'IN_USE':
          summary.inUse += count;
          summary.byType[r.type].inUse += count;
          break;
        case 'MAINTENANCE':
          summary.maintenance += count;
          summary.byType[r.type].maintenance += count;
          break;
        case 'FAULTY':
          summary.faulty += count;
          summary.byType[r.type].faulty += count;
          break;
        case 'OFFLINE':
          summary.offline += count;
          summary.byType[r.type].offline += count;
          break;
      }
    }

    return summary;
  },

  async findById(db = pool, id) {
    const { rows } = await db.query(
      `SELECT e.id, e.hospital_id, e.type, e.name, e.model, e.serial_no, e.status, e.available_at,
              e.criticality, e.created_at, e.updated_at,
              h.name as hospital_name, h.address as hospital_address, h.phone as hospital_phone,
              ST_Y(h.location::geometry) as hospital_lat,
              ST_X(h.location::geometry) as hospital_lng
       FROM equipment e
       JOIN hospitals h ON e.hospital_id = h.id
       WHERE e.id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async findByIdForUpdate(client, id) {
    const { rows } = await client.query(
      `SELECT * FROM equipment WHERE id = $1 FOR UPDATE`,
      [id]
    );
    return rows[0] || null;
  },

  async create(client, { hospitalId, type, name, model, serialNo, status, criticality, availableAt }) {
    const { rows } = await client.query(
      `INSERT INTO equipment (
        hospital_id, type, name, model, serial_no, status, criticality, available_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *`,
      [hospitalId, type.toUpperCase(), name, model || null, serialNo, status || 'AVAILABLE', criticality || 'NORMAL', availableAt || null]
    );
    return rows[0];
  },

  /**
   * Distributed Systems Note: Append-only equipment status transition audit log.
   */
  async updateStatus(client, { equipmentId, newStatus, availableAt, actorId }) {
    const { rows: currentRows } = await client.query(
      'SELECT status FROM equipment WHERE id = $1 FOR UPDATE',
      [equipmentId]
    );
    if (!currentRows[0]) return null;

    const oldStatus = currentRows[0].status;

    const { rows: updatedRows } = await client.query(
      `UPDATE equipment
       SET status = $2,
           available_at = $3,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [equipmentId, newStatus, availableAt !== undefined ? availableAt : null]
    );

    // Record immutable audit transition
    await client.query(
      `INSERT INTO equipment_status_log (equipment_id, old_status, new_status, at, actor_id)
       VALUES ($1, $2, $3, NOW(), $4)`,
      [equipmentId, oldStatus, newStatus, actorId]
    );

    return {
      equipment: updatedRows[0],
      oldStatus,
      newStatus
    };
  },

  /**
   * Distributed Systems Note: Spatial equipment discovery with PostGIS ST_DWithin.
   * Finds nearest hospitals with matching active equipment.
   */
  async searchEquipment(db = pool, { type, status = 'AVAILABLE', lat, lng, radiusKm = 30, limit = 20, offset = 0 }) {
    const conditions = ['h.status = \'VERIFIED\''];
    const values = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`e.status = $${paramIndex++}`);
      values.push(status);
    }

    if (type) {
      conditions.push(`e.type = $${paramIndex++}`);
      values.push(type.toUpperCase());
    }

    let spatialSelect = 'NULL as distance_meters';
    let orderBy = 'e.criticality = \'CRITICAL\' DESC, h.name ASC';

    if (lat !== undefined && lng !== undefined) {
      const geoPoint = `ST_SetSRID(ST_MakePoint($${paramIndex++}, $${paramIndex++}), 4326)::geography`;
      values.push(lng, lat);

      conditions.push(`ST_DWithin(h.location, ${geoPoint}, $${paramIndex++})`);
      values.push(radiusKm * 1000); // meters

      spatialSelect = `ROUND(ST_Distance(h.location, ${geoPoint})) as distance_meters`;
      orderBy = 'distance_meters ASC';
    }

    values.push(limit, offset);

    const query = `
      SELECT e.id, e.hospital_id, e.type, e.name, e.model, e.serial_no, e.status, e.available_at,
             e.criticality, e.updated_at,
             h.name as hospital_name, h.address as hospital_address, h.phone as hospital_phone,
             h.emergency_24x7,
             ST_Y(h.location::geometry) as hospital_lat,
             ST_X(h.location::geometry) as hospital_lng,
             ${spatialSelect}
      FROM equipment e
      JOIN hospitals h ON e.hospital_id = h.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const { rows } = await db.query(query, values);
    return rows;
  }
};
