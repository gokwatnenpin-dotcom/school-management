import { AlertTriangle, Loader2 } from 'lucide-react';
import { avatarClass, cx, initials } from '../utils';

export const cardClass = 'rounded-2xl border border-slate-200/80 bg-white shadow-sm';

const buttonVariants = {
  primary:
    'bg-brand-600 text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700 focus-visible:ring-brand-500',
  secondary:
    'border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:ring-slate-400',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-300',
  danger:
    'bg-rose-600 text-white shadow-sm shadow-rose-600/20 hover:bg-rose-700 focus-visible:ring-rose-500',
  dangerSoft:
    'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 focus-visible:ring-rose-400',
};

const buttonSizes = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-11 gap-2 px-5 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...props
}) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center rounded-lg font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function IconButton({ label, className, children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

const controlClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';
const errorControlClass = 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20';

export function Field({ label, hint, error, required, htmlFor, className, children }) {
  return (
    <div className={cx('space-y-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-rose-500"> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-medium text-rose-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ label, hint, error, required, className, id, rightAdornment, ...props }) {
  const inputId = id || props.name;
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={inputId}>
      <div className="relative">
        <input
          id={inputId}
          className={cx(
            controlClass,
            rightAdornment && 'pr-11',
            error && errorControlClass,
            className,
          )}
          {...props}
        />
        {rightAdornment && (
          <span className="absolute inset-y-0 right-1.5 flex items-center">{rightAdornment}</span>
        )}
      </div>
    </Field>
  );
}

export function Select({ label, hint, error, required, className, id, children, ...props }) {
  const selectId = id || props.name;
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={selectId}>
      <select
        id={selectId}
        className={cx(controlClass, 'pr-8', error && errorControlClass, className)}
        {...props}
      >
        {children}
      </select>
    </Field>
  );
}

export function Textarea({ label, hint, error, required, className, id, rows = 3, ...props }) {
  const textareaId = id || props.name;
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={textareaId}>
      <textarea
        id={textareaId}
        rows={rows}
        className={cx(controlClass, 'resize-y', error && errorControlClass, className)}
        {...props}
      />
    </Field>
  );
}

export function Checkbox({ label, className, ...props }) {
  return (
    <label className={cx('flex items-center gap-2 text-sm text-slate-700', className)}>
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 accent-brand-600"
        {...props}
      />
      {label}
    </label>
  );
}

const badgeTones = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-500/10',
  brand: 'bg-brand-50 text-brand-700 ring-brand-600/20',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  orange: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  rose: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  sky: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
};

export function Badge({ tone = 'slate', className, children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        badgeTones[tone] ?? badgeTones.slate,
        className,
      )}
    >
      {children}
    </span>
  );
}

const avatarSizes = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-20 w-20 text-2xl',
};

export function Avatar({ name = '', size = 'md', className }) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold tracking-wide',
        avatarSizes[size],
        avatarClass(name),
        className,
      )}
    >
      {initials(name) || '?'}
    </span>
  );
}

export function StatCard({ icon: Icon, label, value, hint, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    violet: 'bg-violet-50 text-violet-600',
    sky: 'bg-sky-50 text-sky-600',
  };

  return (
    <div className={cx(cardClass, 'p-5')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
        <span className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-xl', tones[tone])}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {hint && <p className="mt-3 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Alert({ tone = 'rose', children, className }) {
  const tones = {
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    brand: 'border-brand-200 bg-brand-50 text-brand-800',
  };
  return (
    <div
      className={cx(
        'flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm',
        tones[tone] ?? tones.rose,
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cx('flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
      {Icon && (
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageLoader({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-sm text-slate-500">
      <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      {label}
    </div>
  );
}

export function FullScreenLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-600/25">
          <Loader2 className="h-6 w-6 animate-spin" />
        </span>
        <p className="text-sm font-medium text-slate-500">Loading Scholara...</p>
      </div>
    </div>
  );
}
