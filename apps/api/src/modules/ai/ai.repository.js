import { pool } from '../../infra/db.js';

export const aiRepository = {
  async createSession(db = pool, { userId, language = 'en', title = null, severity = 'NORMAL', meta = {} }) {
    const { rows } = await db.query(
      `INSERT INTO ai_sessions (user_id, language, title, severity, meta)
       VALUES ($1,$2,$3,$4,$5::jsonb) RETURNING *`,
      [userId || null, language, title, severity, JSON.stringify(meta)]
    );
    return rows[0];
  },

  async getSession(db = pool, id, userId = null) {
    const { rows } = await db.query(
      `SELECT * FROM ai_sessions WHERE id = $1 AND ($2::uuid IS NULL OR user_id = $2 OR user_id IS NULL)`,
      [id, userId]
    );
    return rows[0] || null;
  },

  async listSessions(db = pool, userId, { limit = 30 } = {}) {
    const { rows } = await db.query(
      `SELECT id, title, language, severity, created_at, updated_at
       FROM ai_sessions WHERE user_id = $1
       ORDER BY updated_at DESC LIMIT $2`,
      [userId, limit]
    );
    return rows;
  },

  async touchSession(db = pool, id, { severity, title } = {}) {
    const { rows } = await db.query(
      `UPDATE ai_sessions SET
         severity = COALESCE($2, severity),
         title = COALESCE($3, title),
         updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, severity || null, title || null]
    );
    return rows[0];
  },

  async addMessage(db = pool, row) {
    const { rows } = await db.query(
      `INSERT INTO ai_messages (
         session_id, role, content, severity, tool_calls, tool_results, sources, hospitals, meta
       ) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb)
       RETURNING *`,
      [
        row.sessionId,
        row.role,
        row.content,
        row.severity || null,
        JSON.stringify(row.toolCalls || null),
        JSON.stringify(row.toolResults || null),
        JSON.stringify(row.sources || null),
        JSON.stringify(row.hospitals || null),
        JSON.stringify(row.meta || {}),
      ]
    );
    return rows[0];
  },

  async listMessages(db = pool, sessionId, { limit = 100 } = {}) {
    const { rows } = await db.query(
      `SELECT * FROM ai_messages WHERE session_id = $1 ORDER BY created_at ASC LIMIT $2`,
      [sessionId, limit]
    );
    return rows;
  },

  async createEmergency(db = pool, row) {
    const { rows } = await db.query(
      `INSERT INTO emergency_events (
         user_id, session_id, severity, trigger_text, latitude, longitude,
         status, recommended_hospitals, meta
       ) VALUES ($1,$2,$3,$4,$5,$6,'OPEN',$7::jsonb,$8::jsonb)
       RETURNING *`,
      [
        row.userId || null,
        row.sessionId || null,
        row.severity || 'CRITICAL',
        row.triggerText || null,
        row.latitude ?? null,
        row.longitude ?? null,
        JSON.stringify(row.recommendedHospitals || []),
        JSON.stringify(row.meta || {}),
      ]
    );
    return rows[0];
  },

  async getEmergency(db = pool, id, userId = null) {
    const { rows } = await db.query(
      `SELECT * FROM emergency_events WHERE id = $1 AND ($2::uuid IS NULL OR user_id = $2)`,
      [id, userId]
    );
    return rows[0] || null;
  },
};
