import { Router } from 'express';
import { query } from '../db.js';
import { requirePermission } from '../middleware/permissions.js';

const router = Router();

router.get('/', requirePermission('audit:view'), async (req, res) => {
  const limit = Math.min(200, Math.max(1, Number.parseInt(req.query.limit, 10) || 100));
  const { action = '', entity = '', search = '' } = req.query;

  const filters = [];
  const values = [];

  if (action) {
    values.push(`${action}%`);
    filters.push(`a.action ILIKE $${values.length}`);
  }
  if (entity) {
    values.push(entity);
    filters.push(`a.entity = $${values.length}`);
  }
  if (search.trim()) {
    values.push(`%${search.trim()}%`);
    filters.push(
      `(u.full_name ILIKE $${values.length} OR a.details::text ILIKE $${values.length} OR a.entity_id ILIKE $${values.length})`,
    );
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  values.push(limit);

  const { rows } = await query(
    `SELECT a.id, a.action, a.entity, a.entity_id, a.details, a.created_at,
            u.full_name AS user_name, u.role AS user_role
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id
     ${where}
     ORDER BY a.created_at DESC
     LIMIT $${values.length}`,
    values,
  );

  res.json({ logs: rows });
});

export default router;
