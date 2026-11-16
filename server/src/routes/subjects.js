import { Router } from 'express';
import { one, query } from '../db.js';
import { ApiError } from '../lib/api-error.js';
import { logAudit } from '../lib/audit.js';
import { parse, subjectSchema, subjectUpdateSchema } from '../lib/validators.js';
import { requirePermission } from '../middleware/permissions.js';

const router = Router();

router.get('/', requirePermission('subjects:view'), async (req, res) => {
  const { search = '' } = req.query;
  const values = [];
  let where = '';

  if (search.trim()) {
    values.push(`%${search.trim()}%`);
    where = `WHERE (s.code ILIKE $1 OR s.name ILIKE $1 OR s.description ILIKE $1)`;
  }

  const { rows } = await query(
    `SELECT s.id, s.code, s.name, s.description, s.created_at, s.updated_at,
            COALESCE(e.enrolled_count, 0)::int AS enrolled_count,
            ROUND(AVG(g.score), 1) AS average_score
     FROM subjects s
     LEFT JOIN (
       SELECT subject_id, count(*)::int AS enrolled_count
       FROM enrollments GROUP BY subject_id
     ) e ON e.subject_id = s.id
     LEFT JOIN enrollments en ON en.subject_id = s.id
     LEFT JOIN grades g ON g.enrollment_id = en.id
     ${where}
     GROUP BY s.id, e.enrolled_count
     ORDER BY s.name`,
    values,
  );

  res.json({ subjects: rows });
});

router.post('/', requirePermission('subjects:create'), async (req, res) => {
  const data = parse(subjectSchema, req.body);

  const { rows } = await query(
    `INSERT INTO subjects (code, name, description, created_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.code, data.name, data.description ?? null, req.user.id],
  );

  await logAudit({
    userId: req.user.id,
    action: 'subject.created',
    entity: 'subject',
    entityId: rows[0].id,
    details: { code: rows[0].code, name: rows[0].name },
  });

  res.status(201).json({ subject: rows[0] });
});

router.patch('/:id', requirePermission('subjects:update'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new ApiError(400, 'Invalid subject id.');

  const existing = await one('SELECT id FROM subjects WHERE id = $1', [id]);
  if (!existing) throw new ApiError(404, 'Subject not found.');

  const data = parse(subjectUpdateSchema, req.body);
  const fields = [];
  const values = [];

  for (const key of ['code', 'name', 'description']) {
    if (data[key] !== undefined) {
      values.push(data[key]);
      fields.push(`${key} = $${values.length}`);
    }
  }

  if (!fields.length) throw new ApiError(400, 'No changes were submitted.');

  values.push(id);
  const { rows } = await query(
    `UPDATE subjects SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values,
  );

  await logAudit({
    userId: req.user.id,
    action: 'subject.updated',
    entity: 'subject',
    entityId: id,
    details: { code: rows[0].code, changes: Object.keys(data) },
  });

  res.json({ subject: rows[0] });
});

router.delete('/:id', requirePermission('subjects:delete'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new ApiError(400, 'Invalid subject id.');

  const subject = await one('SELECT id, code, name FROM subjects WHERE id = $1', [id]);
  if (!subject) throw new ApiError(404, 'Subject not found.');

  await query('DELETE FROM subjects WHERE id = $1', [id]);

  await logAudit({
    userId: req.user.id,
    action: 'subject.deleted',
    entity: 'subject',
    entityId: id,
    details: { code: subject.code, name: subject.name },
  });

  res.json({ message: `${subject.name} has been removed.` });
});

export default router;
