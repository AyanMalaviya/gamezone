import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, Phone, Mail, Lock, Save, Loader2, CheckCircle2,
  AlertCircle, Eye, EyeOff, ArrowLeft, ShieldCheck, Pencil,
  CalendarClock, Gamepad2, Receipt, Inbox,
} from 'lucide-react';
import {
  updatePassword, reauthenticateWithCredential,
  EmailAuthProvider, updateProfile,
} from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import useAuthStore from '../store/authStore';
import { getUserProfile } from '../hooks/useUserProfile';
import useBookings from '../hooks/useBookings';
import Navbar from '../components/Navbar';

const normalizePhone = (raw) => {
  const c = raw.replace(/[\s\-().]/g, '');
  return c.startsWith('+91') ? c : `+91${c}`;
};
const PH_RE = /^\+91[6-9]\d{9}$/;

function Field({ label, icon: Icon, children, hint }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{
        display: 'block', marginBottom: 7,
        fontSize: '0.72rem', fontWeight: 700,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,.45)',
      }}>{label}</label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {Icon && <Icon size={15} style={{ position: 'absolute', left: 13, color: 'rgba(255,255,255,.3)', pointerEvents: 'none', zIndex: 1 }} />}
        {children}
      </div>
      {hint && <p style={{ marginTop: 5, fontSize: '0.7rem', color: 'rgba(255,255,255,.28)', paddingLeft: 2 }}>{hint}</p>}
    </div>
  );
}

const inputStyle = (hasIcon, err) => ({
  width: '100%',
  background: 'rgba(255,255,255,.05)',
  border: `1px solid ${err ? 'rgba(239,68,68,.5)' : 'rgba(255,255,255,.1)'}`,
  borderRadius: 10,
  padding: `.65rem .85rem .65rem ${hasIcon ? '2.4rem' : '.85rem'}`,
  fontSize: '.88rem', color: '#fff', outline: 'none',
  fontFamily: 'inherit', transition: 'border-color .2s, box-shadow .2s',
});

function StatusBadge({ status }) {
  if (!status) return null;
  const ok = status?.type === 'ok';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '9px 13px', borderRadius: 9, marginTop: 10,
      background: ok ? 'rgba(34,197,94,.09)' : 'rgba(239,68,68,.09)',
      border: `1px solid ${ok ? 'rgba(34,197,94,.25)' : 'rgba(239,68,68,.25)'}`,
      fontSize: '.8rem',
      color: ok ? '#86efac' : '#fca5a5',
      animation: 'prof-fadein .25s ease both',
    }}>
      {ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
      <span>{status.msg}</span>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, id }) {
  return (
    <div id={id} style={{
      background: 'rgba(255,255,255,.025)',
      border: '1px solid rgba(255,255,255,.07)',
      borderRadius: 16, padding: '24px 22px', marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: 'rgba(124,58,237,.15)',
          border: '1px solid rgba(124,58,237,.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Icon size={16} color="#c084fc" /></div>
        <h2 style={{
          fontFamily: "'Rajdhani','Inter',sans-serif",
          fontWeight: 700, fontSize: '1rem', color: '#fff', margin: 0,
        }}>{title}</h2>
      </div>
      <div style={{ height: 1, background: 'rgba(255,255,255,.06)', marginBottom: 20 }} />
      {children}
    </div>
  );
}

/* ─── Bookings Section ─── */
function BookingsSection({ uid }) {
  const { bookings, loading, error } = useBookings(uid);

  const fmtDate = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  };

  return (
    <SectionCard title="My Bookings" icon={CalendarClock} id="my-bookings">
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            border: '2px solid rgba(124,58,237,.2)', borderTopColor: '#7c3aed',
            animation: 'prof-spin .7s linear infinite',
          }} />
        </div>
      )}

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 14px', borderRadius: 10,
          background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)',
          fontSize: '0.8rem', color: '#fca5a5',
        }}>
          <AlertCircle size={14} />
          <span>Could not load bookings. Make sure the Firestore index is created.</span>
        </div>
      )}

      {!loading && !error && bookings.length === 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '28px 16px', gap: 10, textAlign: 'center',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Inbox size={22} color="rgba(196,181,253,.4)" /></div>
          <p style={{ color: 'rgba(255,255,255,.3)', fontSize: '0.85rem', margin: 0 }}>No bookings yet</p>
          <p style={{ color: 'rgba(255,255,255,.18)', fontSize: '0.75rem', margin: 0 }}>Book a station to see your history here.</p>
        </div>
      )}

      {!loading && !error && bookings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bookings.map((b) => (
            <div key={b.id} style={{
              background: 'rgba(255,255,255,.03)',
              border: '1px solid rgba(255,255,255,.07)',
              borderRadius: 12, padding: '14px 16px',
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: '6px 12px',
              alignItems: 'start',
              animation: 'prof-fadein .2s ease both',
            }}>
              {/* Left: details */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: 'rgba(124,58,237,.15)',
                    border: '1px solid rgba(124,58,237,.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}><Gamepad2 size={13} color="#c084fc" /></div>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#e2d9f3' }}>
                    {b.stationName || `Station ${b.stationId}`}
                  </span>
                </div>

                {b.slot && (
                  <p style={{ margin: '0 0 3px', fontSize: '0.75rem', color: 'rgba(255,255,255,.4)' }}>
                    🕐 {b.slot}
                  </p>
                )}
                {b.game && (
                  <p style={{ margin: '0 0 3px', fontSize: '0.75rem', color: 'rgba(255,255,255,.4)' }}>
                    🎮 {b.game}
                  </p>
                )}
                <p style={{ margin: '0 0 3px', fontSize: '0.72rem', color: 'rgba(255,255,255,.25)', fontFamily: 'monospace' }}>
                  TXN: {b.txnId}
                </p>
                <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,.2)' }}>
                  {fmtDate(b.bookedAt)}
                </p>
              </div>

              {/* Right: amount + status */}
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontFamily: "'Rajdhani','Inter',sans-serif",
                  fontWeight: 800, fontSize: '1.1rem', color: '#a78bfa', lineHeight: 1.2,
                }}>₹{(b.amount || 0).toLocaleString('en-IN')}</div>
                <span style={{
                  display: 'inline-block', marginTop: 5,
                  fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em',
                  padding: '2px 8px', borderRadius: 5,
                  background: 'rgba(34,197,94,.12)', color: '#86efac',
                  border: '1px solid rgba(34,197,94,.25)',
                }}>✓ {(b.status || 'confirmed').toUpperCase()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

/* ─── Profile Section ─── */
function ProfileSection({ user, profile, onRefresh }) {
  const setPhone = useAuthStore(s => s.setPhone);
  const [name, setName]     = useState(profile?.name  || user?.displayName || '');
  const [phone, setPhone2]  = useState(profile?.phone || '');
  const [busy, setBusy]     = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    setName(profile?.name  || user?.displayName || '');
    setPhone2(profile?.phone || '');
  }, [profile, user]);

  const handleSave = async (e) => {
    e.preventDefault(); setStatus(null);
    if (phone.trim()) {
      const n = normalizePhone(phone.trim());
      if (!PH_RE.test(n)) { setStatus({ type: 'err', msg: 'Enter a valid 10-digit Indian mobile number.' }); return; }
    }
    setBusy(true);
    try {
      const ref = doc(db, 'users', user.uid);
      const normalized = phone.trim() ? normalizePhone(phone.trim()) : '';
      await updateDoc(ref, { name: name.trim(), phone: normalized, hasPhone: !!normalized });
      if (name.trim() !== user.displayName) await updateProfile(auth.currentUser, { displayName: name.trim() });
      setPhone(normalized || null);
      setStatus({ type: 'ok', msg: 'Profile updated successfully.' });
      onRefresh?.();
    } catch { setStatus({ type: 'err', msg: 'Failed to save. Please try again.' }); }
    finally { setBusy(false); }
  };

  return (
    <SectionCard title="Personal Info" icon={User} id="personal-info">
      <form onSubmit={handleSave} noValidate>
        <Field label="Display Name" icon={User}>
          <input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)}
            style={inputStyle(true, false)}
            onFocus={e => { e.target.style.borderColor = 'rgba(168,85,247,.55)'; e.target.style.boxShadow = '0 0 0 3px rgba(168,85,247,.12)'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,.1)'; e.target.style.boxShadow = 'none'; }} />
        </Field>
        <Field label="Email" icon={Mail} hint="Email cannot be changed here.">
          <input type="email" value={profile?.email || user?.email || ''} disabled
            style={{ ...inputStyle(true, false), opacity: .45, cursor: 'not-allowed' }} />
        </Field>
        <Field
          label={<span>Phone Number {!profile?.phone && <span style={{ marginLeft: 6, fontSize: '0.65rem', background: 'rgba(239,68,68,.15)', color: '#fca5a5', borderRadius: 4, padding: '1px 6px' }}>Not added</span>}</span>}
          icon={Phone} hint="Indian mobile (+91). Required to book a station.">
          <input type="tel" placeholder="+91 98765 43210" value={phone} onChange={e => setPhone2(e.target.value)}
            style={inputStyle(true, false)}
            onFocus={e => { e.target.style.borderColor = 'rgba(168,85,247,.55)'; e.target.style.boxShadow = '0 0 0 3px rgba(168,85,247,.12)'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,.1)'; e.target.style.boxShadow = 'none'; }} />
        </Field>
        <StatusBadge status={status} />
        <button type="submit" disabled={busy} style={{
          marginTop: 16, width: '100%', padding: '.72rem', borderRadius: 10,
          background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
          border: 'none', color: '#fff', fontSize: '.88rem', fontWeight: 700,
          cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? .65 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'opacity .2s', boxShadow: '0 4px 20px rgba(124,58,237,.35)',
        }}>
          {busy ? <Loader2 size={16} style={{ animation: 'prof-spin .7s linear infinite' }} /> : <><Save size={15} /><span>Save Changes</span></>}
        </button>
      </form>
    </SectionCard>
  );
}

/* ─── Password Section ─── */
function PasswordSection({ user }) {
  const isGoogle = user?.providerData?.some(p => p.providerId === 'google.com');
  const [current, setCurrent] = useState('');
  const [next, setNext]       = useState('');
  const [confirm, setConfirm] = useState('');
  const [showC, setShowC]     = useState(false);
  const [showN, setShowN]     = useState(false);
  const [busy, setBusy]       = useState(false);
  const [status, setStatus]   = useState(null);

  if (isGoogle) return (
    <SectionCard title="Password" icon={Lock}>
      <div style={{
        display: 'flex', gap: 10, alignItems: 'center',
        padding: '12px 14px', borderRadius: 10,
        background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
        fontSize: '0.82rem', color: 'rgba(255,255,255,.38)',
      }}>
        <ShieldCheck size={16} color="#a78bfa" />
        <span>You signed in with Google. Password change is managed by Google.</span>
      </div>
    </SectionCard>
  );

  const handleChange = async (e) => {
    e.preventDefault(); setStatus(null);
    if (next.length < 6) { setStatus({ type: 'err', msg: 'New password must be at least 6 characters.' }); return; }
    if (next !== confirm) { setStatus({ type: 'err', msg: 'Passwords do not match.' }); return; }
    setBusy(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, current);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, next);
      setStatus({ type: 'ok', msg: 'Password updated successfully.' });
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err) {
      const msg = err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential'
        ? 'Current password is incorrect.' : 'Failed to update password. Try again.';
      setStatus({ type: 'err', msg });
    } finally { setBusy(false); }
  };

  return (
    <SectionCard title="Change Password" icon={Lock}>
      <form onSubmit={handleChange} noValidate>
        <Field label="Current Password" icon={Lock}>
          <input type={showC ? 'text' : 'password'} placeholder="Enter current password"
            value={current} onChange={e => setCurrent(e.target.value)}
            style={{ ...inputStyle(true, false), paddingRight: '2.5rem' }}
            onFocus={e => { e.target.style.borderColor = 'rgba(168,85,247,.55)'; e.target.style.boxShadow = '0 0 0 3px rgba(168,85,247,.12)'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,.1)'; e.target.style.boxShadow = 'none'; }} />
          <button type="button" onClick={() => setShowC(v => !v)} style={{
            position: 'absolute', right: 11, background: 'none', border: 'none',
            color: 'rgba(255,255,255,.35)', cursor: 'pointer', padding: 4,
          }}>{showC ? <EyeOff size={15} /> : <Eye size={15} />}</button>
        </Field>
        <Field label="New Password" icon={Lock}>
          <input type={showN ? 'text' : 'password'} placeholder="Min. 6 characters"
            value={next} onChange={e => setNext(e.target.value)}
            style={{ ...inputStyle(true, false), paddingRight: '2.5rem' }}
            onFocus={e => { e.target.style.borderColor = 'rgba(168,85,247,.55)'; e.target.style.boxShadow = '0 0 0 3px rgba(168,85,247,.12)'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,.1)'; e.target.style.boxShadow = 'none'; }} />
          <button type="button" onClick={() => setShowN(v => !v)} style={{
            position: 'absolute', right: 11, background: 'none', border: 'none',
            color: 'rgba(255,255,255,.35)', cursor: 'pointer', padding: 4,
          }}>{showN ? <EyeOff size={15} /> : <Eye size={15} />}</button>
        </Field>
        <Field label="Confirm New Password" icon={Lock}>
          <input type="password" placeholder="Repeat new password"
            value={confirm} onChange={e => setConfirm(e.target.value)}
            style={inputStyle(true, false)}
            onFocus={e => { e.target.style.borderColor = 'rgba(168,85,247,.55)'; e.target.style.boxShadow = '0 0 0 3px rgba(168,85,247,.12)'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,.1)'; e.target.style.boxShadow = 'none'; }} />
        </Field>
        <StatusBadge status={status} />
        <button type="submit" disabled={busy} style={{
          marginTop: 16, width: '100%', padding: '.72rem', borderRadius: 10,
          background: 'rgba(124,58,237,.15)', border: '1px solid rgba(124,58,237,.3)',
          color: '#c4b5fd', fontSize: '.88rem', fontWeight: 700,
          cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? .65 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all .2s',
        }}
          onMouseEnter={e => { if (!busy) { e.currentTarget.style.background = 'rgba(124,58,237,.25)'; e.currentTarget.style.color = '#fff'; } }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,.15)'; e.currentTarget.style.color = '#c4b5fd'; }}
        >
          {busy ? <Loader2 size={16} style={{ animation: 'prof-spin .7s linear infinite' }} /> : <><Lock size={15} /><span>Update Password</span></>}
        </button>
      </form>
    </SectionCard>
  );
}

/* ─── Main Page ─── */
export default function ProfilePage() {
  const user     = useAuthStore(s => s.user);
  const loading  = useAuthStore(s => s.loading);
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [profLoading, setPL]  = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate('/auth/login', { replace: true });
  }, [user, loading, navigate]);

  const loadProfile = async () => {
    if (!user) return;
    setPL(true);
    try { const p = await getUserProfile(user.uid); setProfile(p); }
    finally { setPL(false); }
  };

  useEffect(() => { loadProfile(); }, [user]); // eslint-disable-line

  if (loading || profLoading) return (
    <div style={{ minHeight: '100dvh', background: '#0d0d0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(124,58,237,.2)', borderTopColor: '#7c3aed', animation: 'prof-spin .7s linear infinite' }} />
      <style>{`@keyframes prof-spin{to{transform:rotate(360deg)}} @keyframes prof-fadein{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );

  const avatar   = user?.photoURL;
  const initials = (profile?.name || user?.displayName || user?.email || '?')[0].toUpperCase();
  const hasPhone = !!(profile?.phone);

  return (
    <div style={{ minHeight: '100dvh', background: '#0d0d0f', color: '#fff' }}>
      <style>{`
        @keyframes prof-spin   { to { transform: rotate(360deg) } }
        @keyframes prof-fadein { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:none} }
      `}</style>

      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 55% 30% at 50% 0%, rgba(124,58,237,0.06) 0%, transparent 70%)',
      }} />

      <Navbar />

      {!hasPhone && (
        <div style={{ maxWidth: 680, margin: '0 auto', padding: 'calc(72px + 16px) clamp(16px,3vw,24px) 0' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '13px 16px', borderRadius: 12,
            background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)',
            animation: 'prof-fadein .3s ease both',
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8, flexShrink: 0,
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Phone size={16} color="#fca5a5" /></div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: '#fca5a5' }}>Phone number missing</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Required to book a station. Add it below in Personal Info.</p>
            </div>
            <a href="#personal-info" style={{
              flexShrink: 0, padding: '6px 14px', borderRadius: 8,
              fontSize: '0.78rem', fontWeight: 700,
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#fca5a5', textDecoration: 'none', transition: 'background .15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
            >Add Now</a>
          </div>
        </div>
      )}

      <main style={{
        position: 'relative', zIndex: 1,
        maxWidth: 680, margin: '0 auto',
        padding: hasPhone
          ? 'calc(72px + 32px) clamp(16px,3vw,24px) 64px'
          : '20px clamp(16px,3vw,24px) 64px',
      }}>
        <Link to="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          color: 'rgba(255,255,255,.35)', fontSize: '0.78rem',
          textDecoration: 'none', marginBottom: 24, transition: 'color .15s',
        }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,.7)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.35)'}
        ><ArrowLeft size={14} /> Back to home</Link>

        {/* Avatar card */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28,
          background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)',
          borderRadius: 16, padding: '20px 22px',
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
            border: '2px solid rgba(168,85,247,.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.4rem', fontWeight: 800, color: '#fff',
            overflow: 'hidden', boxShadow: '0 0 20px rgba(124,58,237,.3)',
          }}>
            {avatar ? <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              fontFamily: "'Rajdhani','Inter',sans-serif",
              fontWeight: 800, fontSize: 'clamp(1.1rem,3vw,1.35rem)',
              color: '#fff', margin: 0, marginBottom: 3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{profile?.name || user?.displayName || 'Player'}</h1>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,.35)', margin: 0, marginBottom: 6 }}>{user?.email}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em',
                background: hasPhone ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)',
                color: hasPhone ? '#86efac' : '#fca5a5',
                border: `1px solid ${hasPhone ? 'rgba(34,197,94,.25)' : 'rgba(239,68,68,.25)'}`,
                borderRadius: 5, padding: '2px 8px',
              }}>{hasPhone ? `📱 ${profile.phone}` : '⚠️ No phone — required for booking'}</span>
              <span style={{
                fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em',
                background: 'rgba(124,58,237,.12)', color: '#c4b5fd',
                border: '1px solid rgba(124,58,237,.22)',
                borderRadius: 5, padding: '2px 8px',
              }}>{profile?.role === 'admin' ? '🛡 Admin' : '🎮 Member'}</span>
            </div>
          </div>
          <Pencil size={16} color="rgba(255,255,255,.2)" />
        </div>

        <BookingsSection uid={user?.uid} />
        <ProfileSection  user={user} profile={profile} onRefresh={loadProfile} />
        <PasswordSection user={user} />
      </main>
    </div>
  );
}
