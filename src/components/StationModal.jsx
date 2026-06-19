import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Clock, Gamepad2, Zap, Monitor, Loader2, Trophy, Edit3, Check } from 'lucide-react';
import useAuthStore from '../store/authStore';
import CompleteProfileModal from './CompleteProfileModal';
import { parseSlot, toAmPm, nowMinutes, getNextSlot } from '../lib/slotUtils';

/* Inject keyframes once into <head> */
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
  `;
  document.head.appendChild(s);
}

const statusConfig = {
  available: {
    color: '#22c55e', bg: 'rgba(34,197,94,0.09)',
    border: 'rgba(34,197,94,0.22)', label: 'AVAILABLE',
    glow: 'rgba(34,197,94,0.18)',
  },
  occupied: {
    color: '#ef4444', bg: 'rgba(239,68,68,0.09)',
    border: 'rgba(239,68,68,0.22)', label: 'OCCUPIED',
    glow: 'rgba(239,68,68,0.18)',
  },
  racing: {
    color: '#f59e0b', bg: 'rgba(245,158,11,0.09)',
    border: 'rgba(245,158,11,0.22)', label: 'RACING SIM',
    glow: 'rgba(245,158,11,0.18)',
  },
};

const RACING_ID = '8';

/* Skeleton row */
const Skel = ({ w = '100%', h = 14, r = 8, delay = 0 }) => (
  <div style={{
    width: w, height: h, borderRadius: r,
    background: 'linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.09) 50%,rgba(255,255,255,.04) 75%)',
    backgroundSize: '200% 100%',
    animation: `sm-shimmer 1.5s ${delay}ms ease-in-out infinite`,
  }} />
);

/** Format a parsed slot's times as AM/PM range display */
function fmtSlot(slotStr) {
  const p = parseSlot(slotStr);
  if (!p) return slotStr;
  return `${toAmPm(p.start24)} – ${toAmPm(p.end24)}`;
}

export default function StationModal({ station, onClose, onGameUpdate }) {
  const [loading, setLoading]     = useState(false);
  const [phoneGate, setPhoneGate] = useState(false);
  // Game-edit state
  const [editing, setEditing]     = useState(false);
  const [gameInput, setGameInput] = useState('');
  const [saving, setSaving]       = useState(false);
  const [saveOk, setSaveOk]       = useState(false);

  const user  = useAuthStore(s => s.user);
  const phone = useAuthStore(s => s.phone);
  const navigate = useNavigate();

  useEffect(() => { injectKeyframes(); }, []);

  /* Simulate a brief 350ms "fetch" feel when station changes */
  useEffect(() => {
    if (!station) return;
    setLoading(true);
    setEditing(false);
    setSaveOk(false);
    const t = setTimeout(() => setLoading(false), 380);
    return () => clearTimeout(t);
  }, [station?.id]);

  if (!station) return null;

  const isRacing   = String(station.id) === RACING_ID;
  const isOccupied = station.status?.toLowerCase() === 'occupied' || !!station.activeSlot;
  const key = isRacing ? 'racing' : (isOccupied ? 'occupied' : 'available');
  const cfg = statusConfig[key];

  // All future + current slots (already cleaned by scheduler on public page via refetch)
  const now = nowMinutes();
  const slots = Array.isArray(station.bookedSlots)
    ? station.bookedSlots.filter(Boolean)
    : String(station.bookedSlots ?? '').split(',').map(s => s.trim()).filter(Boolean);

  // Active slot (if any)
  const activeSlot = station.activeSlot ?? null;
  // Next upcoming slot
  const nextSlot = getNextSlot(slots, now);

  // Future slots only (not currently active, not expired)
  const futureSlots = slots.filter(s => {
    const p = parseSlot(s);
    if (!p) return false;
    return p.startMin > now;
  });

  // The game currently being played (from activeGame enrichment)
  const liveGame = station.activeGame || null;

  // Can the logged-in user edit the game?
  // They can if they are logged in (phone number is their ID)
  const canEdit = !!user && !!phone && !!activeSlot;

  const handleBook = () => {
    if (!user) { onClose(); navigate('/auth/login'); return; }
    if (!phone) { setPhoneGate(true); return; }
    /* TODO: open actual booking flow */
  };

  const handleSaveGame = async () => {
    if (!gameInput.trim() || !onGameUpdate) return;
    setSaving(true);
    try {
      await onGameUpdate(station, gameInput.trim());
      setSaveOk(true);
      setEditing(false);
      setTimeout(() => setSaveOk(false), 2500);
    } catch (e) {
      console.error('[StationModal] game update failed:', e.message);
    } finally { setSaving(false); }
  };

  return (
    <>
      <Dialog.Root open={!!station} onOpenChange={open => !open && onClose()}>
        <Dialog.Portal>

          {/* ── Overlay ── */}
          <Dialog.Overlay
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(7px)',
              WebkitBackdropFilter: 'blur(7px)',
              zIndex: 9998,
              animation: 'sm-overlay-in 0.22s ease both',
            }}
          />

          {/* ── Modal ── */}
          <Dialog.Content
            aria-describedby={undefined}
            onEscapeKeyDown={onClose}
            onPointerDownOutside={onClose}
            style={{
              position: 'fixed',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 9999,
              width: 'min(480px, calc(100vw - 2rem))',
              maxHeight: '88dvh',
              overflowY: 'auto',
              background: '#111116',
              border: `1px solid ${cfg.border}`,
              borderRadius: 18,
              boxShadow: `0 0 0 1px ${cfg.border}, 0 24px 70px rgba(0,0,0,.75), 0 0 60px ${cfg.glow}`,
              animation: 'sm-modal-in 0.28s cubic-bezier(0.34,1.56,0.64,1) both',
              outline: 'none',
            }}
          >
            {/* Animated top edge */}
            <div style={{
              height: 3, borderRadius: '18px 18px 0 0',
              background: `linear-gradient(90deg, transparent, ${cfg.color}, #a855f7, ${cfg.color}, transparent)`,
              backgroundSize: '200% 100%',
              animation: 'sm-edge 2.2s linear infinite',
            }} />

            <div style={{ padding: '22px 22px 26px' }}>

              {/* ── Header ── */}
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:18, gap:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:13 }}>
                  <div style={{
                    width:54, height:54, borderRadius:'50%', flexShrink:0,
                    background: cfg.bg, border:`2px solid ${cfg.border}`,
                    boxShadow:`0 0 18px ${cfg.glow}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontFamily:"'Rajdhani','Inter',sans-serif",
                    fontWeight:800, fontSize:'1.25rem', color:'#fff',
                  }}>
                    {loading
                      ? <Loader2 size={20} color={cfg.color} style={{ animation:'sm-spin .7s linear infinite' }} />
                      : String(station.id).padStart(2, '0')
                    }
                  </div>

                  <div>
                    <Dialog.Title style={{
                      fontFamily:"'Rajdhani','Inter',sans-serif",
                      fontWeight:700, fontSize:'1.18rem',
                      color:'#fff', lineHeight:1.2, marginBottom:5,
                    }}>
                      {isRacing ? '🏁 Racing Simulator' : `PS5 Station ${station.id}`}
                    </Dialog.Title>

                    <span style={{
                      display:'inline-flex', alignItems:'center', gap:5,
                      padding:'3px 10px', borderRadius:99,
                      background:cfg.bg, border:`1px solid ${cfg.border}`,
                    }}>
                      <span style={{
                        width:6, height:6, borderRadius:'50%',
                        background:cfg.color, display:'inline-block',
                        animation: key !== 'available' ? 'sm-pulse-dot 1.4s ease-in-out infinite' : 'none',
                      }} />
                      <span style={{ fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.1em', color:cfg.color }}>
                        {cfg.label}
                      </span>
                    </span>
                  </div>
                </div>

                <Dialog.Close asChild>
                  <button
                    aria-label="Close"
                    style={{
                      flexShrink:0, width:32, height:32, borderRadius:8,
                      background:'rgba(255,255,255,0.05)',
                      border:'1px solid rgba(255,255,255,0.09)',
                      color:'rgba(255,255,255,0.4)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      cursor:'pointer', transition:'background .15s, color .15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.12)'; e.currentTarget.style.color='#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.05)'; e.currentTarget.style.color='rgba(255,255,255,.4)'; }}
                  >
                    <X size={15} />
                  </button>
                </Dialog.Close>
              </div>

              <div style={{ height:1, background:'rgba(255,255,255,0.06)', marginBottom:18 }} />

              {loading ? (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <Skel w="45%" h={11} delay={0} />
                  <Skel h={44} r={10} delay={60} />
                  <Skel h={44} r={10} delay={120} />
                  <div style={{ height:1, background:'rgba(255,255,255,.05)', margin:'4px 0' }} />
                  <Skel w="50%" h={11} delay={0} />
                  <Skel h={44} r={10} delay={60} />
                </div>
              ) : (
                <>
                  {/* ── LIVE NOW banner ── */}
                  {activeSlot && (
                    <div style={{
                      display:'flex', alignItems:'center', gap:10,
                      padding:'10px 14px', borderRadius:10, marginBottom:16,
                      background:'rgba(239,68,68,0.1)',
                      border:'1px solid rgba(239,68,68,0.28)',
                      animation:'sm-slot-in 0.25s ease both',
                    }}>
                      {/* Pulsing live dot */}
                      <span style={{ position:'relative', width:10, height:10, flexShrink:0 }}>
                        <span style={{
                          position:'absolute', inset:0, borderRadius:'50%',
                          background:'#ef4444',
                          animation:'sm-live-ping 1.4s ease-in-out infinite',
                        }} />
                        <span style={{
                          position:'absolute', inset:2, borderRadius:'50%',
                          background:'#ef4444',
                        }} />
                      </span>
                      <div>
                        <div style={{ fontSize:'0.68rem', fontWeight:700, color:'#f87171', letterSpacing:'0.1em' }}>
                          LIVE NOW · {toAmPm(activeSlot.start24)} – {toAmPm(activeSlot.end24)}
                        </div>
                        {liveGame && (
                          <div style={{ fontSize:'0.82rem', color:'#fca5a5', marginTop:2 }}>
                            🎮 {liveGame}
                          </div>
                        )}
                      </div>

                      {/* Edit game button (logged-in booker only) */}
                      {canEdit && !editing && (
                        <button
                          onClick={() => { setGameInput(liveGame ?? ''); setEditing(true); }}
                          title="Update current game"
                          style={{
                            marginLeft:'auto', display:'flex', alignItems:'center', gap:5,
                            padding:'4px 10px', borderRadius:7,
                            background:'rgba(255,255,255,0.06)',
                            border:'1px solid rgba(255,255,255,0.12)',
                            color:'rgba(255,255,255,0.6)', fontSize:'0.7rem',
                            cursor:'pointer', whiteSpace:'nowrap',
                          }}
                        >
                          <Edit3 size={11} /> Change game
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── Inline game editor ── */}
                  {editing && (
                    <div style={{
                      display:'flex', gap:7, marginBottom:14,
                      animation:'sm-slot-in 0.2s ease both',
                    }}>
                      <input
                        autoFocus
                        value={gameInput}
                        onChange={e => setGameInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveGame(); if (e.key === 'Escape') setEditing(false); }}
                        placeholder="Enter game name…"
                        style={{
                          flex:1, padding:'8px 12px', borderRadius:8,
                          background:'rgba(255,255,255,0.06)',
                          border:'1px solid rgba(255,255,255,0.14)',
                          color:'#fff', fontSize:'0.85rem', outline:'none',
                        }}
                      />
                      <button
                        onClick={handleSaveGame}
                        disabled={saving || !gameInput.trim()}
                        style={{
                          padding:'8px 14px', borderRadius:8,
                          background: saveOk ? '#22c55e' : '#7c3aed',
                          border:'none', color:'#fff', cursor:'pointer',
                          display:'flex', alignItems:'center', gap:5,
                          fontSize:'0.8rem', fontWeight:600,
                          opacity: saving ? 0.7 : 1,
                        }}
                      >
                        {saving
                          ? <Loader2 size={13} style={{ animation:'sm-spin .7s linear infinite' }} />
                          : saveOk ? <Check size={13} /> : <Check size={13} />
                        }
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditing(false)}
                        style={{
                          padding:'8px 12px', borderRadius:8,
                          background:'rgba(255,255,255,0.05)',
                          border:'1px solid rgba(255,255,255,0.1)',
                          color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:'0.8rem',
                        }}
                      >✕</button>
                    </div>
                  )}

                  {/* ── Upcoming Slots ── */}
                  <div style={{ marginBottom:18 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
                      <Clock size={13} color="rgba(255,255,255,0.35)" />
                      <span style={{
                        fontSize:'0.63rem', fontWeight:700,
                        letterSpacing:'0.13em', textTransform:'uppercase',
                        color:'rgba(255,255,255,0.35)',
                      }}>Upcoming Slots</span>
                    </div>

                    {futureSlots.length === 0 ? (
                      <div style={{
                        padding:'12px 14px', borderRadius:10,
                        background:'rgba(34,197,94,0.07)',
                        border:'1px solid rgba(34,197,94,0.16)',
                        fontSize:'0.83rem', color:'#4ade80',
                        display:'flex', alignItems:'center', gap:8,
                      }}>
                        <Zap size={14} />
                        {slots.length === 0 ? 'No bookings — walk in anytime!' : 'No more slots today'}
                      </div>
                    ) : (
                      <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                        {futureSlots.map((slot, i) => (
                          <div
                            key={i}
                            style={{
                              display:'flex', alignItems:'center', gap:11,
                              padding:'10px 13px', borderRadius:10,
                              background:'rgba(255,255,255,0.03)',
                              border:'1px solid rgba(255,255,255,0.07)',
                              animation:`sm-slot-in 0.25s ${i*60}ms ease both`,
                            }}
                          >
                            <span style={{
                              width:22, height:22, borderRadius:'50%', flexShrink:0,
                              background:cfg.bg, border:`1px solid ${cfg.border}`,
                              display:'flex', alignItems:'center', justifyContent:'center',
                              fontSize:'0.6rem', fontWeight:700, color:cfg.color,
                            }}>{i+1}</span>
                            <span style={{
                              fontFamily:"'Rajdhani','Inter',sans-serif",
                              fontSize:'0.92rem', fontWeight:600,
                              color:'#e8e8f0', letterSpacing:'0.03em',
                            }}>{fmtSlot(slot)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Currently Playing (from Sheets, no active slot) ── */}
                  {!activeSlot && station.currentGame && (
                    <div style={{ marginBottom: station.preferredGame ? 16 : 0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
                        <Monitor size={13} color="rgba(255,255,255,0.35)" />
                        <span style={{
                          fontSize:'0.63rem', fontWeight:700,
                          letterSpacing:'0.13em', textTransform:'uppercase',
                          color:'rgba(255,255,255,0.35)',
                        }}>Currently Playing</span>
                      </div>
                      <div style={{
                        padding:'11px 14px', borderRadius:10,
                        background:'rgba(239,68,68,0.07)',
                        border:'1px solid rgba(239,68,68,0.18)',
                        fontSize:'0.88rem', fontWeight:600, color:'#fca5a5',
                        display:'flex', alignItems:'center