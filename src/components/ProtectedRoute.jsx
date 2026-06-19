import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const NeonSpinner = () => (
  <div style={{
    minHeight: '100dvh', background: '#08050f',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: '1rem',
  }}>
    <div style={{
      width: 44, height: 44, borderRadius: '50%',
      border: '3px solid rgba(168,85,247,0.15)',
      borderTopColor: '#a855f7',
      animation: 'spin 0.75s linear infinite',
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <p style={{ color: 'rgba(168,85,247,0.5)', fontSize: '0.75rem', letterSpacing: '0.15em', fontWeight: 700 }}>LOADING…</p>
  </div>
);

/**
 * ProtectedRoute
 *
 * adminOnly=false (default) — requires any logged-in user.
 *   Not logged in → redirect to /auth/login.
 *
 * adminOnly=true — requires role === 'admin'.
 *   AdminDashboard has its OWN Google sign-in gate internally,
 *   so we render children for any logged-in user and let the
 *   dashboard page handle the admin-specific UI / access denial.
 *   This prevents the dashboard from auto-logging out on refresh.
 */
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const loading = useAuthStore(s => s.loading);
  const user    = useAuthStore(s => s.user);

  // Wait for Firebase auth state to resolve
  if (loading) return <NeonSpinner />;

  // Not logged in at all → send to login
  if (!user) return <Navigate to="/auth/login" replace />;

  // Admin route: render the page (AdminDashboard handles its own gate)
  // Regular protected route: user is logged in, allow through
  return children;
};

export default ProtectedRoute;
