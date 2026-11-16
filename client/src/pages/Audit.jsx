import { useEffect, useState } from 'react';
import { RefreshCw, ScrollText, Search } from 'lucide-react';
import { api } from '../api';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  EmptyState,
  PageHeader,
  PageLoader,
  cardClass,
} from '../components/ui';
import { ROLE_LABELS } from '../permissions';
import {
  auditDescription,
  auditLabel,
  auditTone,
  cx,
  formatDateTime,
  timeAgo,
} from '../utils';

const filterClass =
  'h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';

const actionOptions = [
  'auth.login',
  'student.created',
  'student.updated',
  'student.deleted',
  'subject.created',
  'subject.updated',
  'subject.deleted',
  'enrollment.created',
  'enrollment.deleted',
  'grade.saved',
  'grade.deleted',
  'user.created',
  'user.updated',
  'user.deleted',
  'profile.updated',
  'auth.password_changed',
];

const roleTone = { supadmin: 'violet', admin: 'brand', user: 'slate' };

export default function Audit() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(
      async () => {
        setLoading(true);
        setError('');
        try {
          const params = new URLSearchParams({ limit: '150' });
          if (search.trim()) params.set('search', search.trim());
          if (action) params.set('action', action);

          const data = await api(`/audit?${params.toString()}`);
          if (!cancelled) setLogs(data.logs);
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
  }, [search, action, reloadKey]);

  const refresh = () => setReloadKey((key) => key + 1);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit log"
        description="A permanent trail of sign-ins, records and grade changes across the school."
        actions={
          <Button variant="secondary" onClick={refresh} disabled={loading}>
            <RefreshCw className={cx('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by staff member, target or details"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <select
          value={action}
          onChange={(event) => setAction(event.target.value)}
          className={filterClass}
          aria-label="Filter by action"
        >
          <option value="">All actions</option>
          {actionOptions.map((option) => (
            <option key={option} value={option}>
              {auditLabel(option)}
            </option>
          ))}
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
          <PageLoader label="Loading audit trail..." />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No activity found"
            description="Actions performed in Scholara will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    When
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Staff member
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Action
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Details
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Target
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="transition hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-500">
                      <span className="block font-medium text-slate-700">
                        {timeAgo(log.created_at)}
                      </span>
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={log.user_name || 'System'} size="xs" />
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {log.user_name ?? 'System'}
                          </p>
                          {log.user_role && (
                            <Badge tone={roleTone[log.user_role]}>
                              {ROLE_LABELS[log.user_role]}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <Badge tone={auditTone(log.action)}>{auditLabel(log.action)}</Badge>
                    </td>
                    <td className="px-5 py-3 text-slate-600" title={JSON.stringify(log.details, null, 2)}>
                      {auditDescription(log) || '—'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-[11px] text-slate-400">
                      {log.entity}
                      {log.entity_id ? ` #${log.entity_id}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
