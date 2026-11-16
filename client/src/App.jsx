import { Navigate, Route, Routes } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from './auth';
import { canViewStaff } from './permissions';
import { AppLayout } from './components/AppLayout';
import { Button, FullScreenLoader, cardClass } from './components/ui';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import StudentDetail from './pages/StudentDetail';
import Subjects from './pages/Subjects';
import Gradebook from './pages/Gradebook';
import Staff from './pages/Staff';
import Audit from './pages/Audit';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

function ProtectedLayout() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout />;
}

function RequirePermission({ permission, allow, children }) {
  const { user, has } = useAuth();
  const permitted = allow ? allow(user) : has(permission);
  if (!permitted) {
    return (
      <div className={cardClass}>
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-500">
            <ShieldAlert className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Access restricted</h2>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Your role does not include this area. Ask an administrator if you believe you need
            access.
          </p>
          <Button variant="secondary" className="mt-5" onClick={() => window.history.back()}>
            Go back
          </Button>
        </div>
      </div>
    );
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="students" element={<Students />} />
        <Route path="students/:id" element={<StudentDetail />} />
        <Route path="subjects" element={<Subjects />} />
        <Route path="gradebook" element={<Gradebook />} />
        <Route
          path="staff"
          element={
            <RequirePermission allow={canViewStaff}>
              <Staff />
            </RequirePermission>
          }
        />
        <Route
          path="audit"
          element={
            <RequirePermission permission="audit:view">
              <Audit />
            </RequirePermission>
          }
        />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
