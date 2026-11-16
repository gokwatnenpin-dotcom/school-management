import { z } from 'zod';
import { ApiError } from './api-error.js';
import { POSITIONS, ROLES } from '../permissions.js';

const blankToUndefined = (value) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export const optionalText = (max = 500) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max, `Must be ${max} characters or fewer.`).optional());

export const optionalDate = () =>
  z.preprocess(
    blankToUndefined,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD date format.')
      .optional(),
  );

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password must be 72 characters or fewer.')
  .regex(/[A-Za-z]/, 'Password must include a letter.')
  .regex(/\d/, 'Password must include a number.');

const email = z.string().trim().toLowerCase().email('Enter a valid email address.');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required.'),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Enter your current password.'),
  new_password: password,
});

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, 'Name is too short.').max(120).optional(),
  phone: optionalText(30),
});

export const userCreateSchema = z.object({
  full_name: z.string().trim().min(2, 'Name is too short.').max(120),
  email,
  password,
  role: z.enum(ROLES).default('user'),
  position: z.enum(POSITIONS).default('staff'),
  phone: optionalText(30),
  is_active: z.boolean().optional(),
});

export const userUpdateSchema = z.object({
  full_name: z.string().trim().min(2, 'Name is too short.').max(120).optional(),
  email: email.optional(),
  password: password.optional(),
  role: z.enum(ROLES).optional(),
  position: z.enum(POSITIONS).optional(),
  phone: optionalText(30),
  is_active: z.boolean().optional(),
});

export const studentSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required.').max(80),
  last_name: z.string().trim().min(1, 'Last name is required.').max(80),
  gender: z.enum(['male', 'female', 'other']).optional(),
  date_of_birth: optionalDate(),
  class_level: z.string().trim().min(1, 'Class is required.').max(40),
  guardian_name: optionalText(120),
  guardian_phone: optionalText(30),
  address: optionalText(300),
  admission_no: optionalText(40),
  is_active: z.boolean().optional(),
});

export const studentUpdateSchema = studentSchema.partial();

export const subjectSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'Code is required.')
    .max(12)
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2, 'Subject name is required.').max(120),
  description: optionalText(500),
});

export const subjectUpdateSchema = subjectSchema.partial();

const optionalTeacherId = z.preprocess(
  (value) => (value === '' ? null : value),
  z.union([z.null(), z.coerce.number().int().positive()]).optional(),
);

export const enrollmentSchema = z.object({
  student_id: z.coerce.number().int().positive('Select a student.'),
  subject_id: z.coerce.number().int().positive('Select a subject.'),
  teacher_id: optionalTeacherId,
  term: z.enum(['Term 1', 'Term 2', 'Term 3']).default('Term 1'),
  academic_year: z
    .string()
    .regex(/^\d{4}\/\d{4}$/, 'Use the YYYY/YYYY academic year format.')
    .optional(),
});

export const enrollmentUpdateSchema = z.object({
  teacher_id: optionalTeacherId,
  term: z.enum(['Term 1', 'Term 2', 'Term 3']).optional(),
  academic_year: z
    .string()
    .regex(/^\d{4}\/\d{4}$/, 'Use the YYYY/YYYY academic year format.')
    .optional(),
});

export const gradeSchema = z.object({
  score: z.coerce.number().min(0, 'Score cannot be below 0.').max(100, 'Score cannot exceed 100.'),
  remarks: optionalText(300),
});

export function parse(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || 'form',
      message: issue.message,
    }));
    throw new ApiError(422, 'Please check the highlighted fields.', details);
  }
  return result.data;
}
