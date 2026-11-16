import { useEffect, useState } from 'react';
import { Award, BookOpen, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import {
  Alert,
  Button,
  EmptyState,
  IconButton,
  Input,
  PageHeader,
  PageLoader,
  Textarea,
  cardClass,
} from '../components/ui';
import { useToast } from '../toast';
import { cx } from '../utils';

function SubjectForm({ open, onClose, subject, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ code: '', name: '', description: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        code: subject?.code ?? '',
        name: subject?.name ?? '',
        description: subject?.description ?? '',
      });
      setError('');
      setFieldErrors({});
      setSubmitting(false);
    }
  }, [open, subject]);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setFieldErrors({});
    try {
      const payload = { code: form.code, name: form.name };
      if (form.description) payload.description = form.description;

      const data = subject
        ? await api(`/subjects/${subject.id}`, { method: 'PATCH', body: payload })
        : await api('/subjects', { method: 'POST', body: payload });

      toast.success(subject ? 'Subject updated.' : 'Subject added to the curriculum.');
      onSaved?.(data.subject);
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={subject ? 'Edit subject' : 'Add subject'}
      description="Subject codes are unique and shown across the gradebook and report cards."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="subject-form" loading={submitting}>
            {subject ? 'Save changes' : 'Add subject'}
          </Button>
        </>
      }
    >
      <form id="subject-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Code"
            name="code"
            required
            value={form.code}
            onChange={(event) => update('code', event.target.value)}
            error={fieldErrors.code}
            placeholder="MATH"
            className="uppercase"
          />
          <Input
            label="Subject name"
            name="name"
            required
            className="sm:col-span-2"
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
            error={fieldErrors.name}
            placeholder="Mathematics"
          />
        </div>
        <Textarea
          label="Description"
          name="description"
          value={form.description}
          onChange={(event) => update('description', event.target.value)}
          error={fieldErrors.description}
          placeholder="What this subject covers."
        />
      </form>
    </Modal>
  );
}

export default function Subjects() {
  const { has } = useAuth();
  const toast = useToast();
  const [subjects, setSubjects] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(
      async () => {
        setLoading(true);
        setError('');
        try {
          const params = new URLSearchParams();
          if (search.trim()) params.set('search', search.trim());
          const data = await api(`/subjects?${params.toString()}`);
          if (!cancelled) setSubjects(data.subjects);
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
  }, [search, reloadKey]);

  const refresh = () => setReloadKey((key) => key + 1);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/subjects/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('Subject removed from the curriculum.');
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Subjects"
        description={`${subjects.length} subject${subjects.length === 1 ? '' : 's'} in the curriculum.`}
        actions={
          has('subjects:create') ? (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add subject
            </Button>
          ) : null
        }
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search subjects by code or name"
          className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      {error && (
        <Alert>
          {error}{' '}
          <button type="button" onClick={refresh} className="font-semibold underline">
            Retry
          </button>
        </Alert>
      )}

      {loading ? (
        <PageLoader label="Loading subjects..." />
      ) : subjects.length === 0 ? (
        <div className={cardClass}>
          <EmptyState
            icon={BookOpen}
            title="No subjects found"
            description={
              search
                ? 'No subject matches your search.'
                : 'Add the first subject so staff can start assigning it to students.'
            }
            action={
              has('subjects:create') ? (
                <Button
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Add subject
                </Button>
              ) : null
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {subjects.map((subject) => {
            const average = subject.average_score != null ? Number(subject.average_score) : null;
            return (
              <div key={subject.id} className={cx(cardClass, 'flex flex-col p-5')}>
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-bold tracking-wide text-brand-700">
                    {subject.code}
                  </span>
                  <div className="flex items-center gap-1">
                    {has('subjects:update') && (
                      <IconButton
                        label="Edit subject"
                        onClick={() => {
                          setEditing(subject);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                    )}
                    {has('subjects:delete') && (
                      <IconButton
                        label="Delete subject"
                        className="hover:bg-rose-50 hover:text-rose-600"
                        onClick={() => setDeleteTarget(subject)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    )}
                  </div>
                </div>

                <h3 className="mt-3 text-base font-semibold text-slate-900">{subject.name}</h3>
                <p className="mt-1 line-clamp-2 flex-1 text-sm text-slate-500">
                  {subject.description || 'No description yet.'}
                </p>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    {subject.enrolled_count} enrolled
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5 text-slate-400" />
                    Average {average != null ? `${average.toFixed(1)}%` : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SubjectForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        subject={editing}
        onSaved={refresh}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete this subject?"
        description={
          deleteTarget
            ? `${deleteTarget.name} will be removed from every student's enrolments and grades. This cannot be undone.`
            : ''
        }
      />
    </div>
  );
}
