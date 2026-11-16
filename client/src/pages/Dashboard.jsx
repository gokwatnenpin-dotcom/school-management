import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Award,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Layers,
  Plus,
  RefreshCw,
  Users,
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  EmptyState,
  PageHeader,
  PageLoader,
  StatCard,
  cardClass,
} from '../components/ui';
import {
  auditDescription,
  auditTone,
  cx,
  firstName,
  formatDate,
  gradeBarClass,
  gradeInfo,
  greeting,
  timeAgo,
} from '../utils';

const toneDot = {
  brand: 'bg-brand-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  sky: 'bg-sky-500',
  violet: 'bg-violet-500',
  slate: 'bg-slate-400',
};

function GradeDistribution({ distribution }) {
  const max = Math.max(1, ...distribution.map((item) => item.count));
  return (
    <div className={cx(cardClass, 'flex flex-col p-5')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Grade distribution</h2>
          <p className="mt-0.5 text-xs text-slate-500">All recorded scores by letter grade</p>
        </div>
        <Badge tone="brand">Live</Badge>
      </div>
      <div className="mt-6 flex h-48 items-end gap-3">
        {distribution.map((item) => (
          <div key={item.letter} className="flex h-full flex-1 flex-col items-center gap-2">
            <div className="flex w-full flex-1 items-end">
              <div
                className={cx(
                  'w-full rounded-t-lg bg-gradient-to-t transition-all',
                  gradeBarClass[item.letter] ?? gradeBarClass.C,
                )}
                style={{
                  height: `${Math.max(4, (item.count / max) * 100)}%`,
                  opacity: item.count === 0 ? 0.35 : 1,
                }}
              />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-slate-700">{item.letter}</p>
              <p className="text-[11px] tabular-nums text-slate-400">{item.count}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClassPerformance({ classes }) {
  return (
    <div className={cx(cardClass, 'p-5')}>
      <div>
        <h2 className="text-base font-semibold text-slate-900">Class performance</h2>
        <p className="mt-0.5 text-xs text-slate-500">Average score by class</p>
      </div>
      <div className="mt-5 space-y-4">
        {classes.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">No classes yet.</p>
        )}
        {classes.map((item) => {
          const average = item.average_score != null ? Number(item.average_score) : null;
          return (
            <div key={item.class_level}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-slate-700">{item.class_level}</span>
                <span className="tabular-nums text-slate-500">
                  {average != null ? `${average.toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400"
                  style={{ width: `${average != null ? Math.min(100, average) : 0}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                {item.students} student{item.students === 1 ? '' : 's'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecentStudents({ students }) {
  return (
    <div className={cx(cardClass, 'flex flex-col')}>
      <div className="flex items-center justify-between gap-2 px-5 pb-3 pt-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Newest students</h2>
          <p className="mt-0.5 text-xs text-slate-500">Latest admissions to the school</p>
        </div>
        <Link
          to="/students"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
        >
          View all
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="divide-y divide-slate-100">
        {students.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-slate-400">No students yet.</p>
        )}
        {students.map((student) => (
          <Link
            key={student.id}
            to={`/students/${student.id}`}
            className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50"
          >
            <Avatar name={`${student.first_name} ${student.last_name}`} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">
                {student.first_name} {student.last_name}
              </p>
              <p className="truncate text-xs text-slate-500">
                {student.admission_no} · {student.class_level}
              </p>
            </div>
            <span className="shrink-0 text-[11px] text-slate-400">{timeAgo(student.created_at)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function RecentGrades({ grades }) {
  return (
    <div className={cx(cardClass, 'flex flex-col')}>
      <div className="flex items-center justify-between gap-2 px-5 pb-3 pt-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Recently graded</h2>
          <p className="mt-0.5 text-xs text-slate-500">Latest scores entered</p>
        </div>
        <Link
          to="/gradebook"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
        >
          Gradebook
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="divide-y divide-slate-100">
        {grades.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-slate-400">No grades recorded yet.</p>
        )}
        {grades.map((grade) => {
          const info = gradeInfo(grade.score);
          return (
            <div key={grade.id} className="flex items-center gap-3 px-5 py-3">
              <Avatar name={`${grade.first_name} ${grade.last_name}`} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {grade.first_name} {grade.last_name}
                </p>
                <p className="truncate text-xs text-slate-500">{grade.subject_name}</p>
              </div>
              <div className="text-right">
                <Badge tone={info.tone}>
                  {Number(grade.score).toFixed(1)} · {info.letter}
                </Badge>
                <p className="mt-1 text-[11px] text-slate-400">{timeAgo(grade.updated_at)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActivityFeed({ activity }) {
  return (
    <div className={cx(cardClass, 'p-5')}>
      <div>
        <h2 className="text-base font-semibold text-slate-900">Recent activity</h2>
        <p className="mt-0.5 text-xs text-slate-500">Audit trail across the school</p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {activity.map((log) => (
          <div
            key={log.id}
            className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3"
          >
            <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', toneDot[auditTone(log.action)])} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">
                {log.user_name ?? 'System'}
              </p>
              <p className="truncate text-xs text-slate-500">
                {auditDescription(log) || log.action.replace(/[._]/g, ' ')}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {formatDate(log.created_at)} · {timeAgo(log.created_at)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, has } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await api('/dashboard'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const average = data?.average_score != null ? Number(data.average_score) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-600">
            {greeting()}, {firstName(user.full_name)}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">School overview</h1>
          <p className="mt-1 text-sm text-slate-500">
            Here is what is happening across the school today.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={load} disabled={loading}>
            <RefreshCw className={cx('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button variant="secondary" onClick={() => navigate('/gradebook')}>
            <ClipboardList className="h-4 w-4" />
            Gradebook
          </Button>
          {has('students:create') && (
            <Button onClick={() => navigate('/students?new=1')}>
              <Plus className="h-4 w-4" />
              Add student
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert>
          {error}{' '}
          <button type="button" onClick={load} className="font-semibold underline">
            Try again
          </button>
        </Alert>
      )}

      {loading && !data ? (
        <PageLoader label="Loading school overview..." />
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={GraduationCap}
              label="Students"
              value={data.counts.students}
              hint="Active enrolment"
              tone="brand"
            />
            <StatCard
              icon={Users}
              label="Teaching staff"
              value={data.counts.teachers}
              hint={`${data.counts.staff} staff accounts in total`}
              tone="violet"
            />
            <StatCard
              icon={BookOpen}
              label="Subjects"
              value={data.counts.subjects}
              hint={`${data.counts.enrollments} subject enrolments`}
              tone="amber"
            />
            <StatCard
              icon={Award}
              label="Average score"
              value={average != null ? `${average.toFixed(1)}%` : '—'}
              hint={`${data.counts.grades} grades recorded`}
              tone="emerald"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <GradeDistribution distribution={data.distribution} />
            </div>
            <ClassPerformance classes={data.classes} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RecentStudents students={data.recent_students} />
            </div>
            <RecentGrades grades={data.recent_grades} />
          </div>

          {data.recent_activity.length > 0 && <ActivityFeed activity={data.recent_activity} />}
        </>
      ) : null}

      {!loading && data && data.counts.students === 0 && (
        <div className={cx(cardClass)}>
          <EmptyState
            icon={Layers}
            title="Your school is ready"
            description="Add your first student to start building the student register."
            action={
              has('students:create') ? (
                <Button onClick={() => navigate('/students?new=1')}>
                  <Plus className="h-4 w-4" />
                  Add student
                </Button>
              ) : null
            }
          />
        </div>
      )}
    </div>
  );
}
