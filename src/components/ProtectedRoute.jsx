import { Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import AdminDashboard from '../pages/AdminDashboard';

// Full-page neon spinner
const NeonSpinner = () => (
  <div style={{
    minHeight: '100dvh',
    background: '#08050f',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
  }}>
    <div style={{
      width: 44,
      height: 44,
      borderRadius: '50%',
      border: '3px solid rgba(168,85,247,0.15)',
      borderTopColor: '#a855f7',
      animation: 'spin 0.75s linear infinite',
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <p style={{ color: 'rgba(168,85,247,0.5)', fontSize: '0.75rem', letterSpacing: '0.15em', fontWeight: 700 }}>
      LOADING…
    </p>
  </div>
);

/**
 * ProtectedRoute
 * ──────────────
 * - While Firebase resolves auth state  →  show spinner
 * - Not authenticated                   →  show AdminDashboard login page
 *   (AdminDashboard handles its own Google Sign-In internally)
 * - Authenticated                       →  render <Outlet /> (AdminDashboard)
 *
 * We intentionally do NOT redirect to "/" on unauthenticated access
 * so the admin URL stays secret and doesn’t expose itself in the URL bar.
 */
const ProtectedRoute = () => {
  const loading = useAuthStore(s => s.loading);
  const user    = useAuthStore(s => s.user);

  if (loading) return <NeonSpinner />;

  // Not logged in — render the dashboard which shows its own login gate
  // This keeps the secret admin URL opaque to visitors
  if (!user) return <AdminDashboard />;

  return <Outlet />;
};

export default ProtectedRoute;
