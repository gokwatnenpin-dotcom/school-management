import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { useToast } from '../toast';
import { CLASS_LEVELS } from '../utils';
import { Modal } from './Modal';
import { Alert, Button, Checkbox, Input, Select, Textarea } from './ui';

const emptyForm = {
  first_name: '',
  last_name: '',
  gender: '',
  date_of_birth: '',
  class_level: 'Grade 7',
  guardian_name: '',
  guardian_phone: '',
  address: '',
  admission_no: '',
  is_active: true,
};

function toForm(student) {
  if (!student) return { ...emptyForm };
  return {
    first_name: student.first_name ?? '',
    last_name: student.last_name ?? '',
    gender: student.gender ?? '',
    date_of_birth: student.date_of_birth ? String(student.date_of_birth).slice(0, 10) : '',
    class_level: student.class_level ?? 'Grade 7',
    guardian_name: student.guardian_name ?? '',
    guardian_phone: student.guardian_phone ?? '',
    address: student.address ?? '',
    admission_no: student.admission_no ?? '',
    is_active: student.is_active ?? true,
  };
}

export function StudentForm({ open, onClose, student, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(toForm(student));
      setError('');
      setFieldErrors({});
      setSubmitting(false);
    }
  }, [open, student]);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setFieldErrors({});

    const payload = {};
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
    ]) {
      const value = form[key];
      if (value !== '' && value !== undefined && value !== null) payload[key] = value;
    }
    if (student) payload.is_active = form.is_active;

    try {
      const data = student
        ? await api(`/students/${student.id}`, { method: 'PATCH', body: payload })
        : await api('/students', { method: 'POST', body: payload });

      toast.success(student ? 'Student details updated.' : 'Student added to the school.');
      onSaved?.(data.student);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && Array.isArray(err.details)) {
        const mapped = {};
        for (const detail of err.details) mapped[detail.field] = detail.message;
        setFieldErrors(mapped);
      }
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const classes = CLASS_LEVELS.includes(form.class_level)
    ? CLASS_LEVELS
    : [form.class_level, ...CLASS_LEVELS];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={student ? 'Edit student' : 'Add student'}
      description={
        student
          ? 'Update the student profile and guardian details.'
          : 'Create a student record. An admission number is generated automatically if left blank.'
      }
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="student-form" loading={submitting}>
            {student ? 'Save changes' : 'Add student'}
          </Button>
        </>
      }
    >
      <form id="student-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="First name"
            name="first_name"
            required
            value={form.first_name}
            onChange={(event) => update('first_name', event.target.value)}
            error={fieldErrors.first_name}
            placeholder="Chloe"
            autoComplete="off"
          />
          <Input
            label="Last name"
            name="last_name"
            required
            value={form.last_name}
            onChange={(event) => update('last_name', event.target.value)}
            error={fieldErrors.last_name}
            placeholder="Adams"
            autoComplete="off"
          />
          <Input
            label="Admission number"
            name="admission_no"
            value={form.admission_no}
            onChange={(event) => update('admission_no', event.target.value)}
            error={fieldErrors.admission_no}
            hint={student ? undefined : 'Leave blank to generate automatically.'}
            placeholder="ADM-2026-0001"
          />
          <Select
            label="Class"
            name="class_level"
            required
            value={form.class_level}
            onChange={(event) => update('class_level', event.target.value)}
            error={fieldErrors.class_level}
          >
            {classes.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </Select>
          <Select
            label="Gender"
            name="gender"
            value={form.gender}
            onChange={(event) => update('gender', event.target.value)}
            error={fieldErrors.gender}
          >
            <option value="">Not specified</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </Select>
          <Input
            label="Date of birth"
            name="date_of_birth"
            type="date"
            value={form.date_of_birth}
            onChange={(event) => update('date_of_birth', event.target.value)}
            error={fieldErrors.date_of_birth}
          />
          <Input
            label="Guardian name"
            name="guardian_name"
            value={form.guardian_name}
            onChange={(event) => update('guardian_name', event.target.value)}
            error={fieldErrors.guardian_name}
            placeholder="Michael Adams"
          />
          <Input
            label="Guardian phone"
            name="guardian_phone"
            value={form.guardian_phone}
            onChange={(event) => update('guardian_phone', event.target.value)}
            error={fieldErrors.guardian_phone}
            placeholder="+1 555 0201"
          />
        </div>

        <Textarea
          label="Home address"
          name="address"
          value={form.address}
          onChange={(event) => update('address', event.target.value)}
          error={fieldErrors.address}
          placeholder="Street, city, state"
        />

        {student && (
          <Checkbox
            label="Student is currently active"
            checked={form.is_active}
            onChange={(event) => update('is_active', event.target.checked)}
          />
        )}
      </form>
    </Modal>
  );
}
