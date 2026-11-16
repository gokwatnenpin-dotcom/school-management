import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../auth';
import { Alert, Button, FullScreenLoader, Input } from '../components/ui';

const features = [
  {
    icon: Users,
    title: 'Student records',
    description: 'Admissions, guardians and class placement in one place.',
  },
  {
    icon: CheckCircle2,
    title: 'Grades that stay current',
    description: 'Teachers record scores and averages update automatically.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-based access',
    description: 'Super admins, admins and staff each see exactly what they need.',
  },
];

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <FullScreenLoader />;
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-brand-950 p-12 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700" />
        <div className="absolute -right-24 top-1/4 h-96 w-96 rounded-full bg-brand-400/25 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-emerald-300/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:48px_48px]" />

        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
            <GraduationCap className="h-6 w-6" />
          </span>
          <div>
            <p className="text-lg font-bold tracking-tight">Scholara</p>
            <p className="text-xs text-brand-100/80">School management</p>
          </div>
        </div>

        <div className="relative mt-auto max-w-md">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/20 backdrop-blur">
            <KeyRound className="h-3.5 w-3.5" />
            Staff access only
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight">
            Run your school with clarity.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-brand-100/85">
            Principals, teachers and support staff manage admissions, subjects and grades from a
            single, secure workspace. Student sign-in is not available by design.
          </p>

          <div className="mt-8 space-y-4">
            {features.map((feature) => (
              <div key={feature.title} className="flex gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <feature.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{feature.title}</p>
                  <p className="text-xs text-brand-100/70">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative mt-12 text-xs text-brand-200/60">
          © {new Date().getFullYear()} Scholara. Built for school teams.
        </p>
      </div>

      <div className="flex items-center justify-center bg-slate-50 px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-600/25">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div>
              <p className="text-base font-bold tracking-tight text-slate-900">Scholara</p>
              <p className="text-xs text-slate-500">School management</p>
            </div>
          </div>

          <h1 className="mt-8 text-3xl font-bold tracking-tight text-slate-900 lg:mt-0">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to manage students, subjects, grades and staff.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && <Alert>{error}</Alert>}

            <Input
              label="Email address"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@school.edu"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <Input
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              rightAdornment={
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />

            <Button type="submit" size="lg" loading={submitting} className="w-full">
              Sign in
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            Need access? Contact your school administrator. Student accounts are not part of this
            system.
          </p>
        </div>
      </div>
    </div>
  );
}
