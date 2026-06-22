import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut, Save, Loader2, ShieldCheck, Gamepad2, Zap, Clock, Star,
  RefreshCw, CheckCircle2, AlertTriangle, Users, Plus,
  Trash2, ChevronDown, ChevronUp, Shield, ShieldOff,
  BookOpen, Pencil, X as XIcon,
} from 'lucide-react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import useStationData from '../hooks/useStationData';
import { useStations } from '../hooks/useStations';
import { auth, adminGoogleProvider } from '../lib/firebase';
import { listAllUsers, updateUserProfile, setUserRole } from '../hooks/useUsers';
import { useAllBookings } from '../hooks/useBookings';
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

const SESSION_USER_KEY = 'gz_admin_user';

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
          <span>{busy ? 'Authenticating…' : 'Sign in with Google'}</span>
          <div className="login-shine" />
        </button>
        <p className="login-note">Only authorised admins can access this panel</p>
      </div>
    </div>
  </div>
);

const inputStyle = {
  width: '100%', padding: '8px 10px', borderRadius: 7,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#e2e8f0', fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box',
};

// ── StationRow ────────────────────────────────────────────────────────────────────
const StationRow = ({ station, onUpdate, onDelete }) => {
  const serSlot = (slot) => {
    if (!slot) return '';
    if (typeof slot === 'string') return slot;
    if (slot.start24 && slot.end24) return `${slot.start24}-${slot.end24}`;
    return '';
  };

  const init = () => ({
    name:          station.name          || station.stationName || '',
    type:          station.type          || station.stationType || 'ps5',
    preferredGame: station.preferredGame || '',
    currentGame:   station.currentGame   || '',
  });

  const [form, setForm]     = useState(init);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [err,    setErr]    = useState(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  useEffect(() => { setForm(init()); }, [station.id]); // eslint-disable-line

  const onChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const onSave = async () => {
    setSaving(true); setErr(null);
    try {
      await onUpdate(station.id, {
        name:          form.name,
        type:          form.type,
        preferredGame: form.preferredGame,
        currentGame:   form.currentGame,
      });
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setErr(e.message || 'Save failed'); setTimeout(() => setErr(null), 6000);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDel) { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3000); return; }
    setDeleting(true);
    try { await onDelete(station.id); }
    finally { setDeleting(false); }
  };

  const occupied  = station.status === 'occupied';
  const typeLabel = (form.type || station.stationType) === 'racing' ? '🏀️' : '🎮';
  const activeSlotStr = serSlot(station.activeSlot);
  const bookedStr = Array.isArray(station.bookedSlots)
    ? station.bookedSlots.join(', ')
    : (station.bookedSlots || '');

  return (
    <tr className={`sr ${occupied ? 'sr-occ' : 'sr-avail'}`}>
      <td className="td-id">
        <div className="id-badge">
          <span>{typeLabel} {String(station.id || '').padStart(2, '0')}</span>
          <i className={occupied ? 'dot dot-red' : 'dot dot-grn'} />
        </div>
      </td>

      {/* Editable: Name */}
      <td className="td-i" style={{ minWidth: 150 }}>
        <input type="text" name="name" value={form.name} onChange={onChange}
          placeholder="Station Name" className="ni" style={{ width: '100%' }} />
      </td>

      {/* Editable: Type */}
      <td className="td-i">
        <select name="type" value={form.type} onChange={onChange}
          className="sel" style={{ minWidth: 90 }}>
          <option value="ps5">PS5</option>
          <option value="racing">Racing</option>
          <option value="pc">PC</option>
          <option value="vr">VR</option>
        </select>
      </td>

      {/* Read-only derived: Status */}
      <td className="td-i">
        <span style={{
          fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px',
          borderRadius: 99,
          background: occupied ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
          border: `1px solid ${occupied ? 'rgba(239,68,68,0.35)' : 'rgba(34,197,94,0.35)'}`,
          color: occupied ? '#f87171' : '#4ade80',
        }}>{occupied ? 'OCCUPIED' : 'AVAILABLE'}</span>
      </td>

      {/* Read-only derived: Active Slot */}
      <td className="td-i">
        <span style={{ fontSize: '0.8rem', color: activeSlotStr ? '#fbbf24' : 'rgba(255,255,255,0.25)', fontWeight: 600 }}>
          {activeSlotStr || '—'}
        </span>
      </td>

      {/* Read-only derived: Booked Slots */}
      <td className="td-i td-w">
        <span style={{ fontSize: '0.75rem', color: bookedStr ? '#a78bfa' : 'rgba(255,255,255,0.25)' }}>
          {bookedStr || '—'}
        </span>
      </td>

      {/* Editable: Current Game */}
      <td className="td-i">
        <input type="text" name="currentGame" value={form.currentGame} onChange={onChange}
          placeholder="e.g. FC 25" className="ni" />
      </td>

      {/* Editable: Preferred Game */}
      <td className="td-i">
        <input type="text" name="preferredGame" value={form.preferredGame} onChange={onChange}
          placeholder="e.g. GTA V" className="ni" />
      </td>

      <td className="td-sv">
        {err && <p style={{ fontSize: '0.65rem', color: '#f87171', marginBottom: 4, maxWidth: 180, wordBreak: 'break-word' }}>⚠ {err}</p>}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={onSave} disabled={saving}
            className={`sv-btn ${saved ? 'sv-ok' : err ? 'sv-err' : ''}`}>
            {saving ? <Loader2 size={13} className="adm-spin" />
              : saved  ? <CheckCircle2 size={13} />
              : err    ? <AlertTriangle size={13} />
              : <Save size={13} />}
            <span>{saving ? 'Saving…' : saved ? 'Saved!' : err ? 'Error' : 'Save'}</span>
          </button>
          <button onClick={handleDelete} disabled={deleting} title={confirmDel ? 'Click again to confirm' : 'Delete station'}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 7, fontSize: '0.75rem', fontWeight: 600,
              background: confirmDel ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${confirmDel ? 'rgba(239,68,68,0.6)' : 'rgba(239,68,68,0.2)'}`,
              color: '#f87171', cursor: 'pointer', transition: 'all .15s',
            }}>
            {deleting ? <Loader2 size={12} className="adm-spin" /> : <Trash2 size={12} />}
            {confirmDel ? 'Confirm' : 'Delete'}
          </button>
        </div>
      </td>
    </tr>
  );
};

// ── AddStationForm ─────────────────────────────────────────────────────────────
const AddStationForm = ({ onAdd }) => {
  const [open, setOpen]     = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm]     = useState({ name: '', type: 'ps5', preferredGame: '' });
  const onChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onAdd(form);
      setForm({ name: '', type: 'ps5', preferredGame: '' });
      setOpen(false);
    } finally { setSaving(false); }
  };

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '8px 16px', borderRadius: 9, marginBottom: 14,
      background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
      color: '#4ade80', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
    }}><Plus size={14} /> Add Station</button>
  );

  return (
    <div style={{
      marginBottom: 16, padding: '14px 16px', borderRadius: 12,
      background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)',
    }}>
      <p style={{ fontSize: '0.7rem', color: '#4ade80', letterSpacing: '0.1em', marginBottom: 12, fontWeight: 700 }}>NEW STATION</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 10 }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', marginBottom: 5 }}>STATION NAME *</label>
          <input name="name" value={form.name} onChange={onChange} placeholder="e.g. PS5 Station 15" style={inputStyle} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', marginBottom: 5 }}>TYPE</label>
          <select name="type" value={form.type} onChange={onChange} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="ps5">PS5</option>
            <option value="racing">Racing</option>
            <option value="pc">PC</option>
            <option value="vr">VR</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', marginBottom: 5 }}>PREFERRED GAME</label>
          <input name="preferredGame" value={form.preferredGame} onChange={onChange} placeholder="e.g. GTA V" style={inputStyle} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={handleAdd} disabled={saving || !form.name.trim()} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 8,
          background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)',
          color: '#4ade80', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
        }}>
          {saving ? <Loader2 size={13} className="adm-spin" /> : <Plus size={13} />}
          {saving ? 'Adding…' : 'Add Station'}
        </button>
        <button onClick={() => setOpen(false)} style={{
          padding: '8px 14px', borderRadius: 8,
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', cursor: 'pointer',
        }}>Cancel</button>
      </div>
    </div>
  );
};

// ── STATUS_COLORS / BookingRow / UserRow unchanged ───────────────────────────
const STATUS_COLORS = {
  confirmed: { color: '#4ade80', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.25)'  },
  cancelled: { color: '#f87171', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.25)'  },
  pending:   { color: '#fbbf24', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
};

const BookingRow = ({ booking, onUpdate, onDelete }) => {
  const [editing, setEditing]   = useState(false);
  const [form, setForm]         = useState({ status: booking.status, slot: booking.slot, game: booking.game || '' });
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirm]= useState(false);

  const sc = STATUS_COLORS[form.status] ?? STATUS_COLORS.pending;

  const fmtDate = (ts) => {
    if (!ts) return '—';
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
    } catch { return '—'; }
  };

  const handleSave = async () => {
    setSaving(true);
    try { await onUpdate(booking.id, form); setEditing(false); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDel) { setConfirm(true); setTimeout(() => setConfirm(false), 3000); return; }
    setDeleting(true);
    try { await onDelete(booking.id); }
    finally { setDeleting(false); }
  };

  return (
    <div style={{ borderRadius: 10, marginBottom: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 99, background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color, flexShrink: 0 }}>{(form.status || 'pending').toUpperCase()}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{booking.stationName || '—'}</div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{booking.slot || '—'} · {booking.hours || 1}h · ₹{booking.amount}</div>
        </div>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', flexShrink: 0, textAlign: 'right' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)' }}>{booking.txnId}</div>
          <div>{fmtDate(booking.bookedAt)}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => setEditing(e => !e)} style={{ width: 28, height: 28, borderRadius: 7, background: editing ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.06)', border: `1px solid ${editing ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.1)'}`, color: editing ? '#a78bfa' : 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{editing ? <XIcon size={12} /> : <Pencil size={12} />}</button>
          <button onClick={handleDelete} disabled={deleting} style={{ width: 28, height: 28, borderRadius: 7, background: confirmDel ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.08)', border: `1px solid ${confirmDel ? 'rgba(239,68,68,0.6)' : 'rgba(239,68,68,0.2)'}`, color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .15s' }}>
            {deleting ? <Loader2 size={12} className="adm-spin" /> : <Trash2 size={12} />}
          </button>
        </div>
      </div>
      {editing && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10, marginTop: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', marginBottom: 5 }}>STATUS</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', marginBottom: 5 }}>SLOT</label>
              <input value={form.slot} onChange={e => setForm(p => ({ ...p, slot: e.target.value }))} placeholder="14:00-15:00" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', marginBottom: 5 }}>GAME</label>
              <input value={form.game} onChange={e => setForm(p => ({ ...p, game: e.target.value }))} placeholder="e.g. FC 25" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', color: '#a78bfa', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
              {saving ? <Loader2 size={12} className="adm-spin" /> : <Save size={12} />}
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', cursor: 'pointer' }}>Cancel</button>
          </div>
          {confirmDel && <p style={{ marginTop: 8, fontSize: '0.7rem', color: '#f87171' }}>⚠ Click delete again to confirm permanent deletion.</p>}
        </div>
      )}
    </div>
  );
};

const UserRow = ({ user, onUpdate, onRoleChange }) => {
  const [expanded, setExpanded] = useState(false);
  const isAdmin = user.role === 'admin';
  const [core, setCore] = useState({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
  const SYSTEM_KEYS  = new Set(['uid','name','email','phone','role','createdAt','hasPhone']);
  const extraInitial = Object.entries(user).filter(([k]) => !SYSTEM_KEYS.has(k)).map(([k, v]) => ({ key: k, value: String(v ?? '') }));
  const [extras, setExtras]      = useState(extraInitial);
  const [saving, setSaving]      = useState(false);
  const [saved,  setSaved]       = useState(false);
  const [roleChanging, setRC]    = useState(false);
  const [newKey, setNewKey]      = useState('');
  const [newVal, setNewVal]      = useState('');
  const [addingField, setAdding] = useState(false);

  useEffect(() => {
    setCore({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
    const fresh = Object.entries(user).filter(([k]) => !SYSTEM_KEYS.has(k)).map(([k, v]) => ({ key: k, value: String(v ?? '') }));
    setExtras(fresh);
  }, [user.uid]); // eslint-disable-line

  const handleSave = async () => {
    setSaving(true);
    try {
      const fields = { ...core };
      extras.forEach(({ key, value }) => { if (key.trim()) fields[key.trim()] = value; });
      await onUpdate(user.uid, fields);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  const handleRoleToggle = async () => {
    setRC(true);
    try { await onRoleChange(user.uid, isAdmin ? 'member' : 'admin'); }
    finally { setRC(false); }
  };

  const addExtra    = () => { const k = newKey.trim(); if (!k) return; setExtras(e => [...e, { key: k, value: newVal }]); setNewKey(''); setNewVal(''); setAdding(false); };
  const removeExtra = (idx) => setExtras(e => e.filter((_, i) => i !== idx));
  const updateExtra = (idx, field, val) => setExtras(e => e.map((item, i) => i === idx ? { ...item, [field]: val } : item));

  return (
    <div style={{ borderRadius: 10, marginBottom: 8, background: 'rgba(255,255,255,0.03)', border: `1px solid ${isAdmin ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.07)'}`, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: isAdmin ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.07)', border: `1.5px solid ${isAdmin ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, color: isAdmin ? '#c084fc' : 'rgba(255,255,255,0.5)', fontFamily: "'Rajdhani','Inter',sans-serif" }}>
          {(user.name || user.email || '?')[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name || '(no name)'}</div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{user.email}</div>
        </div>
        <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', padding: '2px 8px', borderRadius: 99, background: isAdmin ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${isAdmin ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.1)'}`, color: isAdmin ? '#c084fc' : 'rgba(255,255,255,0.4)', flexShrink: 0 }}>{isAdmin ? 'ADMIN' : 'MEMBER'}</span>
        {user.phone && <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{user.phone}</span>}
        {expanded ? <ChevronUp size={14} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={14} color="rgba(255,255,255,0.3)" />}
      </div>
      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: '0.6rem', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', margin: '14px 0 8px' }}>Core Info</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10 }}>
            {[['name','Name'],['email','Email'],['phone','Phone']].map(([key, label]) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', marginBottom: 5 }}>{label.toUpperCase()}</label>
                <input type="text" value={core[key]} onChange={e => setCore(p => ({ ...p, [key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
          </div>
          {(extras.length > 0 || addingField) && (
            <>
              <p style={{ fontSize: '0.6rem', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', margin: '14px 0 8px' }}>Extra Info</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {extras.map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                    <input placeholder="Field name" value={item.key} onChange={e => updateExtra(idx, 'key', e.target.value)} style={{ ...inputStyle, fontWeight: 600 }} />
                    <input placeholder="Value" value={item.value} onChange={e => updateExtra(idx, 'value', e.target.value)} style={inputStyle} />
                    <button onClick={() => removeExtra(idx)} style={{ width: 30, height: 30, borderRadius: 7, flexShrink: 0, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Trash2 size={13} /></button>
                  </div>
                ))}
                {addingField && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 8, alignItems: 'center' }}>
                    <input autoFocus placeholder="e.g. address" value={newKey} onChange={e => setNewKey(e.target.value)} onKeyDown={e => e.key === 'Enter' && addExtra()} style={{ ...inputStyle, borderColor: 'rgba(124,58,237,0.4)' }} />
                    <input placeholder="Value" value={newVal} onChange={e => setNewVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && addExtra()} style={inputStyle} />
                    <button onClick={addExtra} style={{ padding: '7px 10px', borderRadius: 7, background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', color: '#a78bfa', fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>Add</button>
                    <button onClick={() => { setAdding(false); setNewKey(''); setNewVal(''); }} style={{ width: 30, height: 30, borderRadius: 7, flexShrink: 0, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><AlertTriangle size={12} /></button>
                  </div>
                )}
              </div>
            </>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => setAdding(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)', fontSize: '0.76rem', cursor: 'pointer' }}><Plus size={12} /> Add Field</button>
            <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: saved ? 'rgba(34,197,94,0.2)' : 'rgba(124,58,237,0.2)', border: `1px solid ${saved ? 'rgba(34,197,94,0.4)' : 'rgba(124,58,237,0.4)'}`, color: saved ? '#4ade80' : '#a78bfa', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
              {saving ? <Loader2 size={12} className="adm-spin" /> : saved ? <CheckCircle2 size={12} /> : <Save size={12} />}
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
            </button>
            <button onClick={handleRoleToggle} disabled={roleChanging} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: isAdmin ? 'rgba(239,68,68,0.1)' : 'rgba(168,85,247,0.1)', border: `1px solid ${isAdmin ? 'rgba(239,68,68,0.3)' : 'rgba(168,85,247,0.3)'}`, color: isAdmin ? '#f87171' : '#c084fc', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
              {roleChanging ? <Loader2 size={12} className="adm-spin" /> : isAdmin ? <ShieldOff size={12} /> : <Shield size={12} />}
              {isAdmin ? 'Remove Admin' : 'Make Admin'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── AdminDashboard ─────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [adminUser,  setAdminUser]  = useState(null);
  const [loginBusy,  setLoginBusy]  = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [sessionRestoring, setRestoring] = useState(true);
  const [activeTab, setActiveTab]   = useState('stations');

  const [users,     setUsers]     = useState([]);
  const [usersLoad, setUsersLoad] = useState(false);
  const [bookSearch, setBookSearch] = useState('');

  const { stations, isLoading, isError } = useStationData();
  const { addStation, updateStation, deleteStation } = useStations();
  const { bookings, loading: bookingsLoad, updateBooking, deleteBooking } = useAllBookings();
  const navigate = useNavigate();
  const zapRef   = useRef(null);

  useEffect(() => {
    const userJson = sessionStorage.getItem(SESSION_USER_KEY);
    if (userJson) { try { setAdminUser(JSON.parse(userJson)); } catch {} }
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) { sessionStorage.removeItem(SESSION_USER_KEY); setAdminUser(null); }
      setRestoring(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!zapRef.current || !adminUser) return;
    let h = 0;
    const id = setInterval(() => {
      h = (h + 0.8) % 360;
      if (zapRef.current) zapRef.current.style.filter = `hue-rotate(${h}deg)`;
    }, 20);
    return () => clearInterval(id);
  }, [adminUser]);

  useEffect(() => {
    if (activeTab !== 'users' || !adminUser) return;
    setUsersLoad(true);
    listAllUsers().then(setUsers).catch(err => console.warn('[AdminDashboard] users load failed:', err.message)).finally(() => setUsersLoad(false));
  }, [activeTab, adminUser]);

  const handleLogout = async () => {
    await signOut(auth);
    sessionStorage.removeItem(SESSION_USER_KEY);
    setAdminUser(null);
    navigate('/', { replace: true });
  };

  const handleL