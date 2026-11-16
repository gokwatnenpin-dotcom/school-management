import { Router } from 'express';
import { one, query } from '../db.js';
import { currentAcademicYear } from '../lib/academic.js';
import { ApiError } from '../lib/api-error.js';
import { logAudit } from '../lib/audit.js';
import {
  enrollmentSchema,
  enrollmentUpdateSchema,
  gradeSchema,
  parse,
} from '../lib/validators.js';
import { requirePermission } from '../middleware/permissions.js';

const router = Router();

async function loadEnrollment(id) {
  return one(
    `SELECT e.id, e.student_id, e.subject_id, e.teacher_id, e.term, e.academic_year, e.created_at,
            st.first_name, st.last_name, st.admission_no, st.class_level,
            sub.code AS subject_code, sub.name AS subject_name,
            t.full_name AS teacher_name,
            g.id AS grade_id, g.score, g.remarks, g.updated_at AS graded_at
     FROM enrollments e
     JOIN students st ON st.id = e.student_id
     JOIN subjects sub ON sub.id = e.subject_id
     LEFT JOIN users t ON t.id = e.teacher_id
     LEFT JOIN grades g ON g.enrollment_id = e.id
     WHERE e.id = $1`,
    [id],
  );
}

async function assertTeacher(teacherId) {
  if (teacherId == null) return;
  const teacher = await one(
    `SELECT id FROM users WHERE id = $1 AND position = 'teacher' AND is_active`,
    [teacherId],
  );
  if (!teacher) throw new ApiError(422, 'Select an active teacher for this subject.');
}

router.get('/', requirePermission('enrollments:view'), async (req, res) => {
  const { student_id = '', subject_id = '', teacher_id = '', term = '', academic_year = '' } =
    req.query;
  const filters = [];
  const values = [];

  for (const [column, value] of [
    ['e.student_id', student_id],
    ['e.subject_id', subject_id],
    ['e.teacher_id', teacher_id],
    ['e.term', term],
    ['e.academic_year', academic_year],
  ]) {
    if (value) {
      values.push(value);
      filters.push(`${column} = $${values.length}`);
    }
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT e.id, e.student_id, e.subject_id, e.teacher_id, e.term, e.academic_year,
            st.first_name, st.last_name, st.class_level,
            sub.code AS subject_code, sub.name AS subject_name,
            t.full_name AS teacher_name,
            g.id AS grade_id, g.score, g.remarks
     FROM enrollments e
     JOIN students st ON st.id = e.student_id
     JOIN subjects sub ON sub.id = e.subject_id
     LEFT JOIN users t ON t.id = e.teacher_id
     LEFT JOIN grades g ON g.enrollment_id = e.id
     ${where}
     ORDER BY st.last_name, st.first_name, sub.name
     LIMIT 500`,
    values,
  );

  res.json({ enrollments: rows });
});

router.post('/', requirePermission('enrollments:create'), async (req, res) => {
  const data = parse(enrollmentSchema, req.body);

  const [student, subject] = await Promise.all([
    one('SELECT id, first_name, last_name FROM students WHERE id = $1', [data.student_id]),
    one('SELECT id, code, name FROM subjects WHERE id = $1', [data.subject_id]),
  ]);

  if (!student) throw new ApiError(422, 'Select a valid student.');
  if (!subject) throw new ApiError(422, 'Select a valid subject.');
  await assertTeacher(data.teacher_id);

  const academicYear = data.academic_year || currentAcademicYear();
  const { rows } = await query(
    `INSERT INTO enrollments (student_id, subject_id, teacher_id, term, academic_year, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [data.student_id, data.subject_id, data.teacher_id ?? null, data.term, academicYear, req.user.id],
  );

  await logAudit({
    userId: req.user.id,
    action: 'enrollment.created',
    entity: 'enrollment',
    entityId: rows[0].id,
    details: {
      student: `${student.first_name} ${student.last_name}`,
      subject: subject.name,
      term: data.term,
      academic_year: academicYear,
    },
  });

  res.status(201).json({ enrollment: await loadEnrollment(rows[0].id) });
});

router.patch('/:id', requirePermission('enrollments:update'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new ApiError(400, 'Invalid enrollment id.');

  const existing = await one('SELECT id FROM enrollments WHERE id = $1', [id]);
  if (!existing) throw new ApiError(404, 'Enrollment not found.');

  const data = parse(enrollmentUpdateSchema, req.body);
  if (data.teacher_id !== undefined) await assertTeacher(data.teacher_id);

  const fields = [];
  const values = [];
  for (const key of ['teacher_id', 'term', 'academic_year']) {
    if (data[key] !== undefined) {
      values.push(data[key]);
      fields.push(`${key} = $${values.length}`);
    }
  }

  if (!fields.length) throw new ApiError(400, 'No changes were submitted.');

  values.push(id);
  const { rows } = await query(
    `UPDATE enrollments SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING id`,
    values,
  );

  await logAudit({
    userId: req.user.id,
    action: 'enrollment.updated',
    entity: 'enrollment',
    entityId: id,
    details: { changes: Object.keys(data) },
  });

  res.json({ enrollment: await loadEnrollment(rows[0].id) });
});

router.delete('/:id', requirePermission('enrollments:delete'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new ApiError(400, 'Invalid enrollment id.');

  const enrollment = await one(
    `SELECT e.id, st.first_name, st.last_name, sub.name AS subject_name
     FROM enrollments e
     JOIN students st ON st.id = e.student_id
     JOIN subjects sub ON sub.id = e.subject_id
     WHERE e.id = $1`,
    [id],
  );
  if (!enrollment) throw new ApiError(404, 'Enrollment not found.');

  await query('DELETE FROM enrollments WHERE id = $1', [id]);

  await logAudit({
    userId: req.user.id,
    action: 'enrollment.deleted',
    entity: 'enrollment',
    entityId: id,
    details: {
      student: `${enrollment.first_name} ${enrollment.last_name}`,
      subject: enrollment.subject_name,
    },
  });

  res.json({ message: 'Subject removed from the student.' });
});

router.put('/:id/grade', requirePermission('grades:update'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new ApiError(400, 'Invalid enrollment id.');

  const enrollment = await one(
    `SELECT e.id, st.first_name, st.last_name, sub.name AS subject_name
     FROM enrollments e
     JOIN students st ON st.id = e.student_id
     JOIN subjects sub ON sub.id = e.subject_id
     WHERE e.id = $1`,
    [id],
  );
  if (!enrollment) throw new ApiError(404, 'Enrollment not found.');

  const data = parse(gradeSchema, req.body);
  const { rows } = await query(
    `INSERT INTO grades (enrollment_id, score, remarks, recorded_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (enrollment_id) DO UPDATE
       SET score = EXCLUDED.score,
           remarks = EXCLUDED.remarks,
           recorded_by = EXCLUDED.recorded_by,
           updated_at = now()
     RETURNING *`,
    [id, data.score, data.remarks ?? null, req.user.id],
  );

  await logAudit({
    userId: req.user.id,
    action: 'grade.saved',
    entity: 'grade',
    entityId: rows[0].id,
    details: {
      student: `${enrollment.first_name} ${enrollment.last_name}`,
      subject: enrollment.subject_name,
      score: data.score,
    },
  });

  res.json({ grade: rows[0] });
});

router.delete('/:id/grade', requirePermission('grades:delete'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new ApiError(400, 'Invalid enrollment id.');

  const existing = await one('SELECT id FROM grades WHERE enrollment_id = $1', [id]);
  if (!existing) throw new ApiError(404, 'This enrollment has no grade yet.');

  await query('DELETE FROM grades WHERE enrollment_id = $1', [id]);

  await logAudit({
    userId: req.user.id,
    action: 'grade.deleted',
    entity: 'grade',
    entityId: existing.id,
    details: { enrollment_id: id },
  });

  res.json({ message: 'Grade cleared.' });
});

export default router;
