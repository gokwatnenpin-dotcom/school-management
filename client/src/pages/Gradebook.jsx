import { useEffect, useState } from 'react';
import {
  Award,
  ClipboardList,
  Layers,
  Pencil,
  Plus,
  Search,
} from 'lucide-react';
import { api } from '../api';
import { GradeForm } from '../components/GradeForm';
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
import { CLASS_LEVELS, TERMS, cx, gradeInfo } from '../utils';

const filterClass =
  'h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';

export default function Gradebook() {
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState({ total: 0, graded: 0, average_score: null });
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [termFilter, setTermFilter] = useState('');
  const [gradedFilter, setGradedFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [gradeTarget, setGradeTarget] = useState(null);

  useEffect(() => {
    Promise.all([api('/students/classes'), api('/subjects')])
      .then(([classData, subjectData]) => {
        setClasses(classData.classes);
        setSubjects(subjectData.subjects);
      })
      .catch(() => {
        setClasses([]);
        setSubjects([]);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(
      async () => {
        setLoading(true);
        setError('');
        try {
          const params = new URLSearchParams();
          if (search.trim()) params.set('search', search.trim());
          if (classFilter) params.set('class_level', classFilter);
          if (subjectFilter) params.set('subject_id', subjectFilter);
          if (termFilter) params.set('term', termFilter);
          if (gradedFilter !== 'all') params.set('graded', gradedFilter);

          const data = await api(`/grades?${params.toString()}`);
          if (!cancelled) {
            setEntries(data.entries);
            setSummary(data.summary);
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
  }, [search, classFilter, subjectFilter, termFilter, gradedFilter, reloadKey]);

  const refresh = () => setReloadKey((key) => key + 1);
  const average = summary.average_score != null ? Number(summary.average_score) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Gradebook"
        description="Record and review scores across every subject and class."
        actions={
          <Badge tone="brand">
            <ClipboardList className="h-3.5 w-3.5" />
            {summary.total} entries
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Layers}
          label="Enrolments"
          value={summary.total}
          hint="Subject assignments in view"
          tone="brand"
        />
        <StatCard
          icon={ClipboardList}
          label="Graded"
          value={summary.graded}
          hint={`${summary.total - summary.graded} awaiting a score`}
          tone="violet"
        />
        <StatCard
          icon={Award}
          label="Average score"
          value={average != null ? `${average.toFixed(1)}%` : '—'}
          hint="Across filtered entries"
          tone="emerald"
        />
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search student, admission number or subject"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select
            value={classFilter}
            onChange={(event) => setClassFilter(event.target.value)}
            className={filterClass}
            aria-label="Filter by class"
          >
            <option value="">All classes</option>
            {classes.map((item) => (
              <option key={item.class_level} value={item.class_level}>
                {item.class_level}
              </option>
            ))}
          </select>
          <select
            value={subjectFilter}
            onChange={(event) => setSubjectFilter(event.target.value)}
            className={filterClass}
            aria-label="Filter by subject"
          >
            <option value="">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.code}
              </option>
            ))}
          </select>
          <select
            value={termFilter}
            onChange={(event) => setTermFilter(event.target.value)}
            className={filterClass}
            aria-label="Filter by term"
          >
            <option value="">All terms</option>
            {TERMS.map((term) => (
              <option key={term} value={term}>
                {term}
              </option>
            ))}
          </select>
          <select
            value={gradedFilter}
            onChange={(event) => setGradedFilter(event.target.value)}
            className={filterClass}
            aria-label="Filter by grading status"
          >
            <option value="all">All entries</option>
            <option value="yes">Graded</option>
            <option value="no">Not graded</option>
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
          <PageLoader label="Loading gradebook..." />
        ) : entries.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No grade entries found"
            description="Adjust the filters, or assign subjects to students to start recording grades."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Student
                  </th>
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
                    Score
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => {
                  const info = gradeInfo(entry.score);
                  return (
                    <tr key={entry.enrollment_id} className="transition hover:bg-slate-50/70">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={`${entry.first_name} ${entry.last_name}`} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {entry.first_name} {entry.last_name}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {entry.admission_no} · {entry.class_level}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-medium text-slate-800">{entry.subject_name}</span>
                        <span className="block font-mono text-[11px] text-slate-400">
                          {entry.subject_code}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                        {entry.teacher_name || 'Unassigned'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                        {entry.term}
                        <span className="block text-[11px] text-slate-400">
                          {entry.academic_year}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        {entry.score != null ? (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold tabular-nums text-slate-900">
                              {Number(entry.score).toFixed(1)}
                            </span>
                            <Badge tone={info.tone}>{info.letter}</Badge>
                          </div>
                        ) : (
                          <Badge tone="slate">Not graded</Badge>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            setGradeTarget({ ...entry, id: entry.enrollment_id })
                          }
                        >
                          {entry.grade_id ? (
                            <>
                              <Pencil className="h-3.5 w-3.5" />
                              Edit grade
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5" />
                              Record
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <GradeForm
        open={Boolean(gradeTarget)}
        onClose={() => setGradeTarget(null)}
        enrollment={gradeTarget}
        studentName={
          gradeTarget ? `${gradeTarget.first_name} ${gradeTarget.last_name}` : ''
        }
        subjectName={gradeTarget?.subject_name}
        onSaved={refresh}
      />
    </div>
  );
}
