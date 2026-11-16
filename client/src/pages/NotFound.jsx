import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { cardClass } from '../components/ui';

export default function NotFound() {
  return (
    <div className={cardClass}>
      <div className="flex flex-col items-center px-6 py-20 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-100 text-slate-400">
          <Compass className="h-7 w-7" />
        </span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-brand-600">404</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Page not found</h1>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          The page you are looking for does not exist or may have been moved.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
