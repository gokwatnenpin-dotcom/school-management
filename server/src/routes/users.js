import { Router } from 'express';
import { hashPassword } from '../auth.js';
import { one, query } from '../db.js';
import { ApiError } from '../lib/api-error.js';
import { logAudit } from '../lib/audit.js';
import { parse, userCreateSchema, userUpdateSchema } from '../lib/validators.js';
import { canCreateStaff, canViewStaff, isPrincipal } from '../permissions.js';
import { requireAccess, requirePermission } from '../middleware/permissions.js';

const router = Router();

const PUBLIC_COLUMNS = `id, full_name, email, role, position, phone, is_active, last_login_at, created_at, updated_at`;

router.get('/teachers', async (req, res) => {
  const { rows } = await query(
    `SELECT id, full_name, position FROM users
     WHERE position = 'teacher' AND is_active
     ORDER BY full_name`,
  );
  res.json({ teachers: rows });
});

router.get('/', requireAccess(canViewStaff, 'users:view'), async (req, res) => {
  const { search = '', role = '', position = '', status = 'all' } = req.query;
  const filters = [];
  const values = [];

  if (search.trim()) {
    values.push(`%${search.trim()}%`);
    filters.push(
      `(full_name ILIKE $${values.length} OR email ILIKE $${values.length} OR phone ILIKE $${values.length})`,
    );
  }
  if (isPrincipal(req.user)) {
    filters.push(`role = 'user'`);
  } else if (role) {
    values.push(role);
    filters.push(`role = $${values.length}`);
  }
  if (position) {
    values.push(position);
    filters.push(`position = $${values.length}`);
  }
  if (status === 'active') filters.push('is_active = TRUE');
  if (status === 'inactive') filters.push('is_active = FALSE');

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT ${PUBLIC_COLUMNS} FROM users ${where}
     ORDER BY CASE role WHEN 'supadmin' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, full_name`,
    values,
  );

  res.json({ users: rows });
});

router.post('/', requireAccess(canCreateStaff, 'users:create'), async (req, res) => {
  const data = parse(userCreateSchema, req.body);

  if (isPrincipal(req.user) && (data.role !== 'user' || !['teacher', 'staff'].includes(data.position))) {
    throw new ApiError(403, 'Principals can only add teacher or staff accounts.');
  }

  if (data.role === 'supadmin' && req.user.role !== 'supadmin') {
    throw new ApiError(403, 'Only a super admin can create super admin accounts.');
  }

  const passwordHash = await hashPassword(data.password);
  const { rows } = await query(
    `INSERT INTO users (full_name, email, password_hash, role, position, phone, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${PUBLIC_COLUMNS}`,
    [
      data.full_name,
      data.email,
      passwordHash,
      data.role,
      data.position,
      data.phone ?? null,
      data.is_active ?? true,
    ],
  );

  await logAudit({
    userId: req.user.id,
    action: 'user.created',
    entity: 'user',
    entityId: rows[0].id,
    details: { email: rows[0].email, role: rows[0].role, position: rows[0].position },
  });

  res.status(201).json({ user: rows[0] });
});

router.patch('/:id', requirePermission('users:update'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new ApiError(400, 'Invalid user id.');

  const target = await one('SELECT * FROM users WHERE id = $1', [id]);
  if (!target) throw new ApiError(404, 'User not found.');

  const data = parse(userUpdateSchema, req.body);

  if ((target.role === 'supadmin' || data.role === 'supadmin') && req.user.role !== 'supadmin') {
    throw new ApiError(403, 'Only a super admin can manage super admin accounts.');
  }

  if (target.id === req.user.id) {
    if (data.role && data.role !== target.role) {
      throw new ApiError(400, 'You cannot change your own role.');
    }
    if (data.is_active === false) {
      throw new ApiError(400, 'You cannot deactivate your own account.');
    }
  }

  const losingSuperAdmin =
    target.role === 'supadmin' &&
    ((data.role && data.role !== 'supadmin') || data.is_active === false);

  if (losingSuperAdmin) {
    const { rows } = await query(
      `SELECT count(*)::int AS count FROM users
       WHERE role = 'supadmin' AND is_active AND id <> $1`,
      [id],
    );
    if (rows[0].count === 0) throw new ApiError(400, 'At least one active super admin must remain.');
  }

  const fields = [];
  const values = [];
  for (const key of ['full_name', 'email', 'phone', 'role', 'position', 'is_active']) {
    if (data[key] !== undefined) {
      values.push(data[key]);
      fields.push(`${key} = $${values.length}`);
    }
  }

  if (data.password) {
    values.push(await hashPassword(data.password));
    fields.push(`password_hash = $${values.length}`);
  }

  if (!fields.length) throw new ApiError(400, 'No changes were submitted.');

  values.push(id);
  const { rows } = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${values.length}
     RETURNING ${PUBLIC_COLUMNS}`,
    values,
  );

  await logAudit({
    userId: req.user.id,
    action: 'user.updated',
    entity: 'user',
    entityId: id,
    details: { email: rows[0].email, changes: Object.keys(data).filter((key) => data[key] !== undefined) },
  });

  res.json({ user: rows[0] });
});

router.delete('/:id', requirePermission('users:delete'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new ApiError(400, 'Invalid user id.');

  const target = await one('SELECT id, full_name, email, role FROM users WHERE id = $1', [id]);
  if (!target) throw new ApiError(404, 'User not found.');

  if (target.id === req.user.id) throw new ApiError(400, 'You cannot delete your own account.');

  if (target.role === 'supadmin') {
    if (req.user.role !== 'supadmin') {
      throw new ApiError(403, 'Only a super admin can delete a super admin account.');
    }
    const { rows } = await query(
      `SELECT count(*)::int AS count FROM users
       WHERE role = 'supadmin' AND is_active AND id <> $1`,
      [id],
    );
    if (rows[0].count === 0) throw new ApiError(400, 'At least one active super admin must remain.');
  }

  await query('DELETE FROM users WHERE id = $1', [id]);
  await logAudit({
    userId: req.user.id,
    action: 'user.deleted',
    entity: 'user',
    entityId: id,
    details: { email: target.email, role: target.role },
  });

  res.json({ message: `${target.full_name} has been removed.` });
});

export default router;
