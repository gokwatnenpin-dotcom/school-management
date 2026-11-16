import { Router } from 'express';
import { one, query } from '../db.js';
import { ApiError } from '../lib/api-error.js';
import { logAudit } from '../lib/audit.js';
import { parse, studentSchema, studentUpdateSchema } from '../lib/validators.js';
import { requirePermission } from '../middleware/permissions.js';

const router = Router();

router.get('/classes', requirePermission('students:view'), async (req, res) => {
  const { rows } = await query(
    `SELECT class_level, count(*)::int AS student_count
     FROM students
     GROUP BY class_level
     ORDER BY class_level`,
  );
  res.json({ classes: rows });
});

router.get('/', requirePermission('students:view'), async (req, res) => {
  const { search = '', class_level = '', status = 'all' } = req.query;
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));

  const filters = [];
  const values = [];

  if (search.trim()) {
    values.push(`%${search.trim()}%`);
    filters.push(
      `(s.first_name ILIKE $${values.length}
        OR s.last_name ILIKE $${values.length}
        OR s.admission_no ILIKE $${values.length}
        OR (s.first_name || ' ' || s.last_name) ILIKE $${values.length})`,
    );
  }
  if (class_level) {
    values.push(class_level);
    filters.push(`s.class_level = $${values.length}`);
  }
  if (status === 'active') filters.push('s.is_active = TRUE');
  if (status === 'inactive') filters.push('s.is_active = FALSE');

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const countResult = await query(
    `SELECT count(*)::int AS total FROM students s ${where}`,
    values,
  );
  const total = countResult.rows[0].total;

  const listValues = [...values, limit, (page - 1) * limit];
  const { rows } = await query(
    `SELECT s.id, s.admission_no, s.first_name, s.last_name, s.gender, s.date_of_birth,
            s.class_level, s.guardian_name, s.guardian_phone, s.address, s.is_active,
            s.created_at, s.updated_at,
            COALESCE(e.subject_count, 0)::int AS subject_count,
            ROUND(AVG(g.score), 1) AS average_score
     FROM students s
     LEFT JOIN (
       SELECT student_id, count(*)::int AS subject_count
       FROM enrollments GROUP BY student_id
     ) e ON e.student_id = s.id
     LEFT JOIN enrollments en ON en.student_id = s.id
     LEFT JOIN grades g ON g.enrollment_id = en.id
     ${where}
     GROUP BY s.id, e.subject_count
     ORDER BY s.created_at DESC, s.id DESC
     LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
    listValues,
  );

  res.json({
    students: rows,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  });
});

router.get('/:id', requirePermission('students:view'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new ApiError(400, 'Invalid student id.');

  const student = await one(
    `SELECT s.*, u.full_name AS created_by_name
     FROM students s
     LEFT JOIN users u ON u.id = s.created_by
     WHERE s.id = $1`,
    [id],
  );
  if (!student) throw new ApiError(404, 'Student not found.');

  const { rows: enrollments } = await query(
    `SELECT e.id, e.term, e.academic_year, e.teacher_id,
            sub.id AS subject_id, sub.code AS subject_code, sub.name AS subject_name,
            t.full_name AS teacher_name,
            g.id AS grade_id, g.score, g.remarks, g.updated_at AS graded_at,
            r.full_name AS recorded_by_name
     FROM enrollments e
     JOIN subjects sub ON sub.id = e.subject_id
     LEFT JOIN users t ON t.id = e.teacher_id
     LEFT JOIN grades g ON g.enrollment_id = e.id
     LEFT JOIN users r ON r.id = g.recorded_by
     WHERE e.student_id = $1
     ORDER BY sub.name`,
    [id],
  );

  const scored = enrollments.filter((item) => item.score !== null);
  const average = scored.length
    ? Math.round((scored.reduce((sum, item) => sum + Number(item.score), 0) / scored.length) * 10) / 10
    : null;
  const best = scored.reduce(
    (top, item) => (!top || Number(item.score) > Number(top.score) ? item : top),
    null,
  );

  res.json({
    student,
    enrollments,
    summary: {
      subject_count: enrollments.length,
      graded_count: scored.length,
      average_score: average,
      best_subject: best ? { name: best.subject_name, score: best.score } : null,
    },
  });
});

router.post('/', requirePermission('students:create'), async (req, res) => {
  const data = parse(studentSchema, req.body);

  const columns = [
    'first_name',
    'last_name',
    'gender',
    'date_of_birth',
    'class_level',
    'guardian_name',
    'guardian_phone',
    'address',
    'created_by',
  ];
  const values = [
    data.first_name,
    data.last_name,
    data.gender ?? null,
    data.date_of_birth ?? null,
    data.class_level,
    data.guardian_name ?? null,
    data.guardian_phone ?? null,
    data.address ?? null,
    req.user.id,
  ];

  if (data.admission_no) {
    columns.push('admission_no');
    values.push(data.admission_no);
  }

  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
  const { rows } = await query(
    `INSERT INTO students (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    values,
  );

  await logAudit({
    userId: req.user.id,
    action: 'student.created',
    entity: 'student',
    entityId: rows[0].id,
    details: { name: `${rows[0].first_name} ${rows[0].last_name}`, admission_no: rows[0].admission_no },
  });

  res.status(201).json({ student: rows[0] });
});

router.patch('/:id', requirePermission('students:update'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new ApiError(400, 'Invalid student id.');

  const existing = await one('SELECT id FROM students WHERE id = $1', [id]);
  if (!existing) throw new ApiError(404, 'Student not found.');

  const data = parse(studentUpdateSchema, req.body);

  const fields = [];
  const values = [];
  for (const key of [
    'first_name',
    'last_name',
    'gender',
    'date_of_birth',
    'class_level',
    'guardian_name',
    'guardian_phone',
    'address',
    'admission_no',
    'is_active',
  ]) {
    if (data[key] !== undefined) {
      values.push(data[key]);
      fields.push(`${key} = $${values.length}`);
    }
  }

  if (!fields.length) throw new ApiError(400, 'No changes were submitted.');

  values.push(id);
  const { rows } = await query(
    `UPDATE students SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values,
  );

  await logAudit({
    userId: req.user.id,
    action: 'student.updated',
    entity: 'student',
    entityId: id,
    details: { name: `${rows[0].first_name} ${rows[0].last_name}`, changes: Object.keys(data) },
  });

  res.json({ student: rows[0] });
});

router.delete('/:id', requirePermission('students:delete'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new ApiError(400, 'Invalid student id.');

  const student = await one('SELECT id, first_name, last_name FROM students WHERE id = $1', [id]);
  if (!student) throw new ApiError(404, 'Student not found.');

  await query('DELETE FROM students WHERE id = $1', [id]);

  await logAudit({
    userId: req.user.id,
    action: 'student.deleted',
    entity: 'student',
    entityId: id,
    details: { name: `${student.first_name} ${student.last_name}` },
  });

  res.json({ message: `${student.first_name} ${student.last_name} has been removed.` });
});

export default router;
