import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Receipt, Search, Download, ChevronDown, ChevronUp,
  Gamepad2, Clock, CheckCircle2, XCircle, AlertCircle,
  CreditCard, Loader2, ArrowLeft, IndianRupee,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import useBookings from '../hooks/useBookings';
import Navbar from '../components/Navbar';

/* ─── helpers ─────────────────────────────────────────────────────── */
const STATUS = {
  confirmed: { color: '#4ade80', bg: 'rgba(34,197,94,0.10)',  border: 'rgba(34,197,94,0.25)',  icon: CheckCircle2, label: 'CONFIRMED' },
  cancelled: { color: '#f87171', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.25)',  icon: XCircle,      label: 'CANCELLED' },
  pending:   { color: '#fbbf24', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)', icon: AlertCircle,  label: 'PENDING'   },
};
const sc = (s) => STATUS[s] ?? STATUS.pending;

function fmtDate(ts) {
  if (!ts) return '—';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return '—'; }
}

function fmtSlot(slot) {
  if (!slot) return '—';
  const [s, e] = slot.split('-');
  const fmt = t => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  };
  return `${fmt(s)} – ${fmt(e)}`;
}

/* ─── Receipt modal ──────────────────────────────────────────────── */
function ReceiptModal({ txn, onClose }) {
  if (!txn) return null;
  const cfg = sc(txn.status);
  const Icon = cfg.icon;

  const lines = [
    ['Transaction ID',  txn.txnId        || '—'],
    ['Station',         txn.stationName  || '—'],
    ['Slot',            fmtSlot(txn.slot)],
    ['Duration',        txn.hours ? `${txn.hours} hr${txn.hours > 1 ? 's' : ''}` : '—'],
    ['Game',            txn.game         || '—'],
    ['UPI ID',          txn.upiId        || '—'],
    ['Bank',            txn.bank         || '—'],
    ['Status',          cfg.label],
    ['Booked At',       fmtDate(txn.bookedAt)],
  ];

  const handleDownload = () => {
    const text = [
      '===== GAMEZONE RECEIPT =====',
      ...lines.map(([k, v]) => `${k.padEnd(18)}: ${v}`),
      `${'Amount'.padEnd(18)}: \u20b9${txn.amount}`,
      '============================',
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `GZ_Receipt_${txn.txnId || 'unknown'}.txt`;
    a.click();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(420px, 100%)',
          background: '#111116',
          border: `1px solid ${cfg.border}`,
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: `0 0 60px ${cfg.bg}, 0 24px 70px rgba(0,0,0,.8)`,
          animation: 'txn-modal-in 0.28s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
      >
        <style>{`
          @keyframes txn-modal-in {
            from{opacity:0;transform:scale(.93) translateY(12px)}
            to{opacity:1;transform:scale(1) translateY(0)}
          }
        `}</style>

        {/* coloured top bar */}
        <div style={{ height: 3, background: `linear-gradient(90deg,transparent,${cfg.color},#a855f7,${cfg.color},transparent)`, backgroundSize: '200% 100%' }} />

        <div style={{ padding: '22px 22px 26px' }}>
          {/* header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: cfg.bg, border: `2px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} color={cfg.color} />
            </div>
            <div>
              <div style={{ fontFamily: "'Rajdhani','Inter',sans-serif", fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>Receipt</div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>GameZone · Booking confirmation</div>
            </div>
            <button
              onClick={onClose}
              style={{ marginLeft: 'auto', width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >✕</button>
          </div>

          {/* amount hero */}
          <div style={{ textAlign: 'center', margin: '0 0 20px', padding: '16px', borderRadius: 12, background: `rgba(${cfg.color === '#4ade80' ? '34,197,94' : cfg.color === '#f87171' ? '239,68,68' : '245,158,11'},0.07)`, border: `1px solid ${cfg.border}` }}>
            <div style={{ fontSize: '0.62rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>AMOUNT PAID</div>
            <div style={{ fontFamily: "'Rajdhani','Inter',sans-serif", fontWeight: 900, fontSize: '2.4rem', color: cfg.color, lineHeight: 1 }}>
              ₹{txn.amount}
            </div>
          </div>

          {/* detail rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {lines.map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: '0.8rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>{k}</span>
                <span style={{ color: k === 'Status' ? cfg.color : '#e2e8f0', fontWeight: k === 'Transaction ID' ? 700 : 500, textAlign: 'right', fontFamily: k === 'Transaction ID' ? 'monospace' : 'inherit', fontSize: k === 'Transaction ID' ? '0.72rem' : '0.8rem', wordBreak: 'break-all' }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 16 }} />

          {/* total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>TOTAL</span>
            <span style={{ fontFamily: "'Rajdhani','Inter',sans-serif", fontWeight: 900, fontSize: '1.4rem', color: cfg.color }}>₹{txn.amount}</span>
          </div>

          <button
            onClick={handleDownload}
            style={{
              width: '100%', padding: '11px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
              color: '#fff', fontSize: '0.88rem', fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 20px rgba(124,58,237,0.35)',
            }}
          >
            <Download size={15} /> Download Receipt
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Single transaction row ─────────────────────────────────────── */
function TxnRow({ txn, onViewReceipt }) {
  const [open, setOpen] = useState(false);
  const cfg = sc(txn.status);
  const Icon = cfg.icon;

  return (
    <div style={{ borderRadius: 12, marginBottom: 8, background: 'rgba(255,255,255,0.03)', border: `1px solid ${open ? cfg.border : 'rgba(255,255,255,0.07)'}`, overflow: 'hidden', transition: 'border .15s' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer', flexWrap: 'wrap' }}
      >
        {/* status icon */}
        <div style={{ width: 34, height: 34, borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={16} color={cfg.color} />
        </div>

        {/* main info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {txn.stationName || '—'}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
            {fmtSlot(txn.slot)} · {txn.hours || 1}h
          </div>
        </div>

        {/* amount */}
        <div style={{ fontFamily: "'Rajdhani','Inter',sans-serif", fontWeight: 800, fontSize: '1.05rem', color: cfg.color, flexShrink: 0 }}>
          ₹{txn.amount}
        </div>

        {/* date */}
        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', flexShrink: 0, textAlign: 'right', minWidth: 90 }}>
          {fmtDate(txn.bookedAt)}
        </div>

        {open ? <ChevronUp size={14} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={14} color="rgba(255,255,255,0.3)" />}
      </div>

      {open && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10, marginTop: 12 }}>
            {[
              ['TXN ID',    txn.txnId,       'monospace'],
              ['UPI ID',    txn.upiId,       null],
              ['Bank',      txn.bank,        null],
              ['Game',      txn.game || '—', null],
              ['Status',    cfg.label,       null],
            ].map(([label, val, font]) => (
              <div key={label}>
                <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: label === 'Status' ? cfg.color : '#e2e8f0', fontFamily: font || 'inherit', wordBreak: 'break-all' }}>{val || '—'}</div>
              </div>
            ))}
          </div>
          <button
            onClick={() => onViewReceipt(txn)}
            style={{
              marginTop: 14, display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8,
              background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.35)',
              color: '#a78bfa', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Receipt size={13} /> View Receipt
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────── */
export default function TransactionsPage() {
  const user      = useAuthStore(s => s.user);
  const navigate  = useNavigate();
  const { bookings, loading } = useBookings(user?.uid);

  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('all');   // all | confirmed | cancelled | pending
  const [receipt, setReceipt] = useState(null);

  const filtered = useMemo(() => {
    return bookings.filter(b => {
      if (filter !== 'all' && b.status !== filter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        b.stationName?.toLowerCase().includes(q) ||
        b.txnId?.toLowerCase().includes(q) ||
        b.upiId?.toLowerCase().includes(q) ||
        b.slot?.toLowerCase().includes(q)
      );
    });
  }, [bookings, search, filter]);

  const totalSpent    = bookings.filter(b => b.status === 'confirmed').reduce((s, b) => s + Number(b.amount || 0), 0);
  const totalBookings = bookings.filter(b => b.status === 'confirmed').length;
  const totalHours    = bookings.filter(b => b.status === 'confirmed').reduce((s, b) => s + Number(b.hours || 0), 0);

  if (!user) {
    return (
      <div style={{ minHeight: '100dvh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Navbar />
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
          <CreditCard size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p>Please <a href="/auth/login" style={{ color: '#a855f7' }}>log in</a> to view transactions.</p>
        </div>
      </div>
    );
  }

  const TABS = ['all', 'confirmed', 'cancelled', 'pending'];

  return (
    <div style={{ minHeight: '100dvh', background: '#0a0a0f', color: '#e2e8f0', fontFamily: "'Inter',sans-serif" }}>
      <Navbar />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '88px 16px 40px' }}>

        {/* back */}
        <button
          onClick={() => navigate('/profile')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', cursor: 'pointer', marginBottom: 24, padding: 0 }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
        >
          <ArrowLeft size={14} /> Back to Profile
        </button>

        {/* title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Receipt size={20} color="#a855f7" />
          </div>
          <div>
            <h1 style={{ fontFamily: "'Rajdhani','Inter',sans-serif", fontWeight: 800, fontSize: '1.5rem', color: '#fff', margin: 0 }}>Transactions</h1>
            <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', margin: 0, marginTop: 2 }}>Your complete payment history</p>
          </div>
        </div>

        {/* stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Total Spent',    value: `\u20b9${totalSpent}`,        color: '#a855f7', icon: IndianRupee },
            { label: 'Bookings',       value: totalBookings,                color: '#22c55e', icon: Gamepad2   },
            { label: 'Hours Played',   value: `${totalHours}h`,            color: '#f59e0b', icon: Clock      },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} style={{ padding: '14px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
              <Icon size={16} color={color} style={{ marginBottom: 6 }} />
              <div style={{ fontFamily: "'Rajdhani','Inter',sans-serif", fontWeight: 800, fontSize: '1.3rem', color }}>{value}</div>
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', marginTop: 2, letterSpacing: '0.08em' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* search + filter */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by station, TXN ID, UPI…"
              style={{ width: '100%', padding: '9px 10px 9px 30px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                style={{
                  padding: '8px 12px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600,
                  cursor: 'pointer', textTransform: 'capitalize',
                  background: filter === t ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${filter === t ? 'rgba(168,85,247,0.45)' : 'rgba(255,255,255,0.08)'}`,
                  color: filter === t ? '#c084fc' : 'rgba(255,255,255,0.4)',
                  transition: 'all .15s',
                }}
              >{t}</button>
            ))}
          </div>
        </div>

        {/* count */}
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>
          {loading ? 'Loading…' : `${filtered.length} transaction${filtered.length !== 1 ? 's' : ''}`}
        </div>

        {/* list */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '32px 0', color: 'rgba(255,255,255,0.4)' }}>
            <Loader2 size={18} style={{ animation: 'spin 0.7s linear infinite' }} /> Loading transactions…
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '0.88rem' }}>
            {search || filter !== 'all' ? 'No transactions match your filter.' : 'No transactions yet. Book a station to get started!'}
          </div>
        ) : (
          filtered.map(txn => (
            <TxnRow key={txn.id} txn={txn} onViewReceipt={setReceipt} />
          ))
        )}
      </div>

      {receipt && <ReceiptModal txn={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}
