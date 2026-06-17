import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const Spinner = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div
      aria-label="Loading"
      className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900"
      role="status"
    />
  </div>
);

const ProtectedRoute = () => {
  const loading = useAuthStore((state) => state.loading);
  const user = useAuthStore((state) => state.user);

  if (loading) {
    return <Spinner />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;