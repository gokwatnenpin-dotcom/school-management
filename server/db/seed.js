import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword } from '../src/auth.js';
import { pool } from '../src/db.js';
import { currentAcademicYear } from '../src/lib/academic.js';

const directory = path.dirname(fileURLToPath(import.meta.url));
const force = process.argv.includes('--force');

const schema = await readFile(path.join(directory, 'schema.sql'), 'utf8');
await pool.query(schema);

if (force) {
  await pool.query(
    'TRUNCATE audit_logs, grades, enrollments, students, subjects, users RESTART IDENTITY CASCADE',
  );
  await pool.query('ALTER SEQUENCE admission_seq RESTART WITH 1');
}

const { rows: existing } = await pool.query('SELECT count(*)::int AS count FROM users');
if (existing[0].count > 0) {
  console.log('Database already contains data. Run `npm run db:reset` to wipe and reseed.');
  await pool.end();
  process.exit(0);
}

const demoUsers = [
  {
    full_name: 'Dr. Amara Okafor',
    email: 'superadmin@school.edu',
    password: 'Super@123',
    role: 'supadmin',
    position: 'staff',
    phone: '+1 555 0100',
  },
  {
    full_name: 'Grace Mensah',
    email: 'admin@school.edu',
    password: 'Admin@123',
    role: 'admin',
    position: 'staff',
    phone: '+1 555 0101',
  },
  {
    full_name: 'Daniel Boateng',
    email: 'principal@school.edu',
    password: 'Principal@123',
    role: 'user',
    position: 'principal',
    phone: '+1 555 0102',
  },
  {
    full_name: 'Aisha Bello',
    email: 'teacher@school.edu',
    password: 'Teacher@123',
    role: 'user',
    position: 'teacher',
    phone: '+1 555 0103',
  },
  {
    full_name: 'John Adeyemi',
    email: 'john.adeyemi@school.edu',
    password: 'Teacher@123',
    role: 'user',
    position: 'teacher',
    phone: '+1 555 0104',
  },
  {
    full_name: 'Linda Park',
    email: 'linda.park@school.edu',
    password: 'Teacher@123',
    role: 'user',
    position: 'teacher',
    phone: '+1 555 0105',
  },
  {
    full_name: 'Samuel Eze',
    email: 'samuel.eze@school.edu',
    password: 'Teacher@123',
    role: 'user',
    position: 'teacher',
    phone: '+1 555 0106',
  },
  {
    full_name: 'Fatima Yusuf',
    email: 'fatima.yusuf@school.edu',
    password: 'Teacher@123',
    role: 'user',
    position: 'teacher',
    phone: '+1 555 0107',
  },
  {
    full_name: 'Ngozi Okeke',
    email: 'staff@school.edu',
    password: 'Staff@123',
    role: 'user',
    position: 'staff',
    phone: '+1 555 0108',
  },
  {
    full_name: 'Tunde Balogun',
    email: 'tunde.balogun@school.edu',
    password: 'Staff@123',
    role: 'user',
    position: 'staff',
    phone: '+1 555 0109',
  },
];

const userIds = {};
const teacherIds = [];

for (const user of demoUsers) {
  const passwordHash = await hashPassword(user.password);
  const { rows } = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, position, phone)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [user.full_name, user.email, passwordHash, user.role, user.position, user.phone],
  );
  userIds[user.email] = rows[0].id;
  if (user.position === 'teacher') teacherIds.push(rows[0].id);
}

const demoSubjects = [
  { code: 'MATH', name: 'Mathematics', description: 'Numbers, algebra, geometry and problem solving.' },
  { code: 'ENG', name: 'English Language', description: 'Reading, writing, grammar and comprehension.' },
  { code: 'SCI', name: 'Integrated Science', description: 'Foundations of biology, chemistry and physics.' },
  { code: 'SOC', name: 'Social Studies', description: 'History, geography, civics and society.' },
  { code: 'CSC', name: 'Computer Science', description: 'Digital literacy, programming and technology.' },
  { code: 'ART', name: 'Creative Arts', description: 'Visual arts, music and creative expression.' },
];

const subjectIds = [];
for (const subject of demoSubjects) {
  const { rows } = await pool.query(
    `INSERT INTO subjects (code, name, description, created_by)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [subject.code, subject.name, subject.description, userIds['superadmin@school.edu']],
  );
  subjectIds.push(rows[0].id);
}

const demoStudents = [
  ['Chloe', 'Adams', 'female', '2012-03-14', 'Grade 7', 'Michael Adams', '+1 555 0201', '12 Oak Street'],
  ['Ethan', 'Brooks', 'male', '2012-07-02', 'Grade 7', 'Sarah Brooks', '+1 555 0202', '48 Pine Avenue'],
  ['Maya', 'Chen', 'female', '2011-11-23', 'Grade 8', 'Wei Chen', '+1 555 0203', '7 Cedar Lane'],
  ['Noah', 'Davis', 'male', '2011-05-18', 'Grade 8', 'Robert Davis', '+1 555 0204', '91 Maple Road'],
  ['Zara', 'Hassan', 'female', '2010-09-30', 'Grade 9', 'Amina Hassan', '+1 555 0205', '23 Birch Court'],
  ['Liam', 'Foster', 'male', '2010-01-09', 'Grade 9', 'Emma Foster', '+1 555 0206', '5 Elm Street'],
  ['Ava', 'Garcia', 'female', '2009-12-12', 'Grade 10', 'Luis Garcia', '+1 555 0207', '66 Willow Way'],
  ['Kai', 'Ibrahim', 'male', '2009-04-27', 'Grade 10', 'Yusuf Ibrahim', '+1 555 0208', '14 Aspen Drive'],
  ['Isla', 'Johnson', 'female', '2008-08-05', 'Grade 11', 'Mark Johnson', '+1 555 0209', '82 Spruce Street'],
  ['Owen', 'Kim', 'male', '2008-02-21', 'Grade 11', 'Jin Kim', '+1 555 0210', '39 Poplar Avenue'],
  ['Sofia', 'Lopez', 'female', '2007-06-16', 'Grade 12', 'Maria Lopez', '+1 555 0211', '11 Magnolia Lane'],
  ['Adam', 'Mwangi', 'male', '2007-10-08', 'Grade 12', 'Peter Mwangi', '+1 555 0212', '73 Acacia Road'],
  ['Nia', 'Okafor', 'female', '2008-03-19', 'Grade 11', 'Chidi Okafor', '+1 555 0213', '28 Chestnut Street'],
  ['Leo', 'Petrov', 'male', '2009-07-11', 'Grade 10', 'Ivan Petrov', '+1 555 0214', '55 Hawthorn Drive'],
];

const academicYear = currentAcademicYear();
const term = 'Term 1';
const recordedBy = userIds['teacher@school.edu'];
let gradedCount = 0;
let firstGradeId = null;

for (const [index, student] of demoStudents.entries()) {
  const [firstName, lastName, gender, dob, classLevel, guardianName, guardianPhone, address] =
    student;

  const { rows } = await pool.query(
    `INSERT INTO students
       (first_name, last_name, gender, date_of_birth, class_level, guardian_name,
        guardian_phone, address, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      firstName,
      lastName,
      gender,
      dob,
      classLevel,
      guardianName,
      guardianPhone,
      address,
      userIds['principal@school.edu'],
    ],
  );
  const studentId = rows[0].id;

  const subjectIndexes = [0, 1, 2 + (index % 4), 2 + ((index + 1) % 4)];

  for (const subjectIndex of subjectIndexes) {
    const teacherId = teacherIds[subjectIndex % teacherIds.length];
    const enrollment = await pool.query(
      `INSERT INTO enrollments (student_id, subject_id, teacher_id, term, academic_year, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        studentId,
        subjectIds[subjectIndex],
        teacherId,
        term,
        academicYear,
        userIds['staff@school.edu'],
      ],
    );

    if ((index + subjectIndex) % 7 !== 0) {
      const score = 52 + ((index * 7 + subjectIndex * 11) % 43);
      const remarks =
        score >= 80
          ? 'Excellent work'
          : score >= 70
            ? 'Very good progress'
            : score >= 60
              ? 'Good effort'
              : 'Needs improvement';
      const grade = await pool.query(
        `INSERT INTO grades (enrollment_id, score, remarks, recorded_by)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [enrollment.rows[0].id, score, remarks, recordedBy],
      );
      gradedCount += 1;
      if (!firstGradeId) firstGradeId = grade.rows[0].id;
    }
  }
}

const activity = [
  {
    email: 'teacher@school.edu',
    action: 'grade.saved',
    entity: 'grade',
    entityId: firstGradeId,
    details: { student: 'Chloe Adams', subject: 'Mathematics', score: 88 },
    minutesAgo: 25,
  },
  {
    email: 'principal@school.edu',
    action: 'student.created',
    entity: 'student',
    entityId: 1,
    details: { name: 'Chloe Adams', admission_no: 'ADM-2026-0001' },
    minutesAgo: 120,
  },
  {
    email: 'admin@school.edu',
    action: 'subject.created',
    entity: 'subject',
    entityId: subjectIds[4],
    details: { code: 'CSC', name: 'Computer Science' },
    minutesAgo: 240,
  },
  {
    email: 'superadmin@school.edu',
    action: 'user.created',
    entity: 'user',
    entityId: userIds['teacher@school.edu'],
    details: { email: 'teacher@school.edu', role: 'user', position: 'teacher' },
    minutesAgo: 1440,
  },
];

for (const item of activity) {
  await pool.query(
    `INSERT INTO audit_logs (user_id, action, entity, entity_id, details, created_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, now() - make_interval(mins => $6))`,
    [
      userIds[item.email],
      item.action,
      item.entity,
      String(item.entityId ?? ''),
      JSON.stringify(item.details),
      item.minutesAgo,
    ],
  );
}

console.log('Seed complete.');
console.log(
  `Created ${demoUsers.length} staff accounts, ${demoSubjects.length} subjects, ${demoStudents.length} students, and ${gradedCount} grades.`,
);

await pool.end();
