import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  BookOpen,
  CalendarDays,
  Layers,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { GradeForm } from '../components/GradeForm';
import { Modal } from '../components/Modal';
import { StudentForm } from '../components/StudentForm';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  EmptyState,
  IconButton,
  Input,
  PageLoader,
  Select,
  cardClass,
} from '../components/ui';
import { useToast } from '../toast';
import {
  TERMS,
  currentAcademicYear,
  cx,
  formatDate,
  gradeInfo,
} from '../utils';

function InfoItem({ icon: Icon, label, value, className }) {
  return (
    <div className={cx('flex items-start gap-3', className)}>
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="break-words text-sm text-slate-700">{value || '—'}</p>
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, hint }) {
  return (
    <div className={cx(cardClass, 'flex items-center gap-3 p-4')}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="truncate text-lg font-bold text-slate-900">{value}</p>
        {hint && <p className="truncate text-[11px] text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}

function AddEnrollmentModal({ open, onClose, student, enrolledSubjectIds, onSaved }) {
  const toast = useToast();
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState({
    subject_id: '',
    teacher_id: '',
    term: 'Term 1',
    academic_year: currentAcademicYear(),
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    setForm({
      subject_id: '',
      teacher_id: '',
      term: 'Term 1',
      academic_year: currentAcademicYear(),
    });

    Promise.all([api('/subjects'), api('/users/teachers')])
      .then(([subjectData, teacherData]) => {
        if (!active) return;
        setSubjects(subjectData.subjects);
        setTeachers(teacherData.teachers);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open]);

  const available = subjects.filter((subject) => !enrolledSubjectIds.includes(subject.id));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.subject_id) {
      setError('Select a subject to assign.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        student_id: student.id,
        subject_id: Number(form.subject_id),
        term: form.term,
        academic_year: form.academic_year || currentAcademicYear(),
      };
      if (form.teacher_id) payload.teacher_id = Number(form.teacher_id);

      await api('/enrollments', { method: 'POST', body: payload });
      toast.success('Subject assigned to the student.');
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assign a subject"
      description={`Pick a subject and optionally the teacher responsible for ${student?.first_name ?? 'this student'}.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="enrollment-form"
            loading={submitting}
            disabled={loading || available.length === 0}
          >
            Assign subject
          </Button>
        </>
      }
    >
      <form id="enrollment-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}

        {loading ? (
          <PageLoader label="Loading subjects..." />
        ) : available.length === 0 ? (
          <Alert tone="amber">
            Every subject is already assigned to this student for the current term. Create another
            subject first if you need to add more.
          </Alert>
        ) : (
          <>
            <Select
              label="Subject"
              name="subject_id"
              required
              value={form.subject_id}
              onChange={(event) => setForm((current) => ({ ...current, subject_id: event.target.value }))}
            >
              <option value="">Select a subject</option>
              {available.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code} · {subject.name}
                </option>
              ))}
            </Select>

            <Select
              label="Teacher"
              name="teacher_id"
              value={form.teacher_id}
              onChange={(event) =>
                setForm((current) => ({ ...current, teacher_id: event.target.value }))
              }
              hint="Optional. Teaching staff only."
            >
              <option value="">Unassigned</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.full_name}
                </option>
              ))}
            </Select>

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Term"
                name="term"
                value={form.term}
                onChange={(event) => setForm((current) => ({ ...current, term: event.target.value }))}
              >
                {TERMS.map((term) => (
                  <option key={term} value={term}>
                    {term}
                  </option>
                ))}
              </Select>
              <Input
                label="Academic year"
                name="academic_year"
                value={form.academic_year}
                onChange={(event) =>
                  setForm((current) => ({ ...current, academic_year: event.target.value }))
                }
                placeholder="2026/2027"
              />
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { has } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [gradeTarget, setGradeTarget] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await api(`/students/${id}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDeleteStudent = async () => {
    setDeleting(true);
    try {
      await api(`/students/${id}`, { method: 'DELETE' });
      toast.success('Student removed from the register.');
      navigate('/students');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleRemoveSubject = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await api(`/enrollments/${removeTarget.id}`, { method: 'DELETE' });
      toast.success('Subject removed from the student.');
      setRemoveTarget(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRemoving(false);
    }
  };

  if (loading) return <PageLoader label="Loading student..." />;

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link
          to="/students"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to students
        </Link>
        <Alert>
          {error || 'Student not found.'}{' '}
          <button type="button" onClick={load} className="font-semibold underline">
            Retry
          </button>
        </Alert>
      </div>
    );
  }

  const { student, enrollments, summary } = data;
  const name = `${student.first_name} ${student.last_name}`;
  const gender = student.gender
    ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1)
    : 'Not specified';
  const enrolledSubjectIds = enrollments.map((enrollment) => enrollment.subject_id);
  const average = summary.average_score != null ? Number(summary.average_score) : null;
  const averageInfo = gradeInfo(average);

  return (
    <div className="space-y-5">
      <Link
        to="/students"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to students
      </Link>

      <div className={cx(cardClass, 'overflow-hidden')}>
        <div className="h-24 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-400" />
        <div className="px-5 pb-5">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <Avatar name={name} size="xl" className="ring-4 ring-white" />
              <div className="pb-1">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">{name}</h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge tone="brand">{student.class_level}</Badge>
                  <Badge tone={student.is_active ? 'emerald' : 'rose'}>
                    {student.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Badge>{gender}</Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {has('students:update') && (
                <Button variant="secondary" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              )}
              {has('students:delete') && (
                <Button variant="dangerSoft" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem icon={Layers} label="Admission number" value={student.admission_no} />
            <InfoItem icon={UserRound} label="Guardian" value={student.guardian_name} />
            <InfoItem icon={Phone} label="Guardian phone" value={student.guardian_phone} />
            <InfoItem icon={CalendarDays} label="Date of birth" value={formatDate(student.date_of_birth)} />
            <InfoItem icon={BookOpen} label="Class" value={student.class_level} />
            <InfoItem icon={MapPin} label="Home address" value={student.address} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat icon={BookOpen} label="Subjects" value={summary.subject_count} />
        <MiniStat icon={Award} label="Graded" value={summary.graded_count} hint="Subjects with scores" />
        <MiniStat
          icon={TrendingUp}
          label="Average score"
          value={average != null ? `${average.toFixed(1)}%` : '—'}
          hint={average != null ? averageInfo.label : 'No grades yet'}
        />
        <MiniStat
          icon={Award}
          label="Best subject"
          value={summary.best_subject?.name ?? '—'}
          hint={
            summary.best_subject ? `${Number(summary.best_subject.score).toFixed(1)}%` : 'No grades yet'
          }
        />
      </div>

      <div className={cx(cardClass, 'overflow-hidden')}>
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Subjects & grades</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Assign subjects, choose a teacher and record scores.
            </p>
          </div>
          {has('enrollments:create') && (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Assign subject
            </Button>
          )}
        </div>

        {enrollments.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No subjects assigned yet"
            description="Assign the first subject to start building this student's report card."
            action={
              has('enrollments:create') ? (
                <Button onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Assign subject
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="overflow-x-auto border-t border-slate-100">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Subject
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Teacher
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Term
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Grade
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enrollments.map((enrollment) => {
                  const info = gradeInfo(enrollment.score);
                  return (
                    <tr key={enrollment.id} className="transition hover:bg-slate-50/70">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-[10px] font-bold text-brand-700">
                            {enrollment.subject_code}
                          </span>
                          <span className="font-medium text-slate-900">{enrollment.subject_name}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                        {enrollment.teacher_name || 'Unassigned'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                        {enrollment.term}
                        <span className="block text-[11px] text-slate-400">
                          {enrollment.academic_year}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        {enrollment.score != null ? (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold tabular-nums text-slate-900">
                              {Number(enrollment.score).toFixed(1)}
                            </span>
                            <Badge tone={info.tone}>{info.letter}</Badge>
                          </div>
                        ) : (
                          <Badge tone="slate">Not graded</Badge>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {has('grades:update') && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setGradeTarget(enrollment)}
                            >
                              {enrollment.grade_id ? 'Edit grade' : 'Add grade'}
                            </Button>
                          )}
                          {has('enrollments:delete') && (
                            <IconButton
                              label="Remove subject"
                              className="hover:bg-rose-50 hover:text-rose-600"
                              onClick={() => setRemoveTarget(enrollment)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </IconButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <StudentForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        student={student}
        onSaved={load}
      />

      <AddEnrollmentModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        student={student}
        enrolledSubjectIds={enrolledSubjectIds}
        onSaved={load}
      />

      <GradeForm
        open={Boolean(gradeTarget)}
        onClose={() => setGradeTarget(null)}
        enrollment={gradeTarget}
        studentName={name}
        subjectName={gradeTarget?.subject_name}
        onSaved={load}
      />

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemoveSubject}
        loading={removing}
        title="Remove subject?"
        description={
          removeTarget
            ? `${removeTarget.subject_name} and any grade recorded for it will be removed from ${name}.`
            : ''
        }
        confirmLabel="Remove subject"
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteStudent}
        loading={deleting}
        title="Delete this student?"
        description={`${name} and all related enrolments and grades will be permanently deleted. This cannot be undone.`}
      />
    </div>
  );
}
