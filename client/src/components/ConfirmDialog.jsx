import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './ui';

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Delete',
  loading = false,
  children,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50 p-3.5 text-sm text-rose-700">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>{description}</div>
      </div>
      {children}
    </Modal>
  );
}
