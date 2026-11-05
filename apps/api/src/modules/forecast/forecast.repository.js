import { pool } from '../../infra/db.js';

export const forecastRepository = {
  /**
   * Retrieves hourly flow data for the past 28 days
   */
  async getHourlyFlowHistory(db = pool, hospitalId, wardType, days = 28) {
    const query = `
      SELECT hour_start, admissions, discharges
      FROM bed_flow_hourly
      WHERE hospital_id = $1
        AND ward_type = $2
        AND hour_start >= NOW() - make_interval(days => $3::int)
      ORDER BY hour_start ASC
      LIMIT 800;
    `;
    const { rows } = await db.query(query, [hospitalId, wardType, days]);
    return rows;
  },

  /**
   * Count known future scheduled discharges in window [NOW(), NOW() + horizon hours]
   */
  async getScheduledDischarges(db = pool, hospitalId, wardType, horizonHours = 6) {
    const query = `
      SELECT COUNT(*)::int AS count
      FROM expected_discharges
      WHERE hospital_id = $1 
        AND ward_type = $2 
        AND expected_at >= NOW() 
        AND expected_at <= NOW() + ($3 || ' hours')::interval;
    `;
    const { rows } = await db.query(query, [hospitalId, wardType, horizonHours]);
    return rows[0]?.count || 0;
  },

  /**
   * Fetches current inventory with derived free beds
   */
  async getWardInventory(db = pool, hospitalId, wardType) {
    const query = `
      SELECT id, hospital_id, ward_type, total, occupied, reserved, cleaning, maintenance,
             has_ventilator_beds,
             GREATEST(0, total - (occupied + reserved + cleaning + maintenance)) AS free
      FROM bed_inventory
      WHERE hospital_id = $1 AND ward_type = $2;
    `;
    const { rows } = await db.query(query, [hospitalId, wardType]);
    return rows[0] || null;
  },

  /**
   * Fetches equipment and historical duration of IN_USE status
   */
  async getEquipmentWithHistory(db = pool, hospitalId, equipmentType = null) {
    let eqQuery = `
      SELECT id, hospital_id, type, name, model, serial_no, status, available_at, criticality, updated_at
      FROM equipment
      WHERE hospital_id = $1
    `;
    const params = [hospitalId];
    if (equipmentType) {
      params.push(equipmentType.toUpperCase());
      eqQuery += ' AND type = $2';
    }
    eqQuery += ' ORDER BY type ASC, status ASC;';

    const { rows: equipmentRows } = await db.query(eqQuery, params);

    // Compute empirical average in-use duration from telemetry log
    const durationQuery = `
      WITH transitions AS (
        SELECT equipment_id, at AS start_time,
               LEAD(at) OVER (PARTITION BY equipment_id ORDER BY at ASC) AS end_time,
               old_status, new_status
        FROM equipment_status_log
      )
      SELECT AVG(EXTRACT(EPOCH FROM (end_time - start_time)) / 60)::numeric(10, 1) AS avg_duration_minutes
      FROM transitions
      WHERE new_status = 'IN_USE' AND end_time IS NOT NULL;
    `;
    const { rows: durationRows } = await db.query(durationQuery);
    const avgUsageMinutes = durationRows[0]?.avg_duration_minutes ? Number(durationRows[0].avg_duration_minutes) : 60;

    return {
      equipment: equipmentRows,
      avgUsageMinutes
    };
  },

  /**
   * Fetches all live bed inventories across all verified hospitals for snapshot generation
   */
  async getAllActiveWardInventories(db = pool) {
    const query = `
      SELECT bi.hospital_id, bi.ward_type, bi.total, bi.occupied, bi.reserved,
             GREATEST(0, bi.total - (bi.occupied + bi.reserved + bi.cleaning + bi.maintenance)) AS free
      FROM bed_inventory bi
      JOIN hospitals h ON bi.hospital_id = h.id
      WHERE h.status = 'VERIFIED';
    `;
    const { rows } = await db.query(query);
    return rows;
  },

  /**
   * Inserts a point-in-time snapshot into bed_snapshots
   */
  async insertSnapshots(client, snapshots = []) {
    if (snapshots.length === 0) return 0;

    for (const s of snapshots) {
      await client.query(`
        INSERT INTO bed_snapshots (hospital_id, ward_type, at, total, occupied, reserved, free)
        VALUES ($1, $2, NOW(), $3, $4, $5, $6);
      `, [s.hospital_id, s.ward_type, s.total, s.occupied, s.reserved, s.free]);
    }
    return snapshots.length;
  }
};

