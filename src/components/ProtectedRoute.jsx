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
 * ProtectedRoute — renders `children` (not <Outlet />) so it works with
 * element={<ProtectedRoute><Page /></ProtectedRoute>} pattern.
 *
 * For admin routes, the AdminDashboard handles its own Google sign-in
 * internally, so we just show a spinner while loading and pass through.
 */
const ProtectedRoute = ({ children, adminOnly }) => {
  const loading = useAuthStore(s => s.loading);

  // Wait for Firebase auth to resolve before rendering anything
  if (loading) return <NeonSpinner />;

  // For admin routes: AdminDashboard contains its own login gate,
  // so we always render children and let the page manage access.
  return children;
};

export default ProtectedRoute;
