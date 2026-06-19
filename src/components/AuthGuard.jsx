import useAuthStore from '../store/authStore';
import { Navigate } from 'react-router-dom';

/**
 * AuthGuard — wraps /auth/login and /auth/register.
 * Redirects already-authenticated users away from auth pages.
 *
 * Google users: emailVerified is always true.
 * Email users:  only redirect if emailVerified (prevents verified-gate bypass).
 */
export default function AuthGuard({ children }) {
  const user    = useAuthStore(s => s.user);
  const loading = useAuthStore(s => s.loading);

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

  // Redirect if logged in via Google (providerData includes google.com)
  // OR logged in via email AND email is verified
  if (user) {
    const isGoogle = user.providerData?.some(p => p.providerId === 'google.com');
    if (isGoogle || user.emailVerified) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
