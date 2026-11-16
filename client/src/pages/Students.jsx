import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { StudentForm } from '../components/StudentForm';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  EmptyState,
  IconButton,
  PageHeader,
  PageLoader,
  cardClass,
} from '../components/ui';
import { useToast } from '../toast';
import { CLASS_LEVELS, cx, gradeInfo } from '../utils';

const filterClass =
  'h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';

export default function Students() {
  const { has } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 10 });
  const [classes, setClasses] = useState([]);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api('/students/classes')
      .then((data) => setClasses(data.classes))
      .catch(() => setClasses([]));
  }, [reloadKey]);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditing(null);
      setFormOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(
      async () => {
        setLoading(true);
        setError('');
        try {
          const params = new URLSearchParams();
          params.set('page', String(page));
          params.set('limit', '10');
          if (search.trim()) params.set('search', search.trim());
          if (classFilter) params.set('class_level', classFilter);
          if (status !== 'all') params.set('status', status);

          const data = await api(`/students?${params.toString()}`);
          if (!cancelled) {
            setStudents(data.students);
            setPagination(data.pagination);
          }
        } catch (err) {
          if (!cancelled) setError(err.message);
        } finally {
          if (!cancelled) setLoading(false);
        }
      },
      search ? 250 : 0,
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, classFilter, status, page, reloadKey]);

  const refresh = () => setReloadKey((key) => key + 1);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/students/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('Student removed from the register.');
      setDeleteTarget(null);
      if (students.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        refresh();
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const classOptions = classes.length
    ? classes.map((item) => item.class_level)
    : CLASS_LEVELS;

  const start = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const end = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Students"
        description={`${pagination.total} student${pagination.total === 1 ? '' : 's'} in the register.`}
        actions={
          has('students:create') ? (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add student
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by name or admission number"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <select
          value={classFilter}
          onChange={(event) => {
            setClassFilter(event.target.value);
            setPage(1);
          }}
          className={filterClass}
          aria-label="Filter by class"
        >
          <option value="">All classes</option>
          {classOptions.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className={filterClass}
          aria-label="Filter by status"
        >
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
          <option value="all">All statuses</option>
        </select>
      </div>

      {error && (
        <Alert>
          {error}{' '}
          <button type="button" onClick={refresh} className="font-semibold underline">
            Retry
          </button>
        </Alert>
      )}

      <div className={cx(cardClass, 'overflow-hidden')}>
        {loading ? (
          <PageLoader label="Loading students..." />
        ) : students.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No students found"
            description={
              search || classFilter || status !== 'active'
                ? 'Try adjusting the search or filters.'
                : 'Add your first student to start the register.'
            }
            action={
              has('students:create') ? (
                <Button
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Add student
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Student
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Admission
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Class
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Subjects
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Average
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student) => {
                    const average =
                      student.average_score != null ? Number(student.average_score) : null;
                    const info = gradeInfo(average);
                    return (
                      <tr key={student.id} className="transition hover:bg-slate-50/70">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={`${student.first_name} ${student.last_name}`} size="sm" />
                            <div className="min-w-0">
                              <Link
                                to={`/students/${student.id}`}
                                className="block truncate font-semibold text-slate-900 hover:text-brand-700"
                              >
                                {student.first_name} {student.last_name}
                              </Link>
                              <p className="truncate text-xs text-slate-500">
                                {student.guardian_name || 'No guardian on file'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-600">
                          {student.admission_no}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <Badge>{student.class_level}</Badge>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                          {student.subject_count}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <Badge tone={info.tone}>
                            {average != null ? `${average.toFixed(1)} · ${info.letter}` : '—'}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <Badge tone={student.is_active ? 'emerald' : 'slate'}>
                            {student.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              to={`/students/${student.id}`}
                              className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                              aria-label="View student"
                              title="View student"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            {has('students:update') && (
                              <IconButton
                                label="Edit student"
                                onClick={() => {
                                  setEditing(student);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </IconButton>
                            )}
                            {has('students:delete') && (
                              <IconButton
                                label="Delete student"
                                className="hover:bg-rose-50 hover:text-rose-600"
                                onClick={() => setDeleteTarget(student)}
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
            <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Showing <span className="font-semibold text-slate-700">{start}</span>–
                <span className="font-semibold text-slate-700">{end}</span> of{' '}
                <span className="font-semibold text-slate-700">{pagination.total}</span> students
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="px-1 text-xs text-slate-500">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page >= pagination.pages || loading}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <StudentForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        student={editing}
        onSaved={refresh}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete this student?"
        description={
          deleteTarget
            ? `${deleteTarget.first_name} ${deleteTarget.last_name} and all related enrolments and grades will be permanently deleted. This cannot be undone.`
            : ''
        }
      />
    </div>
  );
}
