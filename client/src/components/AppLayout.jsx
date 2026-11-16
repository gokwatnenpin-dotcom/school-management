import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../auth';
import { roleDisplay, canViewStaff } from '../permissions';
import { cx, currentAcademicYear, firstName } from '../utils';
import { Avatar } from './ui';

const navigation = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/subjects', label: 'Subjects', icon: BookOpen },
  { to: '/gradebook', label: 'Gradebook', icon: ClipboardList },
  { to: '/staff', label: 'Staff & roles', icon: UserCog, when: canViewStaff },
  { to: '/audit', label: 'Audit log', icon: ScrollText, permission: 'audit:view' },
  { to: '/profile', label: 'My profile', icon: Settings },
];

function pageTitle(pathname) {
  if (pathname === '/') return 'Dashboard';
  if (pathname.startsWith('/students')) return 'Students';
  if (pathname.startsWith('/subjects')) return 'Subjects';
  if (pathname.startsWith('/gradebook')) return 'Gradebook';
  if (pathname.startsWith('/staff')) return 'Staff & roles';
  if (pathname.startsWith('/audit')) return 'Audit log';
  if (pathname.startsWith('/profile')) return 'My profile';
  return 'Scholara';
}

export function AppLayout() {
  const { user, has, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const items = navigation.filter((item) => {
    if (item.when) return item.when(user);
    return !item.permission || has(item.permission);
  });

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200/80 bg-white transition-transform duration-200 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-5 pb-4 pt-6">
          <NavLink to="/" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-600/25">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-base font-bold tracking-tight text-slate-900">Scholara</span>
              <span className="block text-xs text-slate-500">School management</span>
            </span>
          </NavLink>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </p>
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cx(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cx(
                      'h-[18px] w-[18px]',
                      isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-500',
                    )}
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200/80 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <Avatar name={user.full_name} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{user.full_name}</p>
              <p className="truncate text-xs text-slate-500">{roleDisplay(user)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Scholara
              </p>
              <h2 className="truncate text-sm font-semibold text-slate-900">
                {pageTitle(location.pathname)}
              </h2>
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <span className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 sm:inline-flex">
                <CalendarDays className="h-3.5 w-3.5" />
                {currentAcademicYear()} · Term 1
              </span>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3">
                <Avatar name={user.full_name} size="xs" />
                <span className="hidden max-w-[8rem] truncate text-xs font-semibold text-slate-700 sm:block">
                  {firstName(user.full_name)}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
