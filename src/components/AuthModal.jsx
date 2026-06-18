import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { loginWithEmail, registerWithEmail, loginWithGoogle } from '../hooks/useAuth';
import GameCaptcha from './GameCaptcha';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function AuthModal({ open, onClose, defaultTab = 'login' }) {
  const [tab, setTab]               = useState(defaultTab);
  const [email, setEmail]           = useState('');
  const [pass, setPass]             = useState('');
  const [error, setError]           = useState('');
  const [busy, setBusy]             = useState(false);
  const [captchaOk, setCaptchaOk]   = useState(false);

  const reset = () => { setEmail(''); setPass(''); setError(''); setBusy(false); setCaptchaOk(false); };

  const handleClose = () => { reset(); onClose(); };

  const switchTab = (t) => { setTab(t); setError(''); setCaptchaOk(false); };

  const friendlyError = (code) => ({
    'auth/user-not-found':       'No account with that email.',
    'auth/wrong-password':       'Incorrect password.',
    'auth/email-already-in-use': 'Email already registered. Try logging in.',
    'auth/weak-password':        'Password must be at least 6 characters.',
    'auth/invalid-email':        'Please enter a valid email.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
  }[code] ?? 'Something went wrong. Try again.');

  const handleEmail = async (e) => {
    e.preventDefault();
    if (!captchaOk) { setError('Please complete the CAPTCHA first.'); return; }
    setError(''); setBusy(true);
    try {
      if (tab === 'login') await loginWithEmail(email, pass);
      else                 await registerWithEmail(email, pass);
      handleClose();
    } catch (err) {
      setError(friendlyError(err.code));
    } finally { setBusy(false); }
  };

  const handleGoogle = async () => {
    if (!captchaOk) { setError('Please complete the CAPTCHA first.'); return; }
    setError(''); setBusy(true);
    try {
      await loginWithGoogle();
      handleClose();
    } catch (err) {
      setError(friendlyError(err.code));
    } finally { setBusy(false); }
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, color: '#e8e8f0',
    fontSize: '0.9rem', outline: 'none',
    transition: 'border-color 150ms ease',
  };

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay style={{
          position:'fixed', inset:0,
          background:'rgba(0,0,0,0.75)',
          backdropFilter:'blur(8px)',
          zIndex:60,
        }} />
        <Dialog.Content
          aria-describedby={undefined}
          style={{
            position:'fixed', top:'50%', left:'50%',
            transform:'translate(-50%,-50%)',
            background:'#131318',
            border:'1px solid rgba(124,58,237,0.25)',
            borderRadius:18,
            width:'min(460px, calc(100vw - 2rem))',
            zIndex:61,
            boxShadow:'0 0 60px rgba(124,58,237,0.15), 0 24px 64px rgba(0,0,0,0.7)',
            animation:'fadeInUp 0.2s ease',
            overflow:'hidden',
            maxHeight: '90dvh',
            overflowY: 'auto',
          }}
        >
          {/* Purple top bar */}
          <div style={{ height:3, background:'linear-gradient(90deg,#7c3aed,#a855f7,#7c3aed)', backgroundSize:'200% 100%' }} />

          <div style={{ padding:'28px 28px 32px' }}>
            {/* Title row */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
              <Dialog.Title style={{
                fontFamily:"'Rajdhani','Inter',sans-serif",
                fontWeight:800, fontSize:'1.35rem', color:'#fff',
              }}>
                {tab === 'login' ? 'Welcome back' : 'Create account'}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button style={{
                  width:30, height:30, borderRadius:8,
                  background:'rgba(255,255,255,0.05)',
                  border:'1px solid rgba(255,255,255,0.08)',
                  color:'rgba(255,255,255,0.45)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  cursor:'pointer',
                }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.1)';e.currentTarget.style.color='#fff';}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.05)';e.currentTarget.style.color='rgba(255,255,255,0.45)';}}>
                  <X size={15}/>
                </button>
              </Dialog.Close>
            </div>

            {/* Tab switcher */}
            <div style={{
              display:'grid', gridTemplateColumns:'1fr 1fr',
              background:'rgba(255,255,255,0.04)',
              border:'1px solid rgba(255,255,255,0.07)',
              borderRadius:10, padding:3, marginBottom:24, gap:3,
            }}>
              {['login','register'].map(t => (
                <button key={t} onClick={() => switchTab(t)} style={{
                  padding:'8px 0', borderRadius:8, fontSize:'0.82rem',
                  fontWeight:600, cursor:'pointer', transition:'all 150ms ease',
                  background: tab===t ? 'rgba(124,58,237,0.3)' : 'transparent',
                  border: tab===t ? '1px solid rgba(124,58,237,0.4)' : '1px solid transparent',
                  color: tab===t ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
                  textTransform:'capitalize',
                }}>{t}</button>
              ))}
            </div>

            {/* Google button */}
            <button onClick={handleGoogle} disabled={busy} style={{
              width:'100%', padding:'10px 16px',
              display:'flex', alignItems:'center', justifyContent:'center', gap:10,
              background:'rgba(255,255,255,0.05)',
              border:'1px solid rgba(255,255,255,0.1)',
              borderRadius:10, color:'#e8e8f0',
              fontSize:'0.88rem', fontWeight:600, cursor:'pointer',
              marginBottom:16, transition:'background 150ms ease',
            }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.09)'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'}>
              <GoogleIcon /> Continue with Google
            </button>

            {/* Divider */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.07)' }} />
              <span style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.3)', letterSpacing:'0.05em' }}>or</span>
              <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.07)' }} />
            </div>

            {/* Form */}
            <form onSubmit={handleEmail} style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ position:'relative' }}>
                <Mail size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.3)', pointerEvents:'none' }} />
                <input
                  type="email" placeholder="Email" required
                  value={email} onChange={e=>setEmail(e.target.value)}
                  style={{ ...inputStyle, paddingLeft:36 }}
                  onFocus={e=>e.target.style.borderColor='rgba(124,58,237,0.6)'}
                  onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}
                />
              </div>
              <div style={{ position:'relative' }}>
                <Lock size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.3)', pointerEvents:'none' }} />
                <input
                  type="password" placeholder="Password" required
                  value={pass} onChange={e=>setPass(e.target.value)}
                  style={{ ...inputStyle, paddingLeft:36 }}
                  onFocus={e=>e.target.style.borderColor='rgba(124,58,237,0.6)'}
                  onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}
                />
              </div>

              {/* CAPTCHA */}
              {!captchaOk ? (
                <div style={{
                  marginTop: 4,
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: '1px solid rgba(124,58,237,0.2)',
                  background: 'rgba(124,58,237,0.04)',
                }}>
                  <GameCaptcha onVerified={() => setCaptchaOk(true)} />
                </div>
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 14px', borderRadius: 10,
                  background: 'rgba(34,197,94,0.08)',
                  border: '1px solid rgba(34,197,94,0.25)',
                  fontSize: '0.82rem', color: '#86efac',
                }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8l3.5 3.5L13 5" stroke="#86efac" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  CAPTCHA verified
                </div>
              )}

              {error && (
                <div style={{
                  display:'flex', alignItems:'center', gap:8,
                  padding:'9px 12px', borderRadius:8,
                  background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)',
                  fontSize:'0.8rem', color:'#fca5a5',
                }}>
                  <AlertCircle size={14}/> {error}
                </div>
              )}

              <button type="submit" disabled={busy || !captchaOk} style={{
                marginTop:4, padding:'11px 0',
                background: captchaOk
                  ? 'linear-gradient(135deg,#7c3aed,#9333ea)'
                  : 'rgba(124,58,237,0.25)',
                border:'none', borderRadius:10,
                color: captchaOk ? '#fff' : 'rgba(255,255,255,0.35)',
                fontWeight:700, fontSize:'0.9rem',
                cursor: captchaOk ? 'pointer' : 'not-allowed',
                transition:'all 150ms ease',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                opacity: busy ? 0.7 : 1,
                boxShadow: captchaOk ? '0 0 20px rgba(124,58,237,0.35)' : 'none',
              }}>
                {busy ? <Loader2 size={16} style={{ animation:'spin 0.8s linear infinite' }}/> : null}
                {tab === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
