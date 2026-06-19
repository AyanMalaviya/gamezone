import useAuthStore from '../store/authStore';
import { Navigate } from 'react-router-dom';

/**
 * AuthGuard — wraps /auth/login and /auth/register.
 * If the user is ALREADY logged in, redirect them to home (no need to see login).
 * If NOT logged in, render the auth page normally.
 */
export default function AuthGuard({ children }) {
  const user    = useAuthStore(s => s.user);
  const loading = useAuthStore(s => s.loading);

  // While Firebase is resolving auth state, show nothing (avoids flash)
  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#09090d',
        color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem',
      }}>
        Loading…
      </div>
    );
  }

  // Already authenticated → send home
  if (user && user.emailVerified) {
    return <Navigate to="/" replace />;
  }

  // Not logged in → show login/register page
  return children;
}
