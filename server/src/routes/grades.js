import { Router } from 'express';
import { query } from '../db.js';
import { requirePermission } from '../middleware/permissions.js';

const router = Router();

router.get('/', requirePermission('grades:view'), async (req, res) => {
  const {
    class_level = '',
    subject_id = '',
    term = '',
    academic_year = '',
    search = '',
    graded = 'all',
  } = req.query;

  const filters = [];
  const values = [];

  if (class_level) {
    values.push(class_level);
    filters.push(`st.class_level = $${values.length}`);
  }
  if (subject_id) {
    values.push(subject_id);
    filters.push(`e.subject_id = $${values.length}`);
  }
  if (term) {
    values.push(term);
    filters.push(`e.term = $${values.length}`);
  }
  if (academic_year) {
    values.push(academic_year);
    filters.push(`e.academic_year = $${values.length}`);
  }
  if (search.trim()) {
    values.push(`%${search.trim()}%`);
    filters.push(
      `(st.first_name ILIKE $${values.length}
        OR st.last_name ILIKE $${values.length}
        OR st.admission_no ILIKE $${values.length}
        OR sub.name ILIKE $${values.length})`,
    );
  }
  if (graded === 'yes') filters.push('g.id IS NOT NULL');
  if (graded === 'no') filters.push('g.id IS NULL');

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT e.id AS enrollment_id, e.term, e.academic_year,
            st.id AS student_id, st.first_name, st.last_name, st.admission_no, st.class_level,
            sub.id AS subject_id, sub.code AS subject_code, sub.name AS subject_name,
            t.full_name AS teacher_name,
            g.id AS grade_id, g.score, g.remarks, g.updated_at AS graded_at,
            r.full_name AS recorded_by_name
     FROM enrollments e
     JOIN students st ON st.id = e.student_id
     JOIN subjects sub ON sub.id = e.subject_id
     LEFT JOIN users t ON t.id = e.teacher_id
     LEFT JOIN grades g ON g.enrollment_id = e.id
     LEFT JOIN users r ON r.id = g.recorded_by
     ${where}
     ORDER BY st.last_name, st.first_name, sub.name
     LIMIT 400`,
    values,
  );

  const gradedRows = rows.filter((row) => row.score !== null);
  const average = gradedRows.length
    ? Math.round(
        (gradedRows.reduce((sum, row) => sum + Number(row.score), 0) / gradedRows.length) * 10,
      ) / 10
    : null;

  res.json({
    entries: rows,
    summary: { total: rows.length, graded: gradedRows.length, average_score: average },
  });
});

export default router;
