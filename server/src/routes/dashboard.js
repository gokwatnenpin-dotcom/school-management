import { Router } from 'express';
import { query } from '../db.js';
import { can } from '../permissions.js';
import { requirePermission } from '../middleware/permissions.js';

const router = Router();

router.get('/', requirePermission('dashboard:view'), async (req, res) => {
  const [
    countsResult,
    averageResult,
    distributionResult,
    classesResult,
    recentStudentsResult,
    recentGradesResult,
    recentActivityResult,
  ] = await Promise.all([
    query(
      `SELECT
         (SELECT count(*)::int FROM students WHERE is_active) AS students,
         (SELECT count(*)::int FROM users WHERE is_active AND position = 'teacher') AS teachers,
         (SELECT count(*)::int FROM users WHERE is_active) AS staff,
         (SELECT count(*)::int FROM subjects) AS subjects,
         (SELECT count(*)::int FROM enrollments) AS enrollments,
         (SELECT count(*)::int FROM grades) AS grades`,
    ),
    query('SELECT ROUND(AVG(score), 1) AS average_score FROM grades'),
    query(
      `SELECT CASE
                WHEN score >= 80 THEN 'A'
                WHEN score >= 70 THEN 'B'
                WHEN score >= 60 THEN 'C'
                WHEN score >= 50 THEN 'D'
                ELSE 'F'
              END AS letter,
              count(*)::int AS count
       FROM grades
       GROUP BY letter`,
    ),
    query(
      `SELECT s.class_level,
              count(DISTINCT s.id)::int AS students,
              ROUND(AVG(g.score), 1) AS average_score
       FROM students s
       LEFT JOIN enrollments e ON e.student_id = s.id
       LEFT JOIN grades g ON g.enrollment_id = e.id
       GROUP BY s.class_level
       ORDER BY s.class_level`,
    ),
    query(
      `SELECT id, admission_no, first_name, last_name, class_level, created_at
       FROM students
       ORDER BY created_at DESC, id DESC
       LIMIT 5`,
    ),
    query(
      `SELECT g.id, g.score, g.updated_at,
              st.first_name, st.last_name, st.class_level,
              sub.name AS subject_name,
              u.full_name AS recorded_by_name
       FROM grades g
       JOIN enrollments e ON e.id = g.enrollment_id
       JOIN students st ON st.id = e.student_id
       JOIN subjects sub ON sub.id = e.subject_id
       LEFT JOIN users u ON u.id = g.recorded_by
       ORDER BY g.updated_at DESC
       LIMIT 6`,
    ),
    query(
      `SELECT a.id, a.action, a.entity, a.entity_id, a.details, a.created_at,
              u.full_name AS user_name
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC
       LIMIT 6`,
    ),
  ]);

  const distributionMap = Object.fromEntries(
    distributionResult.rows.map((row) => [row.letter, row.count]),
  );
  const distribution = ['A', 'B', 'C', 'D', 'F'].map((letter) => ({
    letter,
    count: distributionMap[letter] ?? 0,
  }));

  res.json({
    counts: countsResult.rows[0],
    average_score: averageResult.rows[0].average_score,
    distribution,
    classes: classesResult.rows,
    recent_students: recentStudentsResult.rows,
    recent_grades: recentGradesResult.rows,
    recent_activity: can(req.user.role, 'audit:view') ? recentActivityResult.rows : [],
  });
});

export default router;
