import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut, Save, Loader2, ShieldCheck,
  Gamepad2, Zap, Clock, Star,
  RefreshCw, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { signInWithPopup, signOut, GoogleAuthProvider } from 'firebase/auth';
import useAuthStore from '../store/authStore';
import useStationData from '../hooks/useStationData';
import { updateStation } from '../lib/sheets';
import { auth, googleProvider } from '../lib/firebase';
import Navbar from '../components/Navbar';
import '../styles/admin.css';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const NeonBg = () => (
  <div className="adm-bg" aria-hidden="true">
    <div className="adm-orb adm-orb-1" />
    <div className="adm-orb adm-orb-2" />
    <div className="adm-orb adm-orb-3" />
    <div className="adm-scanlines" />
    <div className="adm-dotgrid" />
  </div>
);

const StatCard = ({ label, value, Icon, glow }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    const target = Number(value) || 0;
    if (target === 0) { setN(0); return; }
    let cur = 0;
    const step = Math.max(1, Math.ceil(target / 22));
    const id = setInterval(() => {
      cur += step;
      if (cur >= target) { setN(target); clearInterval(id); }
      else setN(cur);
    }, 38);
    return () => clearInterval(id);
  }, [value]);

  return (
    <div className="sc" style={{ '--g': glow }}>
      <div className="sc-inner">
        <div className="sc-icon"><Icon size={20} /></div>
        <div>
          <p className="sc-label">{label}</p>
          <p className="sc-val">{n}{label === 'Utilisation' ? '%' : ''}</p>
        </div>
      </div>
      <div className="sc-bar" />
    </div>
  );
};

const LoginPage = ({ onLogin, busy }) => (
  <div className="adm-login-wrap">
    <NeonBg />
    <Navbar />
    <div className="login-center">
      <div className="login-card">
        <span className="lc-edge lc-top"    />
        <span className="lc-edge lc-right"  />
        <span className="lc-edge lc-bottom" />
        <span className="lc-edge lc-left"   />
        <div className="login-shield"><ShieldCheck size={34} /></div>
        <h1 className="login-title">ADMIN ACCESS</h1>
        <p className="login-sub">Restricted zone — authenticate to proceed</p>
        <div className="login-divider"><span>GOOGLE AUTH</span></div>
        <button onClick={onLogin} disabled={busy} className="login-btn">
          {busy ? <Loader2 size={18} className="adm-spin" /> : <GoogleIcon />}
          <span>{busy ? 'Authenticating…' : 'Sign in with Google'}</span>
          <div className="login-shine" />
        </button>
        <p className="login-note">Only authorised admins can access this panel</p>
      </div>
    </div>
  </div>
);

const StationRow = ({ station, index, oauthToken }) => {
  const init = () => ({
    status:        station.status        || 'available',
    currentGame:   station.currentGame   || '',
    bookedSlots:   Array.isArray(station.bookedSlots)
                     ? station.bookedSlots.join(', ')
                     : (station.bookedSlots || ''),
    preferredGame: station.preferredGame || '',
  });
  const [form, setForm]     = useState(init);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [err,    setErr]    = useState(false);

  useEffect(() => { setForm(init()); }, [station]); // eslint-disable-line

  const onChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const onSave = async () => {
    setSaving(true); setErr(false);
    try {
      await updateStation(index, {
        id:            station.id,
        status:        form.status,
        currentGame:   form.currentGame,
        bookedSlots:   form.bookedSlots.split(',').map(s => s.trim()).filter(Boolean),
        preferredGame: form.preferredGame,
        stationType:   station.stationType || '',
      }, oauthToken);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error(e);
      setErr(true);
      setTimeout(() => setErr(false), 3000);
    } finally { setSaving(false); }
  };

  const occupied = form.status?.toLowerCase() === 'occupied';

  return (
    <tr className={`sr ${occupied ? 'sr-occ' : 'sr-avail'}`}>
      <td className="td-id">
        <div className="id-badge">
          <span>{String(station.id).padStart(2, '0')}</span>
          <i className={occupied ? 'dot dot-red' : 'dot dot-grn'} />
        </div>
      </td>
      <td className="td-s">
        <select name="status" value={form.status} onChange={onChange}
          className={`sel ${occupied ? 'sel-occ' : 'sel-avail'}`}>
          <option value="available">● Available</option>
          <option value="occupied">● Occupied</option>
        </select>
      </td>
      <td className="td-i"><input type="text" name="currentGame"
        value={form.currentGame} onChange={onChange}
        placeholder="e.g. FIFA 25" className="ni" /></td>
      <td className="td-i td-w"><input type="text" name="bookedSlots"
        value={form.bookedSlots} onChange={onChange}
        placeholder="10:00-11:00, 13:00-14:00" className="ni" /></td>
      <td className="td-i"><input type="text" name="preferredGame"
        value={form.preferredGame} onChange={onChange}
        placeholder="Preferred game" className="ni" /></td>
      <td className="td-sv">
        <button onClick={onSave} disabled={saving}
          className={`sv-btn ${saved ? 'sv-ok' : err ? 'sv-err' : ''}`}>
          {saving ? <Loader2 size={13} className="adm-spin" />
            : saved ? <CheckCircle2 size={13} />
            : err   ? <AlertTriangle size={13} />
            : <Save size={13} />}
          <span>{saving ? 'Saving…' : saved ? 'Saved!' : err ? 'Error' : 'Save'}</span>
        </button>
      </td>
    </tr>
  );
};

export default function AdminDashboard() {
  const user          = useAuthStore(s => s.user);
  const setUser       = useAuthStore(s => s.setUser);
  const oauthToken    = useAuthStore(s => s.oauthToken);
  const setOauthToken = useAuthStore(s => s.setOauthToken);

  const [loginBusy, setLoginBusy] = useState(false);
  const { stations, isLoading, isError, refetch } = useStationData();
  const navigate = useNavigate();
  const zapRef   = useRef(null);

  useEffect(() => {
    if (!zapRef.current) return;
    let h = 0;
    const id = setInterval(() => {
      h = (h + 0.8) % 360;
      if (zapRef.current) zapRef.current.style.filter = `hue-rotate(${h}deg)`;
    }, 20);
    return () => clearInterval(id);
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    useAuthStore.getState().clear();
    navigate('/', { replace: true });
  };

  const handleLogin = async () => {
    setLoginBusy(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      const cred = GoogleAuthProvider.credentialFromResult(result);
      setOauthToken(cred?.accessToken ?? null);
    } catch (e) {
      console.error(e);
      alert('Sign-in failed. Try again.');
    } finally { setLoginBusy(false); }
  };

  if (!user) return <LoginPage onLogin={handleLogin} busy={loginBusy} />;

  const total     = stations.length;
  const available = stations.filter(s => s.status?.toLowerCase() === 'available').length;
  const occupied  = stations.filter(s => s.status?.toLowerCase() === 'occupied').length;
  const util      = total ? Math.round(occupied / total * 100) : 0;

  return (
    <div className="adm-wrap">
      <NeonBg />
      <Navbar />

      <main className="adm-body" style={{ paddingTop: 72 }}>
        <div className="adm-hdr">
          <div className="adm-hdr-l">
            <div className="adm-title-icon" ref={zapRef}><Zap size={22} /></div>
            <div>
              <h1 className="adm-title">STATION CONTROL</h1>
              <p className="adm-sub">Live Google Sheets sync • {user.email}</p>
            </div>
          </div>
          <div className="adm-hdr-r">
            <button onClick={() => refetch()} className="adm-btn adm-btn-refresh">
              <RefreshCw size={14} /><span>Refresh</span>
            </button>
            <button onClick={handleLogout} className="adm-btn adm-btn-logout">
              <LogOut size={14} /><span>Logout</span>
            </button>
          </div>
        </div>

        <div className="adm-divider" aria-hidden="true">
          <div className="adm-div-line" />
          <span className="adm-div-txt">LIVE DATA</span>
          <div className="adm-div-line" />
        </div>

        <div className="sc-grid">
          <StatCard label="Total Stations" value={total}     Icon={Gamepad2}     glow="#a855f7" />
          <StatCard label="Available"      value={available} Icon={CheckCircle2} glow="#22c55e" />
          <StatCard label="Occupied"       value={occupied}  Icon={Clock}        glow="#ef4444" />
          <StatCard label="Utilisation"    value={util}      Icon={Star}         glow="#ec4899" />
        </div>

        {!oauthToken && (
          <div className="adm-warn">
            <Zap size={13} />
            <span>Sign out and sign in again to enable write access to Google Sheets</span>
          </div>
        )}

        {isLoading && (
          <div className="adm-skeletons">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="adm-skel" style={{ animationDelay: `${i * 70}ms` }} />
            ))}
          </div>
        )}

        {isError && (
          <div className="adm-error">
            <AlertTriangle size={32} />
            <p>Failed to load station data</p>
            <span>Check VITE_SHEETS_ID and VITE_SHEETS_API_KEY in your .env</span>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="tbl-wrap">
            <div className="tbl-neon tbl-neon-top" />
            <div className="tbl-scroll">
              <table className="tbl">
                <thead>
                  <tr className="tbl-head">
                    {['#', 'Status', 'Current Game', 'Booked Slots', 'Preferred Game', ''].map(h => (
                      <th key={h} className="tbl-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stations.map((s, i) => (
                    <StationRow key={s.id ?? i} station={s} index={i} oauthToken={oauthToken} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="tbl-neon tbl-neon-bot" />
          </div>
        )}
      </main>
    </div>
  );
}
