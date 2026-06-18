import { useRef, useEffect } from 'react';
import {
  LogOut, Save, Loader2, ShieldCheck, Gamepad2,
  Zap, Clock, Star, RefreshCw, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { useState } from 'react';
import useAuthStore from '../store/authStore';
import useStationData from '../hooks/useStationData';
import { updateStation } from '../lib/sheets';
import { loginWithGoogle, logout } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import '../styles/admin.css';

// ── Google logo ───────────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// ── Animated neon background ─────────────────────────────────────────────
const NeonBackground = () => (
  <div className="admin-bg" aria-hidden="true">
    <div className="admin-orb admin-orb-1" />
    <div className="admin-orb admin-orb-2" />
    <div className="admin-orb admin-orb-3" />
    <div className="admin-scanlines" />
    <div className="admin-grid" />
  </div>
);

// ── Count-up stat card ────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, glow }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const target = Number(value) || 0;
    let n = 0;
    const step = Math.max(1, Math.ceil(target / 20));
    const id = setInterval(() => {
      n = Math.min(n + step, target);
      setDisplay(n);
      if (n >= target) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [value]);

  return (
    <div className="stat-card" style={{ '--glow-color': glow }}>
      <div className="stat-card-inner">
        <div className="stat-icon" style={{ background: `${glow}22`, border: `1px solid ${glow}44` }}>
          <Icon size={20} style={{ color: glow }} />
        </div>
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value" style={{ color: glow }}>{display}{label === 'Utilisation' ? '%' : ''}</p>
        </div>
      </div>
      <div className="stat-bar" style={{ background: `linear-gradient(90deg, ${glow}88, transparent)` }} />
    </div>
  );
};

// ── Login gate ────────────────────────────────────────────────────────────
const LoginGate = () => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleGoogle = async () => {
    setBusy(true); setError('');
    try {
      await loginWithGoogle();
      // useAuthStore is updated inside loginWithGoogle —
      // ProtectedRoute will re-render and show <Outlet /> automatically
    } catch (e) {
      setError(e?.code === 'auth/popup-closed-by-user'
        ? 'Sign-in cancelled.'
        : 'Sign-in failed. Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <div className="admin-login-wrap">
      <NeonBackground />
      <Navbar />
      <div className="login-center">
        <div className="login-card">
          <div className="login-border-top" />
          <div className="login-border-right" />
          <div className="login-border-bottom" />
          <div className="login-border-left" />

          <div className="login-shield"><ShieldCheck size={32} /></div>
          <h1 className="login-title">ADMIN ACCESS</h1>
          <p className="login-sub">Restricted zone — authenticate to proceed</p>

          <div className="login-divider"><span>GOOGLE AUTH</span></div>

          <button onClick={handleGoogle} disabled={busy} className="login-btn">
            {busy ? <Loader2 size={18} className="spin" /> : <GoogleIcon />}
            <span>{busy ? 'Authenticating…' : 'Sign in with Google'}</span>
            <div className="login-btn-shine" />
          </button>

          {error && (
            <div className="login-error">
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          )}
          <p className="login-note">Only authorized admins can access this panel</p>
        </div>
      </div>
    </div>
  );
};

// ── Station table row ───────────────────────────────────────────────────
const StationRow = ({ station, index }) => {
  const oauthToken = useAuthStore(s => s.oauthToken);
  const [form, setForm] = useState({
    status:        station.status        || 'available',
    currentGame:   station.currentGame   || '',
    bookedSlots:   Array.isArray(station.bookedSlots)
      ? station.bookedSlots.join(', ')
      : (station.bookedSlots || ''),
    preferredGame: station.preferredGame || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [err,    setErr]    = useState(false);

  useEffect(() => {
    setForm({
      status:        station.status        || 'available',
      currentGame:   station.currentGame   || '',
      bookedSlots:   Array.isArray(station.bookedSlots)
        ? station.bookedSlots.join(', ')
        : (station.bookedSlots || ''),
      preferredGame: station.preferredGame || '',
    });
  }, [station]);

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
    <tr className={`station-row ${occupied ? 'occupied' : 'available'}`}>
      <td className="td-id">
        <div className="id-badge">
          <span>{String(station.id).padStart(2, '0')}</span>
          <div className={`id-dot ${occupied ? 'dot-red' : 'dot-green'}`} />
        </div>
      </td>
      <td className="td-status">
        <select name="status" value={form.status} onChange={onChange}
          className={`status-select ${occupied ? 'sel-occupied' : 'sel-available'}`}>
          <option value="available">● Available</option>
          <option value="occupied">● Occupied</option>
        </select>
      </td>
      <td className="td-input">
        <input type="text" name="currentGame" value={form.currentGame}
          onChange={onChange} placeholder="e.g. FIFA 25" className="neon-input" />
      </td>
      <td className="td-input td-wide">
        <input type="text" name="bookedSlots" value={form.bookedSlots}
          onChange={onChange} placeholder="10:00-11:00, 13:00-14:00" className="neon-input" />
      </td>
      <td className="td-input">
        <input type="text" name="preferredGame" value={form.preferredGame}
          onChange={onChange} placeholder="Preferred game" className="neon-input" />
      </td>
      <td className="td-save">
        <button onClick={onSave} disabled={saving || !oauthToken}
          className={`save-btn ${saved ? 'save-ok' : err ? 'save-err' : ''}`}
          title={!oauthToken ? 'Re-login to enable writes' : ''}>
          <span className="save-btn-bg" />
          {saving ? <Loader2 size={14} className="spin" />
            : saved ? <CheckCircle2 size={14} />
            : err   ? <AlertTriangle size={14} />
            : <Save size={14} />}
          <span>{saving ? 'Saving…' : saved ? 'Saved!' : err ? 'Error' : 'Save'}</span>
        </button>
      </td>
    </tr>
  );
};

// ── Dashboard (shown after login) ─────────────────────────────────────────
const DashboardView = () => {
  const user       = useAuthStore(s => s.user);
  const oauthToken = useAuthStore(s => s.oauthToken);
  const { stations, isLoading, isError, refetch } = useStationData();
  const tickRef = useRef(null);

  useEffect(() => {
    if (!tickRef.current) return;
    let x = 0;
    const id = setInterval(() => {
      x = (x + 0.5) % 360;
      if (tickRef.current) tickRef.current.style.filter = `hue-rotate(${x}deg)`;
    }, 30);
    return () => clearInterval(id);
  }, []);

  const total     = stations?.length ?? 0;
  const available = stations?.filter(s => s.status?.toLowerCase() === 'available').length ?? 0;
  const occupied  = stations?.filter(s => s.status?.toLowerCase() === 'occupied').length  ?? 0;
  const utilPct   = total ? Math.round(occupied / total * 100) : 0;

  return (
    <div className="admin-wrap">
      <NeonBackground />
      <Navbar />
      <div className="admin-body">

        {/* Header */}
        <div className="admin-header">
          <div className="admin-header-left">
            <div className="admin-title-row">
              <div className="admin-title-icon" ref={tickRef}>
                <Zap size={22} />
              </div>
              <div>
                <h1 className="admin-title">STATION CONTROL</h1>
                <p className="admin-sub">Live Google Sheets sync • {user?.email}</p>
              </div>
            </div>
          </div>
          <div className="admin-header-right">
            {!oauthToken && (
              <span className="oauth-badge">No write token — re-login to save</span>
            )}
            <button onClick={() => refetch()} className="refresh-btn" title="Refresh data">
              <RefreshCw size={15} /><span>Refresh</span>
            </button>
            <button onClick={logout} className="logout-btn">
              <LogOut size={15} /><span>Logout</span>
            </button>
          </div>
        </div>

        {/* Slash divider */}
        <div className="slash-divider" aria-hidden="true">
          <div className="slash-line" />
          <span className="slash-text">LIVE DATA</span>
          <div className="slash-line" />
        </div>

        {/* Stats */}
        <div className="stat-grid">
          <StatCard label="Total Stations" value={total}     icon={Gamepad2}     glow="#a855f7" />
          <StatCard label="Available Now"  value={available} icon={CheckCircle2} glow="#22c55e" />
          <StatCard label="Occupied"       value={occupied}  icon={Clock}        glow="#ef4444" />
          <StatCard label="Utilisation"    value={utilPct}   icon={Star}         glow="#ec4899" />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="loading-wrap">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton-row" style={{ animationDelay: `${i * 70}ms` }} />
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="error-box">
            <AlertTriangle size={30} />
            <p>Failed to load station data</p>
            <span>Check VITE_SHEETS_ID and VITE_SHEETS_API_KEY in your .env</span>
          </div>
        )}

        {/* Table */}
        {!isLoading && !isError && (
          <div className="table-wrap">
            <div className="table-neon-border" />
            <div className="table-scroll">
              <table className="station-table">
                <thead>
                  <tr className="table-head-row">
                    {['#', 'Status', 'Current Game', 'Booked Slots', 'Preferred Game', ''].map(h => (
                      <th key={h} className="th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stations.map((s, i) => (
                    <StationRow key={s.id ?? i} station={s} index={i} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-neon-border table-neon-border-bottom" />
          </div>
        )}
      </div>
    </div>
  );
};

// ── Root export ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const user = useAuthStore(s => s.user);
  // ProtectedRoute handles the loading state, so by the time
  // AdminDashboard renders, we know loading is false.
  return user ? <DashboardView /> : <LoginGate />;
}
