import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Clock, Gamepad2, Zap, Monitor, Loader2, Edit3, Check, CreditCard, ChevronLeft, CalendarClock } from 'lucide-react';
import useAuthStore from '../store/authStore';
import usePaymentStore from '../store/paymentStore';
import CompleteProfileModal from './CompleteProfileModal';
import { parseSlot, toAmPm, nowMinutes, generateStartTimes, minutesToHHMM } from '../lib/slotUtils';

const STYLE_ID = 'sm-keyframes';
function injectKeyframes() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    @keyframes sm-overlay-in  { from{opacity:0}          to{opacity:1} }
    @keyframes sm-overlay-out { from{opacity:1}          to{opacity:0} }
    @keyframes sm-modal-in    { from{opacity:0;transform:translate(-50%,-50%) scale(.93) translateY(12px)} to{opacity:1;transform:translate(-50%,-50%) scale(1) translateY(0)} }
    @keyframes sm-modal-out   { from{opacity:1;transform:translate(-50%,-50%) scale(1) translateY(0)}   to{opacity:0;transform:translate(-50%,-50%) scale(.93) translateY(12px)} }
    @keyframes sm-spin        { to{transform:rotate(360deg)} }
    @keyframes sm-edge        { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }
    @keyframes sm-slot-in     { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
    @keyframes sm-pulse-dot   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.7)} }
    @keyframes sm-shimmer     { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
    @keyframes sm-live-ping   { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.45);opacity:0.4} }
    @keyframes sm-fade-up     { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  `;
  document.head.appendChild(s);
}

const statusConfig = {
  available: { color: '#22c55e', bg: 'rgba(34,197,94,0.09)',  border: 'rgba(34,197,94,0.22)',  label: 'AVAILABLE',  glow: 'rgba(34,197,94,0.18)'  },
  occupied:  { color: '#ef4444', bg: 'rgba(239,68,68,0.09)',  border: 'rgba(239,68,68,0.22)',  label: 'OCCUPIED',   glow: 'rgba(239,68,68,0.18)'  },
  racing:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.09)', border: 'rgba(245,158,11,0.22)', label: 'RACING SIM', glow: 'rgba(245,158,11,0.18)' },
};

const isRacingStation = (s) =>
  String(s?.id) === '8' || String(s?.stationType).toLowerCase() === 'racing';

const PRICE_RACING    = 250;
const PRICE_PS5       = 100;
const MAX_HOURS_RACING = 2;
const MAX_HOURS_PS5    = 4;

const Skel = ({ w = '100%', h = 14, r = 8, delay = 0 }) => (
  <div style={{
    width: w, height: h, borderRadius: r,
    background: 'linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.09) 50%,rgba(255,255,255,.04) 75%)',
    backgroundSize: '200% 100%',
    animation: `sm-shimmer 1.5s ${delay}ms ease-in-out infinite`,
  }} />
);

function fmtSlot(slotStr) {
  const p = parseSlot(slotStr);
  if (!p) return slotStr;
  return `${toAmPm(p.start24)} – ${toAmPm(p.end24)}`;
}

function getDisplayName(station, isRacing) {
  if (station.stationName) return station.stationName;
  if (isRacing) return 'Racing Simulator';
  return `PS5 Station ${String(station.id).padStart(2, '0')}`;
}

function colorRgb(cfg) {
  if (cfg.color === '#22c55e') return '34,197,94';
  if (cfg.color === '#f59e0b') return '245,158,11';
  return '124,58,237';
}

/* Step 1 - Pick Start Time */
function StartTimePicker({ startTimes, cfg, onSelect, onBack }) {
  const [hovered, setHovered] = useState(null);
  const rgb = colorRgb(cfg);

  return (
    <div style={{ animation: 'sm-fade-up 0.22s ease both' }}>
      <button onClick={onBack} style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
        fontSize: '0.75rem', cursor: 'pointer', marginBottom: 16, padding: 0,
      }}
        onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,.75)'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.4)'}
      >
        <ChevronLeft size={14} /> Back
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <CalendarClock size={15} color={cfg.color} />
        <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
          Step 1 — Choose Start Time
        </span>
      </div>

      {startTimes.length === 0 ? (
        <div style={{ padding: '18px 14px', borderRadius: 10, textAlign: 'center', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', fontSize: '0.85rem', color: 'rgba(239,68,68,0.75)' }}>
          No available slots for today. Come back tomorrow!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto', paddingRight: 2 }}>
          {startTimes.map((st, i) => (
            <button
              key={st.start24}
              onClick={() => onSelect(st)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                animation: `sm-slot-in 0.2s ${i * 40}ms ease both`,
                background: hovered === i ? `rgba(${rgb},0.14)` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${hovered === i ? cfg.border : 'rgba(255,255,255,0.08)'}`,
                transition: 'background .15s, border .15s',
                width: '100%', textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }} />
                <span style={{ fontFamily: "'Rajdhani','Inter',sans-serif", fontSize: '0.95rem', fontWeight: 600, color: '#e8e8f0', letterSpacing: '0.03em' }}>
                  {st.label}
                </span>
              </div>
              <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', color: cfg.color, background: `rgba(${rgb},0.12)`, padding: '2px 8px', borderRadius: 5 }}>SELECT</span>
            </button>
          ))}
        </div>
      )}
      <p style={{ marginTop: 12, fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>All times in IST</p>
    </div>
  );
}

/* Step 2 - Pick Duration */
function DurationPicker({ startTime, cfg, ratePerHour, maxHours, onConfirm, onBack }) {
  const closeMin  = 24 * 60;
  // Max hours = min(maxHours, hours left before close, first blocked offset)
  const maxFromClose = Math.floor((closeMin - startTime.startMin) / 60);
  let cap = Math.min(maxHours, maxFromClose);

  // Find first blocked 60-min chunk: any 10-min segment within [offset*60, offset*60+60)
  // being blocked means we can't go past that hour
  for (let h = 0; h < cap; h++) {
    // offsets in terms of 10-min steps: [h*6 .. h*6+5]
    let hourBlocked = false;
    for (let step = h * 6; step < (h + 1) * 6; step++) {
      if (startTime.blockedOffsets.has(step)) { hourBlocked = true; break; }
    }
    if (hourBlocked) { cap = h; break; }
  }

  const durations = Array.from({ length: cap }, (_, i) => i + 1);
  const [selected, setSelected] = useState(Math.min(1, cap));

  // Re-clamp selected if cap changed
  const safeSel   = Math.min(selected, cap);
  const endMin    = startTime.startMin + safeSel * 60;
  const end24     = minutesToHHMM(endMin);
  const totalAmt  = safeSel * ratePerHour;
  const slotValue = `${startTime.start24}-${end24}`;

  if (cap === 0) return (
    <div style={{ padding: '18px 14px', borderRadius: 10, textAlign: 'center', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', fontSize: '0.85rem', color: 'rgba(239,68,68,0.75)', animation: 'sm-fade-up .2s ease both' }}>
      No duration available from this start time. Choose a different start.
    </div>
  );

  return (
    <div style={{ animation: 'sm-fade-up 0.22s ease both' }}>
      <button onClick={onBack} style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
        fontSize: '0.75rem', cursor: 'pointer', marginBottom: 16, padding: 0,
      }}
        onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,.75)'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.4)'}
      >
        <ChevronLeft size={14} /> Change start time
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <CalendarClock size={15} color={cfg.color} />
        <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
          Step 2 — Choose Duration
        </span>
      </div>

      <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>START</span>
        <span style={{ fontFamily: "'Rajdhani','Inter',sans-serif", fontWeight: 700, fontSize: '1rem', color: cfg.color }}>{startTime.label}</span>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        {durations.map(d => (
          <button
            key={d}
            onClick={() => setSelected(d)}
            style={{
              flex: 1, minWidth: 60, padding: '14px 0', borderRadius: 10,
              border: `1.5px solid ${safeSel === d ? cfg.border : 'rgba(255,255,255,0.08)'}`,
              background: safeSel === d ? `rgba(${colorRgb(cfg)},0.2)` : 'rgba(255,255,255,0.05)',
              color: safeSel === d ? cfg.color : 'rgba(255,255,255,0.45)',
              cursor: 'pointer', transition: 'all .15s',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}
          >
            <span style={{ fontFamily: "'Rajdhani','Inter',sans-serif", fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}>{d}</span>
            <span style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.08em' }}>{d === 1 ? 'HOUR' : 'HRS'}</span>
          </button>
        ))}
      </div>

      <div style={{ padding: '12px 14px', borderRadius: 10, marginBottom: 18, background: `rgba(${colorRgb(cfg)},0.06)`, border: `1px solid ${cfg.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>SESSION</span>
          <span style={{ fontFamily: "'Rajdhani','Inter',sans-serif", fontWeight: 700, color: '#e2e8f0', fontSize: '0.9rem' }}>
            {startTime.label} – {toAmPm(end24)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>TOTAL</span>
          <span style={{ fontFamily: "'Rajdhani','Inter',sans-serif", fontWeight: 800, color: cfg.color, fontSize: '1.3rem' }}>
            ₹{totalAmt}
          </span>
        </div>
        <div style={{ marginTop: 4, fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)' }}>
          ₹{ratePerHour}/hr × {safeSel} hr{safeSel > 1 ? 's' : ''}
        </div>
      </div>

      <button
        onClick={() => onConfirm({ slotValue, totalAmt, hours: safeSel, endLabel: toAmPm(end24) })}
        style={{
          width: '100%', padding: '13px', borderRadius: 11, border: 'none',
          background: cfg.color === '#f59e0b'
            ? 'linear-gradient(135deg,#d97706,#f59e0b)'
            : 'linear-gradient(135deg,#7c3aed,#a855f7)',
          color: '#fff', fontSize: '0.95rem', fontWeight: 700,
          cursor: 'pointer', letterSpacing: '0.04em',
          fontFamily: "'Rajdhani','Inter',sans-serif",
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: cfg.color === '#f59e0b' ? '0 4px 20px rgba(217,119,6,0.35)' : '0 4px 20px rgba(124,58,237,0.35)',
          transition: 'opacity .15s, transform .15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        <CreditCard size={16} /> Book & Pay ₹{totalAmt} via UPI
      </button>
    </div>
  );
}

export default function StationModal({ station, stationIndex, onClose, onGameUpdate }) {
  const [loading, setLoading]     = useState(false);
  const [phoneGate, setPhoneGate] = useState(false);
  const [editing, setEditing]     = useState(false);
  const [gameInput, setGameInput] = useState('');
  const [saving, setSaving]       = useState(false);
  const [saveOk, setSaveOk]       = useState(false);
  const [view, setView]           = useState('info');
  const [selectedStart, setSelectedStart] = useState(null);

  const user     = useAuthStore(s => s.user);
  const phone    = useAuthStore(s => s.phone);
  const navigate = useNavigate();
  const openPayment = usePaymentStore(s => s.openPayment);

  useEffect(() => { injectKeyframes(); }, []);
  useEffect(() => {
    if (!station) return;
    setLoading(true);
    setEditing(false);
    setSaveOk(false);
    setView('info');
    setSelectedStart(null);
    const t = setTimeout(() => setLoading(false), 380);
    return () => clearTimeout(t);
  }, [station?.id]);

  if (!station) return null;

  const isRacing   = isRacingStation(station);
  const isOccupied = station.status?.toLowerCase() === 'occupied' || !!station.activeSlot;
  const key        = isRacing ? 'racing' : (isOccupied ? 'occupied' : 'available');
  const cfg        = statusConfig[key];
  const displayName = getDisplayName(station, isRacing);
  const ratePerHour = isRacing ? PRICE_RACING : PRICE_PS5;
  const maxHours    = isRacing ? MAX_HOURS_RACING : MAX_HOURS_PS5;

  const now        = nowMinutes();
  const slots = Array.isArray(station.bookedSlots)
    ? station.bookedSlots.filter(Boolean)
    : String(station.bookedSlots ?? '').split(',').map(s => s.trim()).filter(Boolean);

  const activeSlot  = station.activeSlot ?? null;
  const futureSlots = slots.filter(s => { const p = parseSlot(s); return p && p.startMin > now; });
  const liveGame    = station.activeGame || null;
  const canEdit     = !!user && !!phone && !!activeSlot;
  const startTimes  = generateStartTimes(slots);

  const handleBookClick = () => {
    if (!user) { onClose(); navigate('/auth/login'); return; }
    if (!phone) { setPhoneGate(true); return; }
    setView('start');
  };

  const handleStartSelected = (st) => {
    setSelectedStart(st);
    setView('duration');
  };

  const handleConfirmBooking = ({ slotValue, totalAmt, hours }) => {
    // stationIndex is passed from StationLayout via handleSelect —
    // it is the SORTED array index (0-based), which matches the Sheets row offset.
    // Fallback to Number(station.id)-1 only when stationIndex is genuinely absent.
    const resolvedIndex = stationIndex != null ? Number(stationIndex) : Number(station.id) - 1;

    openPayment({
      type:   'booking',
      label:  `${displayName} — ${hours} hr${hours > 1 ? 's' : ''}`,
      amount: totalAmt,
      meta: {
        uid:           user?.uid ?? null,
        stationId:     station.id,
        stationName:   displayName,
        stationIndex:  resolvedIndex,
        stationType:   station.stationType || (isRacing ? 'racing' : 'ps5'),
        slot:          slotValue,
        hours,
        game:          station.preferredGame || station.currentGame || '',
        currentGame:   station.currentGame   || '',
        preferredGame: station.preferredGame  || '',
        currentStatus: station.status         || 'available',
        activeSlot:    station.activeSlot      ?? null,
        bookedSlots:   slots,
        isRacing,
      },
    });
    onClose();
  };

  const handleSaveGame = async () => {
    if (!gameInput.trim() || !onGameUpdate) return;
    setSaving(true);
    try {
      await onGameUpdate(station, gameInput.trim());
      setSaveOk(true); setEditing(false);
      setTimeout(() => setSaveOk(false), 2500);
    } catch (e) {
      console.error('[StationModal] game update failed:', e.message);
    } finally { setSaving(false); }
  };

  return (
    <>
      <Dialog.Root open={!!station} onOpenChange={open => !open && onClose()}>
        <Dialog.Portal>
          <Dialog.Overlay style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)',
            zIndex: 9998, animation: 'sm-overlay-in 0.22s ease both',
          }} />
          <Dialog.Content
            aria-describedby={undefined}
            onEscapeKeyDown={onClose}
            onPointerDownOutside={onClose}
            style={{
              position: 'fixed', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 9999, width: 'min(480px, calc(100vw - 2rem))',
              maxHeight: '88dvh', overflowY: 'auto',
              background: '#111116', border: `1px solid ${cfg.border}`, borderRadius: 18,
              boxShadow: `0 0 0 1px ${cfg.border}, 0 24px 70px rgba(0,0,0,.75), 0 0 60px ${cfg.glow}`,
              animation: 'sm-modal-in 0.28s cubic-bezier(0.34,1.56,0.64,1) both',
              outline: 'none',
            }}
          >
            <div style={{ height: 3, borderRadius: '18px 18px 0 0', background: `linear-gradient(90deg, transparent, ${cfg.color}, #a855f7, ${cfg.color}, transparent)`, backgroundSize: '200% 100%', animation: 'sm-edge 2.2s linear infinite' }} />
            <div style={{ padding: '22px 22px 26px' }}>

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                  <div style={{ width: 54, height: 54, borderRadius: '50%', flexShrink: 0, background: cfg.bg, border: `2px solid ${cfg.border}`, boxShadow: `0 0 18px ${cfg.glow}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Rajdhani','Inter',sans-serif", fontWeight: 800, fontSize: '1.25rem', color: '#fff' }}>
                    {loading ? <Loader2 size={20} color={cfg.color} style={{ animation: 'sm-spin .7s linear infinite' }} /> : String(station.id).padStart(2, '0')}
                  </div>
                  <div>
                    <Dialog.Title style={{ fontFamily: "'Rajdhani','Inter',sans-serif", fontWeight: 700, fontSize: '1.18rem', color: '#fff', lineHeight: 1.2, marginBottom: 5 }}>
                      {isRacing ? '🏁 Racing Simulator' : displayName}
                    </Dialog.Title>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, display: 'inline-block', animation: key !== 'available' ? 'sm-pulse-dot 1.4s ease-in-out infinite' : 'none' }} />
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: cfg.color }}>{cfg.label}</span>
                    </span>
                  </div>
                </div>
                <Dialog.Close asChild>
                  <button aria-label="Close" style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background .15s, color .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.12)'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.05)'; e.currentTarget.style.color = 'rgba(255,255,255,.4)'; }}
                  ><X size={15} /></button>
                </Dialog.Close>
              </div>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 18 }} />

              {(view === 'info' || view === 'start') && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 99, padding: '3px 10px' }}>
                    ₹{ratePerHour}/hr · max {maxHours} hr{maxHours > 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {view === 'start' && (
                <StartTimePicker startTimes={startTimes} cfg={cfg} onSelect={handleStartSelected} onBack={() => setView('info')} />
              )}
              {view === 'duration' && selectedStart && (
                <DurationPicker
                  startTime={selectedStart}
                  cfg={cfg}
                  ratePerHour={ratePerHour}
                  maxHours={maxHours}
                  onConfirm={handleConfirmBooking}
                  onBack={() => setView('start')}
                />
              )}

              {view === 'info' && (
                loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Skel w="45%" h={11} delay={0} />
                    <Skel h={44} r={10} delay={60} />
                    <Skel h={44} r={10} delay={120} />
                    <div style={{ height: 1, background: 'rgba(255,255,255,.05)', margin: '4px 0' }} />
                    <Skel w="50%" h={11} delay={0} />
                    <Skel h={44} r={10} delay={60} />
                  </div>
                ) : (
                  <>
                    {activeSlot && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, marginBottom: 16, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.28)', animation: 'sm-slot-in 0.25s ease both' }}>
                        <span style={{ position: 'relative', width: 10, height: 10, flexShrink: 0 }}>
                          <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#ef4444', animation: 'sm-live-ping 1.4s ease-in-out infinite' }} />
                          <span style={{ position: 'absolute', inset: 2, borderRadius: '50%', background: '#ef4444' }} />
                        </span>
                        <div>
                          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#f87171', letterSpacing: '0.1em' }}>
                            LIVE NOW · {toAmPm(activeSlot.start24)} – {toAmPm(activeSlot.end24)}
                          </div>
                          {liveGame && <div style={{ fontSize: '0.82rem', color: '#fca5a5', marginTop: 2 }}>🎮 {liveGame}</div>}
                        </div>
                        {canEdit && !editing && (
                          <button onClick={() => { setGameInput(liveGame ?? ''); setEditing(true); }} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            <Edit3 size={11} /> Change game
                          </button>
                        )}
                      </div>
                    )}

                    {editing && (
                      <div style={{ display: 'flex', gap: 7, marginBottom: 14, animation: 'sm-slot-in 0.2s ease both' }}>
                        <input autoFocus value={gameInput} onChange={e => setGameInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSaveGame(); if (e.key === 'Escape') setEditing(false); }} placeholder="Enter game name…" style={{ flex: 1, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', color: '#fff', fontSize: '0.85rem', outline: 'none' }} />
                        <button onClick={handleSaveGame} disabled={saving || !gameInput.trim()} style={{ padding: '8px 14px', borderRadius: 8, background: saveOk ? '#22c55e' : '#7c3aed', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                          {saving ? <Loader2 size={13} style={{ animation: 'sm-spin .7s linear infinite' }} /> : <Check size={13} />}
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={() => setEditing(false)} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                      </div>
                    )}

                    <div style={{ marginBottom: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                        <Clock size={13} color="rgba(255,255,255,0.35)" />
                        <span style={{ fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Upcoming Bookings</span>
                      </div>
                      {futureSlots.length === 0 ? (
                        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.16)', fontSize: '0.83rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Zap size={14} /> {slots.length === 0 ? 'No bookings — walk in anytime!' : 'No more bookings today'}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                          {futureSlots.map((slot, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 13px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', animation: `sm-slot-in 0.25s ${i * 60}ms ease both` }}>
                              <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: cfg.color }}>{i + 1}</span>
                              <span style={{ fontFamily: "'Rajdhani','Inter',sans-serif", fontSize: '0.92rem', fontWeight: 600, color: '#e8e8f0', letterSpacing: '0.03em' }}>{fmtSlot(slot)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {!activeSlot && station.currentGame && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                          <Monitor size={13} color="rgba(255,255,255,0.35)" />
                          <span style={{ fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Currently Playing</span>
                        </div>
                        <div style={{ padding: '11px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', fontSize: '0.88rem', fontWeight: 600, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Gamepad2 size={14} />{station.currentGame}
                        </div>
                      </div>
                    )}

                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '16px 0' }} />

                    {!isOccupied && (
                      <button onClick={handleBookClick} style={{ width: '100%', padding: '13px', borderRadius: 11, border: 'none', background: isRacing ? 'linear-gradient(135deg,#d97706,#f59e0b)' : 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em', fontFamily: "'Rajdhani','Inter',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: isRacing ? '0 4px 20px rgba(217,119,6,0.35)' : '0 4px 20px rgba(124,58,237,0.35)', transition: 'opacity .15s, transform .15s' }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
                      >
                        <CreditCard size={16} /> Book & Pay ₹{ratePerHour}/hr via UPI
                      </button>
                    )}

                    {isOccupied && (
                      <div style={{ padding: '11px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.16)', fontSize: '0.82rem', color: 'rgba(239,68,68,0.75)', textAlign: 'center' }}>
                        Station is currently occupied. Check back soon!
                      </div>
                    )}
                  </>
                )
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {phoneGate && (
        <CompleteProfileModal open={phoneGate} onClose={() => setPhoneGate(false)} onSuccess={() => setPhoneGate(false)} />
      )}
    </>
  );
}
