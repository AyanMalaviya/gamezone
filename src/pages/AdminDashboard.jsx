import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut, Save, Loader2, ShieldCheck, Gamepad2, Zap, Clock, Star,
  RefreshCw, CheckCircle2, AlertTriangle, Users, Settings, Plus,
  Trash2, ChevronDown, ChevronUp, Shield, ShieldOff, Edit3, X,
} from 'lucide-react';
import { signInWithPopup, signOut, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import useStationData from '../hooks/useStationData';
import { updateStation } from '../lib/sheets';
import { auth, googleProvider } from '../lib/firebase';
import {
  listAllUsers, updateUserProfile, setUserRole,
  getCustomSchema, saveCustomSchema,
} from '../hooks/useUsers';
import Navbar from '../components/Navbar';
import '../styles/admin.css';

// ─── Google icon ──────────────────────────────────────────────────────────────
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

const extractOAuthToken = (result) => {
  const cred = GoogleAuthProvider.credentialFromResult(result);
  if (cred?.accessToken) return cred.accessToken;
  // eslint-disable-next-line no-underscore-dangle
  return result?._tokenResponse?.oauthAccessToken ?? null;
};

// ─── Session persistence keys ─────────────────────────────────────────────────
const SESSION_TOKEN_KEY = 'gz_admin_oauth';
const SESSION_USER_KEY  = 'gz_admin_user';

// ─── LoginPage ────────────────────────────────────────────────────────────────
const LoginPage = ({ onLogin, busy, error }) => (
  <div className="adm-login-wrap">
    <NeonBg />
    <Navbar />
    <div className="login-center">
      <div className="login-card">
        <span className="lc-edge lc-top" />
        <span className="lc-edge lc-right" />
        <span className="lc-edge lc-bottom" />
        <span className="lc-edge lc-left" />
        <div className="login-shield"><ShieldCheck size={34} /></div>
        <h1 className="login-title">ADMIN ACCESS</h1>
        <p className="login-sub">Restricted zone — authenticate to proceed</p>
        {error && (
          <div className="adm-warn" style={{ marginBottom: '1rem' }}>
            <AlertTriangle size={13} /><span>{error}</span>
          </div>
        )}
        <div className="login-divider"><span>GOOGLE AUTH</span></div>
        <button onClick={onLogin} disabled={busy} className="login-btn">
          {busy ? <Loader2 size={18} className="adm-spin" /> : <GoogleIcon />}
          <span>{busy ? 'Authenticating\u2026' : 'Sign in with Google'}</span>
          <div className="login-shine" />
        </button>
        <p className="login-note">Only authorised admins can access this panel</p>
      </div>
    </div>
  </div>
);

// ─── StationRow ───────────────────────────────────────────────────────────────
const StationRow = ({ station, rowIndex, oauthToken }) => {
  const serSlot = (slot) => {
    if (!slot) return '';
    if (typeof slot === 'string') return slot;
    if (slot.start24 && slot.end24) return `${slot.start24}-${slot.end24}`;
    return '';
  };
  const init = () => ({
    status:        station.status        || 'available',
    activeSlot:    serSlot(station.activeSlot),
    bookedSlots:   Array.isArray(station.bookedSlots)
                     ? station.bookedSlots.join(', ')
                     : (station.bookedSlots || ''),
    currentGame:   station.currentGame   || '',
    preferredGame: station.preferredGame || '',
  });
  const [form, setForm]     = useState(init);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [err,    setErr]    = useState(null);
  useEffect(() => { setForm(init()); }, [station]); // eslint-disable-line
  const onChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const onSave = async () => {
    setSaving(true); setErr(null);
    try {
      await updateStation(rowIndex, {
        id:            station.id          ?? '',
        stationName:   station.stationName ?? '',
        stationType:   station.stationType ?? 'ps5',
        status:        form.status,
        activeSlot:    form.activeSlot     || null,
        bookedSlots:   form.bookedSlots.split(',').map(s => s.trim()).filter(Boolean),
        currentGame:   form.currentGame,
        preferredGame: form.preferredGame,
      }, oauthToken);
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setErr(e.message || 'Save failed'); setTimeout(() => setErr(null), 6000);
    } finally { setSaving(false); }
  };
  const occupied  = form.status?.toLowerCase() === 'occupied';
  const typeLabel = station.stationType === 'racing' ? '\uD83C\uDFCE\uFE0F' : '\uD83C\uDFAE';
  return (
    <tr className={`sr ${occupied ? 'sr-occ' : 'sr-avail'}`}>
      <td className="td-id">
        <div className="id-badge">
          <span>{typeLabel} {String(station.id || rowIndex + 1).padStart(2, '0')}</span>
          <i className={occupied ? 'dot dot-red' : 'dot dot-grn'} />
        </div>
      </td>
      <td className="td-i" style={{ minWidth: 130 }}>
        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
          {station.stationName || '\u2014'}
        </span>
      </td>
      <td className="td-s">
        <select name="status" value={form.status} onChange={onChange}
          className={`sel ${occupied ? 'sel-occ' : 'sel-avail'}`}>
          <option value="available">\u25CF Available</option>
          <option value="occupied">\u25CF Occupied</option>
        </select>
      </td>
      <td className="td-i">
        <input type="text" name="activeSlot" value={form.activeSlot} onChange={onChange}
          placeholder="14:00-15:00" className="ni" style={{ width: 110 }} />
      </td>
      <td className="td-i td-w">
        <input type="text" name="bookedSlots" value={form.bookedSlots} onChange={onChange}
          placeholder="10:00-11:00, 13:00-14:00" className="ni" />
      </td>
      <td className="td-i">
        <input type="text" name="currentGame" value={form.currentGame} onChange={onChange}
          placeholder="e.g. FC 25" className="ni" />
      </td>
      <td className="td-i">
        <input type="text" name="preferredGame" value={form.preferredGame} onChange={onChange}
          placeholder="Preferred" className="ni" />
      </td>
      <td className="td-sv">
        {err && <p style={{ fontSize: '0.65rem', color: '#f87171', marginBottom: 4, maxWidth: 180, wordBreak: 'break-word' }}>\u26A0 {err}</p>}
        <button onClick={onSave} disabled={saving}
          className={`sv-btn ${saved ? 'sv-ok' : err ? 'sv-err' : ''}`}>
          {saving ? <Loader2 size={13} className="adm-spin" />
            : saved  ? <CheckCircle2 size={13} />
            : err    ? <AlertTriangle size={13} />
            : <Save size={13} />}
          <span>{saving ? 'Saving\u2026' : saved ? 'Saved!' : err ? 'Error' : 'Save'}</span>
        </button>
      </td>
    </tr>
  );
};

// ─── UserRow ──────────────────────────────────────────────────────────────────
const UserRow = ({ user, schema, onUpdate, onRoleChange }) => {
  const [expanded, setExpanded]   = useState(false);
  const [form, setForm]           = useState({
    name:  user.name  || '',
    phone: user.phone || '',
    email: user.email || '',
    ...Object.fromEntries((schema || []).map(f => [f.id, user[f.id] ?? ''])),
  });
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [roleChanging, setRC] = useState(false);

  const isAdmin = user.role === 'admin';

  const onChange = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(user.uid, form);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  const handleRoleToggle = async () => {
    setRC(true);
    try { await onRoleChange(user.uid, isAdmin ? 'member' : 'admin'); }
    finally { setRC(false); }
  };

  return (
    <div style={{
      borderRadius: 10, marginBottom: 8,
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${isAdmin ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.07)'}`,
      overflow: 'hidden',
      transition: 'border-color .2s',
    }}>
      {/* Summary row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', cursor: 'pointer',
      }} onClick={() => setExpanded(e => !e)}>
        {/* Avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: isAdmin ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.07)',
          border: `1.5px solid ${isAdmin ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.1)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.85rem', fontWeight: 700, color: isAdmin ? '#c084fc' : 'rgba(255,255,255,0.5)',
          fontFamily: "'Rajdhani','Inter',sans-serif",
        }}>
          {(user.name || user.email || '?')[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user.name || '(no name)'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{user.email}</div>
        </div>
        {/* Role badge */}
        <span style={{
          fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em',
          padding: '2px 8px', borderRadius: 99,
          background: isAdmin ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${isAdmin ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.1)'}`,
          color: isAdmin ? '#c084fc' : 'rgba(255,255,255,0.4)',
          flexShrink: 0,
        }}>{isAdmin ? '\uD83D\uDEE1\uFE0F ADMIN' : 'MEMBER'}</span>
        {/* Phone badge */}
        {user.phone && (
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
            {user.phone}
          </span>
        )}
        {expanded ? <ChevronUp size={14} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={14} color="rgba(255,255,255,0.3)" />}
      </div>

      {/* Expanded edit panel */}
      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginTop: 14 }}>
            {/* Core fields */}
            {[
              { key: 'name',  label: 'Name',  type: 'text' },
              { key: 'email', label: 'Email', type: 'text' },
              { key: 'phone', label: 'Phone', type: 'text' },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', marginBottom: 5 }}>{label.toUpperCase()}</label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={e => onChange(key, e.target.value)}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 7,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#e2e8f0', fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}
            {/* Dynamic custom fields */}
            {(schema || []).map(field => (
              <div key={field.id}>
                <label style={{ display: 'block', fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', marginBottom: 5 }}>
                  {field.label.toUpperCase()}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={form[field.id] ?? ''}
                    onChange={e => onChange(field.id, e.target.value)}
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 7,
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#e2e8f0', fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box',
                    }}
                  >
                    <option value="">— select —</option>
                    {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={form[field.id] ?? ''}
                    onChange={e => onChange(field.id, e.target.value)}
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 7,
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#e2e8f0', fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button
              onClick={handleSave} disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8, border: 'none',
                background: saved ? 'rgba(34,197,94,0.2)' : 'rgba(124,58,237,0.2)',
                border: `1px solid ${saved ? 'rgba(34,197,94,0.4)' : 'rgba(124,58,237,0.4)'}`,
                color: saved ? '#4ade80' : '#a78bfa',
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {saving ? <Loader2 size={12} className="adm-spin" /> : saved ? <CheckCircle2 size={12} /> : <Save size={12} />}
              {saving ? 'Saving\u2026' : saved ? 'Saved!' : 'Save Changes'}
            </button>

            <button
              onClick={handleRoleToggle} disabled={roleChanging}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8,
                background: isAdmin ? 'rgba(239,68,68,0.1)' : 'rgba(168,85,247,0.1)',
                border: `1px solid ${isAdmin ? 'rgba(239,68,68,0.3)' : 'rgba(168,85,247,0.3)'}`,
                color: isAdmin ? '#f87171' : '#c084fc',
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {roleChanging
                ? <Loader2 size={12} className="adm-spin" />
                : isAdmin ? <ShieldOff size={12} /> : <Shield size={12} />}
              {isAdmin ? 'Remove Admin' : 'Make Admin'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── SchemaEditor ─────────────────────────────────────────────────────────────
const SchemaEditor = ({ schema, onSave }) => {
  const [fields, setFields] = useState(schema);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  useEffect(() => { setFields(schema); }, [schema]);

  const addField = () => {
    setFields(f => [...f, {
      id:      `field_${Date.now()}`,
      label:   '',
      type:    'text',
      options: [],
    }]);
  };

  const removeField = (id) => setFields(f => f.filter(x => x.id !== id));

  const updateField = (id, key, val) =>
    setFields(f => f.map(x => x.id === id ? { ...x, [key]: val } : x));

  const handleSave = async () => {
    setSaving(true);
    try {
      // Validate: each field must have a label
      const valid = fields.filter(f => f.label.trim());
      await onSave(valid);
      setFields(valid);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  return (
    <div>
      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>
        Define custom fields that appear on every user profile. Changes apply immediately.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {fields.map((field, i) => (
          <div key={field.id} style={{
            display: 'grid', gridTemplateColumns: '1fr 120px 1fr auto',
            gap: 8, alignItems: 'center',
            padding: '10px 12px', borderRadius: 8,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <input
              placeholder="Field label (e.g. Address)"
              value={field.label}
              onChange={e => updateField(field.id, 'label', e.target.value)}
              style={{
                padding: '7px 10px', borderRadius: 7,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#e2e8f0', fontSize: '0.83rem', outline: 'none', width: '100%', boxSizing: 'border-box',
              }}
            />
            <select
              value={field.type}
              onChange={e => updateField(field.id, 'type', e.target.value)}
              style={{
                padding: '7px 8px', borderRadius: 7,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#e2e8f0', fontSize: '0.8rem', outline: 'none', width: '100%',
              }}
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="select">Select</option>
            </select>
            <input
              placeholder={field.type === 'select' ? 'Options: A, B, C' : 'Placeholder (optional)'}
              value={field.type === 'select' ? (field.options || []).join(', ') : (field.placeholder || '')}
              onChange={e => {
                if (field.type === 'select') {
                  updateField(field.id, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean));
                } else {
                  updateField(field.id, 'placeholder', e.target.value);
                }
              }}
              style={{
                padding: '7px 10px', borderRadius: 7,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#e2e8f0', fontSize: '0.8rem', outline: 'none', width: '100%', boxSizing: 'border-box',
              }}
            />
            <button
              onClick={() => removeField(field.id)}
              style={{
                width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            ><Trash2 size={13} /></button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={addField}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', cursor: 'pointer',
          }}
        ><Plus size={13} /> Add Field</button>

        <button
          onClick={handleSave} disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8, border: 'none',
            background: saved ? 'rgba(34,197,94,0.15)' : 'rgba(124,58,237,0.2)',
            border: `1px solid ${saved ? 'rgba(34,197,94,0.35)' : 'rgba(124,58,237,0.4)'}`,
            color: saved ? '#4ade80' : '#a78bfa',
            fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          {saving ? <Loader2 size={13} className="adm-spin" /> : saved ? <CheckCircle2 size={13} /> : <Save size={13} />}
          {saving ? 'Saving\u2026' : saved ? 'Schema Saved!' : 'Save Schema'}
        </button>
      </div>
    </div>
  );
};

// ─── AdminDashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [adminUser,  setAdminUser]  = useState(null);
  const [adminToken, setAdminToken] = useState(null);
  const [loginBusy,  setLoginBusy]  = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [sessionRestoring, setRestoring] = useState(true);
  const [activeTab, setActiveTab]   = useState('stations'); // 'stations' | 'users' | 'schema'

  // User management state
  const [users,      setUsers]      = useState([]);
  const [usersLoad,  setUsersLoad]  = useState(false);
  const [schema,     setSchema]     = useState([]);

  const { stations, isLoading, isError, refetch } = useStationData();
  const navigate = useNavigate();
  const zapRef   = useRef(null);

  // ── Restore session from sessionStorage on mount ──────────────────────────
  useEffect(() => {
    const token    = sessionStorage.getItem(SESSION_TOKEN_KEY);
    const userJson = sessionStorage.getItem(SESSION_USER_KEY);
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);
        setAdminUser(user);
        setAdminToken(token);
      } catch { /* invalid json — ignore */ }
    }
    // Also listen to Firebase auth in case they're still signed in via another tab
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        // Firebase session expired — clear local session
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
        sessionStorage.removeItem(SESSION_USER_KEY);
        setAdminUser(null);
        setAdminToken(null);
      }
      setRestoring(false);
    });
    return unsub;
  }, []);

  // ── Zap icon hue animation ─────────────────────────────────────────────────
  useEffect(() => {
    if (!zapRef.current || !adminUser) return;
    let h = 0;
    const id = setInterval(() => {
      h = (h + 0.8) % 360;
      if (zapRef.current) zapRef.current.style.filter = `hue-rotate(${h}deg)`;
    }, 20);
    return () => clearInterval(id);
  }, [adminUser]);

  // ── Load users + schema when users tab is opened ───────────────────────────
  useEffect(() => {
    if (activeTab !== 'users' && activeTab !== 'schema') return;
    if (!adminUser) return;
    const loadData = async () => {
      setUsersLoad(true);
      try {
        const [u, s] = await Promise.all([listAllUsers(), getCustomSchema()]);
        setUsers(u);
        setSchema(s);
      } catch (err) {
        console.warn('[AdminDashboard] user/schema load failed:', err.message);
      } finally { setUsersLoad(false); }
    };
    loadData();
  }, [activeTab, adminUser]);

  const handleLogout = async () => {
    await signOut(auth);
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(SESSION_USER_KEY);
    setAdminUser(null);
    setAdminToken(null);
    navigate('/', { replace: true });
  };

  const handleLogin = async () => {
    setLoginBusy(true); setLoginError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token  = extractOAuthToken(result);
      if (!token) {
        setLoginError('Google did not return an OAuth token. Ensure the Sheets API is enabled and the spreadsheets scope is on the OAuth consent screen.');
        await signOut(auth); return;
      }
      const userObj = {
        uid:         result.user.uid,
        email:       result.user.email,
        displayName: result.user.displayName,
        photoURL:    result.user.photoURL,
      };
      // Persist in sessionStorage so refresh keeps admin logged in
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
      sessionStorage.setItem(SESSION_USER_KEY,  JSON.stringify(userObj));
      setAdminUser(userObj);
      setAdminToken(token);
    } catch (e) {
      setLoginError(e.message || 'Sign-in failed. Try again.');
    } finally { setLoginBusy(false); }
  };

  const handleUserUpdate = useCallback(async (uid, fields) => {
    await updateUserProfile(uid, fields);
    setUsers(prev => prev.map(u => u.uid === uid ? { ...u, ...fields } : u));
  }, []);

  const handleRoleChange = useCallback(async (uid, role) => {
    await setUserRole(uid, role);
    setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role } : u));
  }, []);

  const handleSchemaSave = useCallback(async (fields) => {
    await saveCustomSchema(fields);
    setSchema(fields);
  }, []);

  // Show blank while restoring session
  if (sessionRestoring) return null;

  if (!adminUser || !adminToken) {
    return <LoginPage onLogin={handleLogin} busy={loginBusy} error={loginError} />;
  }

  const sorted    = [...stations].sort((a, b) => Number(a.id) - Number(b.id));
  const total     = stations.length;
  const available = stations.filter(s => s.status?.toLowerCase() === 'available').length;
  const occupied  = stations.filter(s => s.status?.toLowerCase() === 'occupied').length;
  const util      = total ? Math.round(occupied / total * 100) : 0;

  const TAB_STYLE = (active) => ({
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', borderRadius: 8, border: 'none',
    background: active ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
    border: `1px solid ${active ? 'rgba(124,58,237,0.45)' : 'rgba(255,255,255,0.08)'}`,
    color: active ? '#a78bfa' : 'rgba(255,255,255,0.4)',
    fontSize: '0.8rem', fontWeight: active ? 700 : 500,
    cursor: 'pointer', transition: 'all .15s', letterSpacing: '0.04em',
  });

  return (
    <div className="adm-wrap">
      <NeonBg />
      <Navbar />

      <main className="adm-body" style={{ paddingTop: 72 }}>
        {/* Header */}
        <div className="adm-hdr">
          <div className="adm-hdr-l">
            <div className="adm-title-icon" ref={zapRef}><Zap size={22} /></div>
            <div>
              <h1 className="adm-title">STATION CONTROL</h1>
              <p className="adm-sub">Live Google Sheets sync \u00b7 {adminUser.email}</p>
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

        {/* Stat cards */}
        <div className="sc-grid">
          <StatCard label="Total Stations" value={total}     Icon={Gamepad2}     glow="#a855f7" />
          <StatCard label="Available"      value={available} Icon={CheckCircle2} glow="#22c55e" />
          <StatCard label="Occupied"       value={occupied}  Icon={Clock}        glow="#ef4444" />
          <StatCard label="Utilisation"    value={util}      Icon={Star}         glow="#ec4899" />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <button style={TAB_STYLE(activeTab === 'stations')} onClick={() => setActiveTab('stations')}>
            <Gamepad2 size={14} /> Stations
          </button>
          <button style={TAB_STYLE(activeTab === 'users')} onClick={() => setActiveTab('users')}>
            <Users size={14} /> Users
          </button>
          <button style={TAB_STYLE(activeTab === 'schema')} onClick={() => setActiveTab('schema')}>
            <Settings size={14} /> Custom Fields
          </button>
        </div>

        {/* ── STATIONS TAB ── */}
        {activeTab === 'stations' && (
          <>
            {isLoading && (
              <div className="adm-skeletons">
                {[...Array(6)].map((_, i) => <div key={i} className="adm-skel" style={{ animationDelay: `${i * 70}ms` }} />)}
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
                        {['#', 'Station Name', 'Status', 'Active Slot', 'Booked Slots', 'Current Game', 'Preferred Game', ''].map((h, i) => (
                          <th key={i} className="tbl-th">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((s, i) => (
                        <StationRow key={`station-${s.id || i}`} station={s} rowIndex={i} oauthToken={adminToken} />
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="tbl-neon tbl-neon-bot" />
              </div>
            )}
          </>
        )}

        {/* ── USERS TAB ── */}
        {activeTab === 'users' && (
          <div>
            {usersLoad ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '24px 0', color: 'rgba(255,255,255,0.4)' }}>
                <Loader2 size={18} className="adm-spin" /> Loading users\u2026
              </div>
            ) : users.length === 0 ? (
              <div style={{ padding: '24px 0', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>No users found.</div>
            ) : (
              <div>
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>
                  {users.length} registered user{users.length !== 1 ? 's' : ''} \u00b7 Click a row to edit
                </p>
                {users.map(u => (
                  <UserRow
                    key={u.uid}
                    user={u}
                    schema={schema}
                    onUpdate={handleUserUpdate}
                    onRoleChange={handleRoleChange}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SCHEMA TAB ── */}
        {activeTab === 'schema' && (
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12, padding: '20px',
          }}>
            <h3 style={{ fontFamily: "'Rajdhani','Inter',sans-serif", fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>
              \uD83D\uDCCB User Profile Schema
            </h3>
            {usersLoad ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 0', color: 'rgba(255,255,255,0.4)' }}>
                <Loader2 size={16} className="adm-spin" /> Loading schema\u2026
              </div>
            ) : (
              <SchemaEditor schema={schema} onSave={handleSchemaSave} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
