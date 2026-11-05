import { pool } from '../../infra/db.js';

export const conditionsRepository = {
  /**
   * Fast autocomplete search matching condition name, code, ICD-10, and aliases
   */
  async search(db = pool, { q = '', limit = 20, category = null } = {}) {
    const params = [];
    const conditions = [];

    if (q && q.trim().length > 0) {
      params.push(`%${q.trim()}%`);
      const paramIdx = params.length;
      conditions.push(`(
        c.name ILIKE $${paramIdx} OR 
        c.code ILIKE $${paramIdx} OR 
        c.icd10 ILIKE $${paramIdx} OR 
        EXISTS (SELECT 1 FROM unnest(c.aliases) a WHERE a ILIKE $${paramIdx})
      )`);
    }

    if (category) {
      params.push(category);
      conditions.push(`c.category = $${params.length}`);
    }

    params.push(limit);
    const limitIdx = params.length;

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT c.id, c.code, c.name, c.aliases, c.icd10, c.category, c.severity_default, c.created_at,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', cr.id,
                   'kind', cr.kind,
                   'value', cr.value,
                   'qty', cr.qty,
                   'mandatory', cr.mandatory,
                   'preferenceOrder', cr.preference_order
                 ) ORDER BY cr.preference_order ASC, cr.kind ASC
               ) FILTER (WHERE cr.id IS NOT NULL),
               '[]'
             ) AS requirements
      FROM conditions c
      LEFT JOIN condition_requirements cr ON c.id = cr.condition_id
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.name ASC
      LIMIT $${limitIdx};
    `;

    const { rows } = await db.query(query, params);
    return rows;
  },

  async listAll(db = pool) {
    return this.search(db, { limit: 200 });
  },

  async findByIdOrCode(db = pool, idOrCode) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrCode);
    
    const query = `
      SELECT c.id, c.code, c.name, c.aliases, c.icd10, c.category, c.severity_default, c.created_at,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', cr.id,
                   'kind', cr.kind,
                   'value', cr.value,
                   'qty', cr.qty,
                   'mandatory', cr.mandatory,
                   'preferenceOrder', cr.preference_order
                 ) ORDER BY cr.preference_order ASC, cr.kind ASC
               ) FILTER (WHERE cr.id IS NOT NULL),
               '[]'
             ) AS requirements
      FROM conditions c
      LEFT JOIN condition_requirements cr ON c.id = cr.condition_id
      WHERE ${isUuid ? 'c.id = $1' : 'UPPER(c.code) = UPPER($1)'}
      GROUP BY c.id;
    `;

    const { rows } = await db.query(query, [idOrCode]);
    return rows[0] || null;
  },

  async findByCode(db = pool, code) {
    return this.findByIdOrCode(db, code);
  },

  async create(client, { code, name, aliases = [], icd10 = null, category, severityDefault }) {
    const query = `
      INSERT INTO conditions (code, name, aliases, icd10, category, severity_default)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, code, name, aliases, icd10, category, severity_default, created_at;
    `;
    const { rows } = await client.query(query, [
      code.toUpperCase(),
      name,
      aliases,
      icd10,
      category,
      severityDefault
    ]);
    return rows[0];
  },

  async update(client, id, fields) {
    const setClauses = [];
    const values = [];

    if (fields.name !== undefined) {
      values.push(fields.name);
      setClauses.push(`name = $${values.length}`);
    }
    if (fields.aliases !== undefined) {
      values.push(fields.aliases);
      setClauses.push(`aliases = $${values.length}`);
    }
    if (fields.icd10 !== undefined) {
      values.push(fields.icd10);
      setClauses.push(`icd10 = $${values.length}`);
    }
    if (fields.category !== undefined) {
      values.push(fields.category);
      setClauses.push(`category = $${values.length}`);
    }
    if (fields.severityDefault !== undefined) {
      values.push(fields.severityDefault);
      setClauses.push(`severity_default = $${values.length}`);
    }

    if (setClauses.length === 0) {
      return this.findByIdOrCode(client, id);
    }

    values.push(id);
    const query = `
      UPDATE conditions
      SET ${setClauses.join(', ')}
      WHERE id = $${values.length}
      RETURNING id, code, name, aliases, icd10, category, severity_default, created_at;
    `;

    const { rows } = await client.query(query, values);
    return rows[0] || null;
  },

  async delete(client, id) {
    const query = 'DELETE FROM conditions WHERE id = $1 RETURNING id;';
    const { rows } = await client.query(query, [id]);
    return rows.length > 0;
  },

  async replaceRequirements(client, conditionId, requirements = []) {
    await client.query('DELETE FROM condition_requirements WHERE condition_id = $1;', [conditionId]);

    if (!requirements || requirements.length === 0) {
      return [];
    }

    const inserted = [];
    for (const req of requirements) {
      const query = `
        INSERT INTO condition_requirements (condition_id, kind, value, qty, mandatory, preference_order)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, kind, value, qty, mandatory, preference_order AS "preferenceOrder";
      `;
      const { rows } = await client.query(query, [
        conditionId,
        req.kind,
        req.value,
        req.qty ?? 1,
        req.mandatory !== undefined ? req.mandatory : true,
        req.preferenceOrder ?? 1
      ]);
      inserted.push(rows[0]);
    }
    return inserted;
  }
};
