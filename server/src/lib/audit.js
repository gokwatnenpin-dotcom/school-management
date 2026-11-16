import { query } from '../db.js';

export async function logAudit({ userId, action, entity, entityId, details }) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId ?? null, action, entity, entityId != null ? String(entityId) : null, details ?? null],
    );
  } catch (error) {
    console.error('Failed to write audit log:', error.message);
  }
}
