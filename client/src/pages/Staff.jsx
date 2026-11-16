import { useEffect, useState } from 'react';
import {
  Mail,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
} from 'lucide-react';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Checkbox,
  EmptyState,
  IconButton,
  Input,
  PageHeader,
  PageLoader,
  Select,
  cardClass,
} from '../components/ui';
import { useToast } from '../toast';
import { ROLE_LABELS, canCreateStaff, isPrincipal, positionLabel } from '../permissions';
import { cx, formatDateTime, timeAgo } from '../utils';

const filterClass =
  'h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';

const roleTone = { supadmin: 'violet', admin: 'brand', user: 'slate' };
const positionTone = { principal: 'amber', teacher: 'sky', staff: 'slate' };

function StaffForm({ open, onClose, member, me, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'user',
    position: 'staff',
    is_active: true,
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const isSelf = Boolean(member && member.id === me.id);
  const principal = isPrincipal(me);

  useEffect(() => {
    if (!open) return;
    setForm({
      full_name: member?.full_name ?? '',
      email: member?.email ?? '',
      phone: member?.phone ?? '',
      password: '',
      role: member?.role ?? 'user',
      position: member?.position ?? 'staff',
      is_active: member?.is_active ?? true,
    });
    setError('');
    setFieldErrors({});
    setSubmitting(false);
  }, [open, member]);

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
      let data;
      if (member) {
        const payload = {
          full_name: form.full_name,
          email: form.email,
          phone: form.phone || undefined,
          position: form.position,
          is_active: form.is_active,
        };
        if (!isSelf) payload.role = form.role;
        if (form.password) payload.password = form.password;

        data = await api(`/users/${member.id}`, { method: 'PATCH', body: payload });
      } else {
        data = await api('/users', {
          method: 'POST',
          body: {
            full_name: form.full_name,
            email: form.email,
            phone: form.phone || undefined,
            password: form.password,
            role: form.role,
            position: form.position,
            is_active: form.is_active,
          },
        });
      }

      toast.success(member ? 'Staff account updated.' : 'Staff account created.');
      onSaved?.(data.user);
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

  const roleOptions =
    me.role === 'supadmin'
      ? ['supadmin', 'admin', 'user']
      : ['admin', 'user'];
  const positionOptions = principal ? ['teacher', 'staff'] : ['principal', 'teacher', 'staff'];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={member ? 'Edit staff account' : 'Add staff account'}
      description={
        principal
          ? 'Add a teacher or support staff account. Students cannot sign in.'
          : 'Accounts are for principals, teachers and support staff. Students cannot sign in.'
      }
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="staff-form" loading={submitting}>
            {member ? 'Save changes' : 'Create account'}
          </Button>
        </>
      }
    >
      <form id="staff-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Full name"
            name="full_name"
            required
            value={form.full_name}
            onChange={(event) => update('full_name', event.target.value)}
            error={fieldErrors.full_name}
            placeholder="Aisha Bello"
          />
          <Input
            label="Email address"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
            error={fieldErrors.email}
            placeholder="aisha@school.edu"
          />
          <Input
            label="Phone"
            name="phone"
            value={form.phone}
            onChange={(event) => update('phone', event.target.value)}
            error={fieldErrors.phone}
            placeholder="+1 555 0103"
          />
          <Input
            label={member ? 'New password' : 'Password'}
            name="password"
            type="password"
            required={!member}
            value={form.password}
            onChange={(event) => update('password', event.target.value)}
            error={fieldErrors.password}
            hint={member ? 'Leave blank to keep the current password.' : 'Minimum 8 characters with a number.'}
            autoComplete="new-password"
          />
          {!principal && (
            <Select
              label="Role"
              name="role"
              value={form.role}
              onChange={(event) => update('role', event.target.value)}
              error={fieldErrors.role}
              disabled={isSelf}
              hint={isSelf ? 'You cannot change your own role.' : undefined}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </Select>
          )}
          <Select
            label="Position"
            name="position"
            value={form.position}
            onChange={(event) => update('position', event.target.value)}
            error={fieldErrors.position}
          >
            {positionOptions.map((position) => (
              <option key={position} value={position}>
                {positionLabel(position)}
              </option>
            ))}
          </Select>
        </div>

        <Checkbox
          label="Account is active"
          checked={form.is_active}
          disabled={isSelf}
          onChange={(event) => update('is_active', event.target.checked)}
        />
      </form>
    </Modal>
  );
}

export default function Staff() {
  const { user: me, has } = useAuth();
  const toast = useToast();
  const principal = isPrincipal(me);
  const canAdd = canCreateStaff(me);

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [position, setPosition] = useState('');
  const [status, setStatus] = useState('all');
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
          if (role) params.set('role', role);
          if (position) params.set('position', position);
          if (status !== 'all') params.set('status', status);

          const data = await api(`/users?${params.toString()}`);
          if (!cancelled) setUsers(data.users);
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
  }, [search, role, position, status, reloadKey]);

  const refresh = () => setReloadKey((key) => key + 1);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/users/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('Staff account removed.');
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const canTouch = (member) =>
    member.role !== 'supadmin' || me.role === 'supadmin';

  return (
    <div className="space-y-5">
      <PageHeader
        title="Staff & roles"
        description={`${users.length} staff account${users.length === 1 ? '' : 's'} across the school.`}
        actions={
          canAdd ? (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add staff account
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search staff by name, email or phone"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <div className={cx('grid grid-cols-2 gap-2', principal ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
          {!principal && (
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className={filterClass}
              aria-label="Filter by role"
            >
              <option value="">All roles</option>
              <option value="supadmin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
          )}
          <select
            value={position}
            onChange={(event) => setPosition(event.target.value)}
            className={filterClass}
            aria-label="Filter by position"
          >
            <option value="">All positions</option>
            <option value="principal">Principal</option>
            <option value="teacher">Teacher</option>
            <option value="staff">Staff</option>
          </select>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={filterClass}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
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
          <PageLoader label="Loading staff accounts..." />
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No staff accounts found"
            description="Adjust the filters or create a new staff account."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Staff member
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Position
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Role
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Last sign-in
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((member) => (
                  <tr key={member.id} className="transition hover:bg-slate-50/70">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={member.full_name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            {member.full_name}
                            {member.id === me.id && (
                              <span className="ml-2 text-[11px] font-medium text-slate-400">(you)</span>
                            )}
                          </p>
                          <p className="flex items-center gap-1 truncate text-xs text-slate-500">
                            <Mail className="h-3 w-3 shrink-0" />
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <Badge tone={positionTone[member.position]}>
                        {positionLabel(member.position)}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <Badge tone={roleTone[member.role]}>
                        {member.role === 'supadmin' && <ShieldCheck className="h-3 w-3" />}
                        {ROLE_LABELS[member.role]}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <Badge tone={member.is_active ? 'emerald' : 'slate'}>
                        {member.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-500">
                      {member.last_login_at ? (
                        <>
                          <span className="block text-slate-600">{timeAgo(member.last_login_at)}</span>
                          <span>{formatDateTime(member.last_login_at)}</span>
                        </>
                      ) : (
                        'Never'
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {has('users:update') && canTouch(member) && (
                          <IconButton
                            label="Edit staff account"
                            onClick={() => {
                              setEditing(member);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </IconButton>
                        )}
                        {has('users:delete') && canTouch(member) && member.id !== me.id && (
                          <IconButton
                            label="Delete staff account"
                            className="hover:bg-rose-50 hover:text-rose-600"
                            onClick={() => setDeleteTarget(member)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </IconButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={cx(cardClass, 'flex items-start gap-3 p-4 text-sm text-slate-600')}>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
          <UserCog className="h-4 w-4" />
        </span>
        <p>
          <span className="font-semibold text-slate-900">Role model:</span> super admins manage
          everything including other admins. Admins manage staff, students, subjects and grades.
          Principals can add teacher and support staff accounts, and all users (principals,
          teachers and staff) can add students, create subjects and record grades.
        </p>
      </div>

      <StaffForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        member={editing}
        me={me}
        onSaved={refresh}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete this staff account?"
        description={
          deleteTarget
            ? `${deleteTarget.full_name} will no longer be able to sign in. Records they created remain in the system.`
            : ''
        }
      />
    </div>
  );
}
