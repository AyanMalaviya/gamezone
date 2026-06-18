import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Loader2, Mail, Lock, Eye, EyeOff,
  Gamepad2, Zap, AlertCircle, CheckCircle2, Send,
} from 'lucide-react';
import { loginWithEmail, registerWithEmail, loginWithGoogle } from '../hooks/useAuth';
import useAuthStore from '../store/authStore';
import '../styles/auth.css';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

function Particles() {
  return (
    <div className="auth-particles" aria-hidden="true">
      {[...Array(18)].map((_, i) => (
        <span key={i} className="auth-particle" style={{
          '--x': `${Math.random() * 100}%`,
          '--y': `${Math.random() * 100}%`,
          '--d': `${4 + Math.random() * 10}s`,
          '--delay': `${Math.random() * 6}s`,
          '--size': `${2 + Math.random() * 3}px`,
        }} />
      ))}
    </div>
  );
}

// Shown after successful registration instead of redirecting
function VerifyEmailScreen({ email, onBack }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 16, padding: '8px 0 4px', textAlign: 'center',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'rgba(124,58,237,0.12)',
        border: '2px solid rgba(124,58,237,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 24px rgba(124,58,237,0.2)',
      }}>
        <Send size={26} color="#a78bfa" />
      </div>
      <div>
        <h2 style={{
          fontFamily: "'Rajdhani','Inter',sans-serif",
          fontWeight: 700, fontSize: '1.2rem', color: '#fff', marginBottom: 6,
        }}>Check your inbox</h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.83rem', lineHeight: 1.6 }}>
          We sent a verification link to<br />
          <strong style={{ color: 'rgba(255,255,255,0.75)' }}>{email}</strong>
        </p>
      </div>
      <div style={{
        background: 'rgba(124,58,237,0.08)',
        border: '1px solid rgba(124,58,237,0.18)',
        borderRadius: 10, padding: '12px 16px',
        fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)',
        lineHeight: 1.6, width: '100%',
      }}>
        Click the link in the email to activate your account,
        then come back here to sign in.
      </div>
      <button
        type="button"
        onClick={onBack}
        style={{
          marginTop: 4, background: 'none', border: 'none',
          color: '#a78bfa', fontSize: '0.83rem', cursor: 'pointer',
          textDecoration: 'underline', textUnderlineOffset: 3,
        }}
      >
        Back to Sign In
      </button>
    </div>
  );
}

export default function AuthPage() {
  const { mode }  = useParams();
  const navigate  = useNavigate();
  const user      = useAuthStore(s => s.user);
  const authLoading = useAuthStore(s => s.loading);

  const [tab, setTab]             = useState(mode === 'register' ? 'register' : 'login');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState('');
  const [verifyScreen, setVerify] = useState(false); // shown after register
  const [verifyEmail, setVerifyEmail] = useState('');
  const sliderRef = useRef(null);

  // If already logged in (and email verified), go home
  useEffect(() => {
    if (!authLoading && user && user.emailVerified) navigate('/');
  }, [user, authLoading, navigate]);

  // Keep URL in sync with tab
  useEffect(() => { navigate(`/auth/${tab}`, { replace: true }); }, [tab]); // eslint-disable-line

  const resetForm = () => { setEmail(''); setPassword(''); setError(''); setShowPw(false); setVerify(false); };
  const switchTab = (t) => { setTab(t); resetForm(); };

  const friendly = (code = '', msg = '') => {
    const s = code + msg;
    if (s.includes('user-not-found') || s.includes('invalid-credential')) return 'No account found with those credentials.';
    if (s.includes('wrong-password'))      return 'Incorrect password. Try again.';
    if (s.includes('email-already'))       return 'Email already registered — try signing in.';
    if (s.includes('weak-password'))       return 'Password must be at least 6 characters.';
    if (s.includes('invalid-email'))       return 'Please enter a valid email address.';
    if (s.includes('too-many-requests'))   return 'Too many attempts. Wait a moment and retry.';
    if (s.includes('email-not-verified'))  return 'Email not verified. Check your inbox for the verification link.';
    if (s.includes('popup-closed'))        return 'Sign-in popup was closed. Please try again.';
    if (s.includes('network-request'))     return 'Network error. Check your connection.';
    return msg.replace('Firebase: ', '').replace(/\s*\(.*\)/, '') || 'Something went wrong.';
  };

  const handleEmail = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      if (tab === 'login') {
        await loginWithEmail(email, password);
        // onAuthStateChanged + useEffect redirect handles navigation
      } else {
        await registerWithEmail(email, password);
        setVerifyEmail(email);
        setVerify(true);
      }
    } catch (err) {
      setError(friendly(err.code ?? '', err.message ?? ''));
    } finally { setBusy(false); }
  };

  // Google — triggers redirect, page reloads, result handled in useAuthListener
  const handleGoogle = async () => {
    setError(''); setBusy(true);
    try {
      await loginWithGoogle();
      // page will redirect to Google and come back; no navigate() needed here
    } catch (err) {
      setBusy(false);
      setError(friendly(err.code ?? '', err.message ?? ''));
    }
    // Don't setBusy(false) on success path — page will reload
  };

  const isLogin = tab === 'login';

  return (
    <div className="auth-root">
      <Particles />
      <div className="auth-bg" aria-hidden="true">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />
        <div className="auth-grid" />
      </div>

      <Link to="/" className="auth-back">
        <Gamepad2 size={15} />
        <span>GameZone</span>
      </Link>

      <div className="auth-card">
        <div className="auth-card-edge" />

        <div className="auth-logo">
          <div className="auth-logo-icon"><Zap size={22} /></div>
          <span>GAME<b>ZONE</b></span>
        </div>

        {verifyScreen ? (
          <VerifyEmailScreen
            email={verifyEmail}
            onBack={() => switchTab('login')}
          />
        ) : (
          <>
            {/* Tab switcher */}
            <div className="auth-tabs" role="tablist">
              <button role="tab" aria-selected={isLogin}
                className={`auth-tab${isLogin ? ' auth-tab-active' : ''}`}
                onClick={() => switchTab('login')}>Sign In</button>
              <button role="tab" aria-selected={!isLogin}
                className={`auth-tab${!isLogin ? ' auth-tab-active' : ''}`}
                onClick={() => switchTab('register')}>Register</button>
              <div ref={sliderRef} className="auth-tab-slider"
                style={{ transform: isLogin ? 'translateX(0)' : 'translateX(100%)' }} />
            </div>

            <div className="auth-heading">
              <h1>{isLogin ? 'Welcome back' : 'Create account'}</h1>
              <p>{isLogin ? 'Sign in to access your GameZone' : 'Join GameZone and start playing'}</p>
            </div>

            {/* Google */}
            <button className="auth-google" onClick={handleGoogle} disabled={busy} type="button">
              {busy
                ? <Loader2 size={16} style={{ animation: 'auth-spin .7s linear infinite' }} />
                : <GoogleIcon />
              }
              <span>{isLogin ? 'Continue with Google' : 'Sign up with Google'}</span>
              <div className="auth-google-shine" />
            </button>

            <div className="auth-divider">
              <span /><p>or continue with email</p><span />
            </div>

            <form onSubmit={handleEmail} className="auth-form" noValidate>
              <div className="auth-field">
                <label htmlFor="auth-email">Email</label>
                <div className="auth-input-wrap">
                  <Mail size={15} className="auth-input-icon" />
                  <input id="auth-email" type="email" placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)}
                    required autoComplete="email" />
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="auth-pw">
                  Password
                  {isLogin && <button type="button" className="auth-forgot">Forgot?</button>}
                </label>
                <div className="auth-input-wrap">
                  <Lock size={15} className="auth-input-icon" />
                  <input id="auth-pw" type={showPw ? 'text' : 'password'}
                    placeholder={isLogin ? '••••••••' : 'Min. 6 characters'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    required autoComplete={isLogin ? 'current-password' : 'new-password'} />
                  <button type="button" className="auth-pw-toggle"
                    onClick={() => setShowPw(v => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="auth-alert auth-alert-err" role="alert">
                  <AlertCircle size={14} /><span>{error}</span>
                </div>
              )}

              {isLogin && (
                <div className="auth-alert" role="note" style={{
                  background: 'rgba(124,58,237,0.07)',
                  border: '1px solid rgba(124,58,237,0.18)',
                  color: 'rgba(255,255,255,0.4)',
                  borderRadius: 8, padding: '8px 11px',
                  fontSize: '0.72rem', display: 'flex', gap: 7, alignItems: 'flex-start',
                }}>
                  <CheckCircle2 size={13} color="#a78bfa" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>Your email must be verified before you can sign in.</span>
                </div>
              )}

              <button type="submit" disabled={busy} className="auth-submit">
                {busy
                  ? <Loader2 size={16} className="auth-spin" />
                  : isLogin ? 'Sign In' : 'Create Account'
                }
                <div className="auth-submit-shine" />
              </button>
            </form>

            <p className="auth-switch">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button type="button" onClick={() => switchTab(isLogin ? 'register' : 'login')}>
                {isLogin ? 'Register' : 'Sign in'}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
