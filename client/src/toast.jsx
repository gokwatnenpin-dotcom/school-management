import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cx } from './utils';

const ToastContext = createContext(null);

let nextId = 1;

const styles = {
  success: {
    icon: CheckCircle2,
    iconClass: 'text-emerald-600',
    barClass: 'bg-emerald-500',
  },
  error: {
    icon: AlertTriangle,
    iconClass: 'text-rose-600',
    barClass: 'bg-rose-500',
  },
  info: {
    icon: Info,
    iconClass: 'text-brand-600',
    barClass: 'bg-brand-500',
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((items) => items.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const push = useCallback(
    (type, message) => {
      const id = nextId++;
      setToasts((items) => [...items, { id, type, message }]);
      const timer = setTimeout(() => dismiss(id), 4500);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end">
        {toasts.map((toast) => {
          const style = styles[toast.type] ?? styles.info;
          const Icon = style.icon;
          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 shadow-lg shadow-slate-900/5"
            >
              <span className={cx('mt-0.5 h-8 w-1 shrink-0 rounded-full', style.barClass)} />
              <Icon className={cx('mt-0.5 h-5 w-5 shrink-0', style.iconClass)} />
              <p className="flex-1 text-sm text-slate-700">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider.');
  return context;
}
