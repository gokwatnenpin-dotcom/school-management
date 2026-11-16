-- Scholara school management schema (idempotent)

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('supadmin', 'admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE staff_position AS ENUM ('principal', 'teacher', 'staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  role            user_role NOT NULL DEFAULT 'user',
  position        staff_position NOT NULL DEFAULT 'staff',
  phone           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS admission_seq START WITH 1;

CREATE TABLE IF NOT EXISTS students (
  id              SERIAL PRIMARY KEY,
  admission_no    TEXT NOT NULL UNIQUE
                    DEFAULT ('ADM-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('admission_seq')::text, 4, '0')),
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  gender          TEXT CHECK (gender IN ('male', 'female', 'other')),
  date_of_birth   DATE,
  class_level     TEXT NOT NULL,
  guardian_name   TEXT,
  guardian_phone  TEXT,
  address         TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subjects (
  id              SERIAL PRIMARY KEY,
  code            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT,
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enrollments (
  id              SERIAL PRIMARY KEY,
  student_id      INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id      INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  term            TEXT NOT NULL DEFAULT 'Term 1' CHECK (term IN ('Term 1', 'Term 2', 'Term 3')),
  academic_year   TEXT NOT NULL,
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, subject_id, term, academic_year)
);

CREATE TABLE IF NOT EXISTS grades (
  id              SERIAL PRIMARY KEY,
  enrollment_id   INTEGER NOT NULL UNIQUE REFERENCES enrollments(id) ON DELETE CASCADE,
  score           NUMERIC(5, 2) NOT NULL CHECK (score >= 0 AND score <= 100),
  remarks         TEXT,
  recorded_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id              BIGSERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action          TEXT NOT NULL,
  entity          TEXT NOT NULL,
  entity_id       TEXT,
  details         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_level);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(lower(first_name), lower(last_name));
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_subject ON enrollments(subject_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_teacher ON enrollments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_grades_enrollment ON grades(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER users_touch BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER students_touch BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER subjects_touch BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER enrollments_touch BEFORE UPDATE ON enrollments
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER grades_touch BEFORE UPDATE ON grades
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
