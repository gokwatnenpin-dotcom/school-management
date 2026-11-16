import { useEffect, useState } from 'react';
import {
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock,
  KeyRound,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Input,
  PageHeader,
  cardClass,
} from '../components/ui';
import { useToast } from '../toast';
import { ROLE_LABELS, isPrincipal, positionLabel, roleDisplay } from '../permissions';
import { cx, formatDate, formatDateTime } from '../utils';

const capabilities = {
  supadmin: [
    'Full access to every part of Scholara',
    'Create and manage admins and other staff',
    'Manage students, subjects, enrolments and grades',
    'Review the complete audit trail',
  ],
  admin: [
    'Manage staff accounts and roles',
    'Add, update and remove students and subjects',
    'Record and clear grades for any student',
    'Review the audit trail',
  ],
  user: [
    'Add and update student records',
    'Create and update subjects',
    'Assign subjects and record grades',
    'Review the gradebook and class performance',
  ],
};

function capabilitiesFor(user) {
  const items = capabilities[user.role] ?? [];
  if (isPrincipal(user)) return [...items, 'Add teacher and support staff accounts'];
  return items;
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate text-sm text-slate-700">{value || '—'}</p>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, refresh } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState({ full_name: '', phone: '' });
  const [profileError, setProfileError] = useState('');
  const [profileFieldErrors, setProfileFieldErrors] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordFieldErrors, setPasswordFieldErrors] = useState({});
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setProfile({ full_name: user.full_name ?? '', phone: user.phone ?? '' });
  }, [user]);

  const handleProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileError('');
    setProfileFieldErrors({});
    try {
      await api('/auth/me', {
        method: 'PATCH',
        body: { full_name: profile.full_name, phone: profile.phone || undefined },
      });
      await refresh();
      toast.success('Profile updated.');
    } catch (err) {
      if (err instanceof ApiError && Array.isArray(err.details)) {
        const mapped = {};
        for (const detail of err.details) mapped[detail.field] = detail.message;
        setProfileFieldErrors(mapped);
      }
      setProfileError(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePassword = async (event) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordFieldErrors({});

    if (passwords.new_password !== passwords.confirm_password) {
      setPasswordFieldErrors({ confirm_password: 'Passwords do not match.' });
      return;
    }

    setSavingPassword(true);
    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: {
          current_password: passwords.current_password,
          new_password: passwords.new_password,
        },
      });
      toast.success('Password updated. Use it the next time you sign in.');
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      if (err instanceof ApiError && Array.isArray(err.details)) {
        const mapped = {};
        for (const detail of err.details) mapped[detail.field] = detail.message;
        setPasswordFieldErrors(mapped);
      }
      setPasswordError(err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="My profile"
        description="Manage your personal details and sign-in security."
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          <div className={cx(cardClass, 'overflow-hidden')}>
            <div className="h-20 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-400" />
            <div className="px-5 pb-5">
              <div className="-mt-8 flex items-end gap-4">
                <Avatar name={user.full_name} size="lg" className="ring-4 ring-white" />
                <div className="pb-1">
                  <h2 className="text-lg font-bold tracking-tight text-slate-900">
                    {user.full_name}
                  </h2>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={user.role === 'supadmin' ? 'violet' : user.role === 'admin' ? 'brand' : 'slate'}>
                  {ROLE_LABELS[user.role]}
                </Badge>
                <Badge tone="sky">{positionLabel(user.position)}</Badge>
                <Badge tone={user.is_active ? 'emerald' : 'slate'}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                <InfoRow icon={UserRound} label="Display name" value={user.full_name} />
                <InfoRow icon={Mail} label="Email address" value={user.email} />
                <InfoRow icon={Phone} label="Phone" value={user.phone} />
                <InfoRow icon={CalendarDays} label="Member since" value={formatDate(user.created_at)} />
                <InfoRow
                  icon={Clock}
                  label="Last sign-in"
                  value={user.last_login_at ? formatDateTime(user.last_login_at) : 'First session'}
                />
              </div>
            </div>
          </div>

          <div className={cx(cardClass, 'p-5')}>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand-600" />
              <h2 className="text-base font-semibold text-slate-900">What you can do</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Signed in as {roleDisplay(user)}. Permissions are enforced on the server.
            </p>
            <ul className="mt-4 space-y-2.5">
              {capabilitiesFor(user).map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-4 lg:col-span-3">
          <div className={cx(cardClass, 'p-5')}>
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-brand-600" />
              <h2 className="text-base font-semibold text-slate-900">Personal details</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Update how your name and phone number appear to other staff.
            </p>
            <form onSubmit={handleProfile} className="mt-5 space-y-4">
              {profileError && <Alert>{profileError}</Alert>}
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Full name"
                  name="full_name"
                  required
                  value={profile.full_name}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, full_name: event.target.value }))
                  }
                  error={profileFieldErrors.full_name}
                />
                <Input
                  label="Phone"
                  name="phone"
                  value={profile.phone}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, phone: event.target.value }))
                  }
                  error={profileFieldErrors.phone}
                  placeholder="+1 555 0100"
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" loading={savingProfile}>
                  <Save className="h-4 w-4" />
                  Save details
                </Button>
              </div>
            </form>
          </div>

          <div className={cx(cardClass, 'p-5')}>
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-brand-600" />
              <h2 className="text-base font-semibold text-slate-900">Password</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Use at least 8 characters with a letter and a number.
            </p>
            <form onSubmit={handlePassword} className="mt-5 space-y-4">
              {passwordError && <Alert>{passwordError}</Alert>}
              <Input
                label="Current password"
                name="current_password"
                type="password"
                required
                autoComplete="current-password"
                value={passwords.current_password}
                onChange={(event) =>
                  setPasswords((current) => ({ ...current, current_password: event.target.value }))
                }
                error={passwordFieldErrors.current_password}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="New password"
                  name="new_password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={passwords.new_password}
                  onChange={(event) =>
                    setPasswords((current) => ({ ...current, new_password: event.target.value }))
                  }
                  error={passwordFieldErrors.new_password}
                />
                <Input
                  label="Confirm new password"
                  name="confirm_password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={passwords.confirm_password}
                  onChange={(event) =>
                    setPasswords((current) => ({ ...current, confirm_password: event.target.value }))
                  }
                  error={passwordFieldErrors.confirm_password}
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" loading={savingPassword}>
                  <KeyRound className="h-4 w-4" />
                  Update password
                </Button>
              </div>
            </form>
          </div>

          <p className="px-1 text-xs text-slate-400">
            Student accounts are not supported. Scholara is an internal staff workspace.
          </p>
        </div>
      </div>
    </div>
  );
}
