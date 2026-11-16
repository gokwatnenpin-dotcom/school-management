import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { useToast } from '../toast';
import { gradeInfo } from '../utils';
import { ConfirmDialog } from './ConfirmDialog';
import { Modal } from './Modal';
import { Alert, Badge, Button, Input, Textarea } from './ui';

export function GradeForm({ open, onClose, enrollment, studentName, subjectName, onSaved }) {
  const toast = useToast();
  const { has } = useAuth();
  const [score, setScore] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (open) {
      setScore(enrollment?.score != null ? String(enrollment.score) : '');
      setRemarks(enrollment?.remarks ?? '');
      setError('');
      setFieldErrors({});
      setSubmitting(false);
      setClearOpen(false);
      setClearing(false);
    }
  }, [open, enrollment]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setFieldErrors({});

    try {
      const data = await api(`/enrollments/${enrollment.id}/grade`, {
        method: 'PUT',
        body: { score: Number(score), remarks: remarks || undefined },
      });
      toast.success('Grade saved.');
      onSaved?.(data.grade);
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

  const handleClear = async () => {
    setClearing(true);
    try {
      await api(`/enrollments/${enrollment.id}/grade`, { method: 'DELETE' });
      toast.success('Grade cleared.');
      setClearOpen(false);
      onSaved?.(null);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setClearing(false);
    }
  };

  if (!enrollment) return null;

  const grade = gradeInfo(enrollment.score);
  const hasGrade = enrollment.grade_id != null || enrollment.score != null;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={hasGrade ? 'Update grade' : 'Record grade'}
        description="Score is recorded out of 100 and updates the student's average instantly."
        footer={
          <>
            {hasGrade && has('grades:delete') && (
              <Button
                variant="dangerSoft"
                onClick={() => setClearOpen(true)}
                className="mr-auto"
                disabled={submitting || clearing}
              >
                <Trash2 className="h-4 w-4" />
                Clear grade
              </Button>
            )}
            <Button variant="secondary" onClick={onClose} disabled={submitting || clearing}>
              Cancel
            </Button>
            <Button type="submit" form="grade-form" loading={submitting}>
              Save grade
            </Button>
          </>
        }
      >
        <form id="grade-form" onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert>{error}</Alert>}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">{studentName}</p>
              <p className="text-xs text-slate-500">{subjectName}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold tabular-nums text-slate-900">
                {hasGrade ? Number(enrollment.score).toFixed(1) : '—'}
              </span>
              <Badge tone={grade.tone}>{grade.letter}</Badge>
            </div>
          </div>

          <Input
            label="Score (0–100)"
            name="score"
            type="number"
            min="0"
            max="100"
            step="0.5"
            required
            value={score}
            onChange={(event) => {
              setScore(event.target.value);
              setFieldErrors((current) => ({ ...current, score: undefined }));
            }}
            error={fieldErrors.score}
            placeholder="85"
          />
          <Textarea
            label="Remarks"
            name="remarks"
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            error={fieldErrors.remarks}
            placeholder="Optional feedback for the student report."
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        onConfirm={handleClear}
        loading={clearing}
        title="Clear this grade?"
        description="The score and remarks for this subject will be deleted. The enrollment itself stays in place."
        confirmLabel="Clear grade"
      />
    </>
  );
}
