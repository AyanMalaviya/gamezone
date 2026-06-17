import * as Dialog from '@radix-ui/react-dialog';
import { X, Clock, Gamepad2, Zap, Monitor } from 'lucide-react';

const statusConfig = {
  available: { color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)', label: 'AVAILABLE' },
  occupied:  { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)',  label: 'OCCUPIED'  },
  racing:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', label: 'RACING SIM' },
};

const RACING_ID = '8';

export default function StationModal({ station, onClose }) {
  if (!station) return null;

  const isRacing = String(station.id) === RACING_ID;
  const key = isRacing ? 'racing' : (station.status === 'available' ? 'available' : 'occupied');
  const cfg = statusConfig[key];

  // bookedSlots comes as array already parsed by sheets.js
  const slots = Array.isArray(station.bookedSlots)
    ? station.bookedSlots.filter(Boolean)
    : String(station.bookedSlots ?? '').split(',').map(s => s.trim()).filter(Boolean);

  return (
    <Dialog.Root open={!!station} onOpenChange={open => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(6px)',
          zIndex: 50,
          animation: 'fadeInUp 0.15s ease',
        }} />

        <Dialog.Content
          aria-describedby={undefined}
          style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            background: '#131318',
            border: `1px solid ${cfg.border}`,
            borderRadius: 16,
            width: 'min(460px, calc(100vw - 2rem))',
            maxHeight: '85dvh',
            overflowY: 'auto',
            zIndex: 51,
            boxShadow: `0 0 40px ${cfg.bg}, 0 24px 64px rgba(0,0,0,0.7)`,
            animation: 'fadeInUp 0.2s ease',
          }}
        >
          {/* Color bar */}
          <div style={{ height: 4, background: cfg.color, borderRadius: '16px 16px 0 0' }} />

          <div style={{ padding: '24px 24px 28px' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Mini circle */}
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: cfg.bg, border: `2px solid ${cfg.border}`,
                  boxShadow: `0 0 14px ${cfg.bg}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Rajdhani', 'Inter', sans-serif",
                  fontWeight: 700, fontSize: '1.3rem', color: '#fff',
                }}>
                  {String(station.id).padStart(2, '0')}
                </div>
                <div>
                  <Dialog.Title style={{
                    fontFamily: "'Rajdhani', 'Inter', sans-serif",
                    fontWeight: 700, fontSize: '1.2rem', color: '#fff', lineHeight: 1.2,
                  }}>
                    {isRacing ? 'Racing Simulator' : `PS5 Station ${station.id}`}
                  </Dialog.Title>
                  {/* Status badge */}
                  <span style={{
                    marginTop: 5, display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '2px 10px', borderRadius: 99,
                    background: cfg.bg, border: `1px solid ${cfg.border}`,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: cfg.color }}>{cfg.label}</span>
                  </span>
                </div>
              </div>

              {/* Close */}
              <Dialog.Close asChild>
                <button
                  style={{
                    width: 30, height: 30, borderRadius: 7,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.45)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 150ms ease', flexShrink: 0,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
                >
                  <X size={15} />
                </button>
              </Dialog.Close>
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 20 }} />

            {/* Booked Slots */}
            <div style={{ marginBottom: slots.length || station.currentGame ? 20 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                <Clock size={13} color='rgba(255,255,255,0.35)' />
                <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Booked Slots</span>
              </div>

              {slots.length === 0 ? (
                <div style={{
                  padding: '12px 14px', borderRadius: 10,
                  background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.14)',
                  fontSize: '0.83rem', color: '#4ade80',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Zap size={14} /> No bookings — walk in anytime!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {slots.map((slot, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 13px', borderRadius: 9,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        background: cfg.bg, border: `1px solid ${cfg.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.58rem', fontWeight: 700, color: cfg.color,
                      }}>{i + 1}</span>
                      <span style={{
                        fontFamily: "'Rajdhani', 'Inter', sans-serif",
                        fontSize: '0.92rem', fontWeight: 600,
                        color: '#e8e8f0', letterSpacing: '0.03em',
                      }}>{slot}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Currently Playing */}
            {station.currentGame && (
              <div style={{ marginBottom: station.preferredGame ? 16 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                  <Monitor size={13} color='rgba(255,255,255,0.35)' />
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Currently Playing</span>
                </div>
                <div style={{
                  padding: '11px 14px', borderRadius: 10,
                  background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                  fontSize: '0.88rem', fontWeight: 600, color: '#fca5a5',
                  display: 'flex', alignItems: 'center', gap: 9,
                }}>
                  <span style={{ fontSize: '1rem' }}>🎮</span> {station.currentGame}
                </div>
              </div>
            )}

            {/* Preferred Game */}
            {station.preferredGame && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                  <Gamepad2 size={13} color='rgba(255,255,255,0.35)' />
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Preferred Game</span>
                </div>
                <div style={{
                  padding: '11px 14px', borderRadius: 10,
                  background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.18)',
                  fontSize: '0.88rem', fontWeight: 600, color: '#c4b5fd',
                  display: 'flex', alignItems: 'center', gap: 9,
                }}>
                  <span style={{ fontSize: '1rem' }}>⭐</span> {station.preferredGame}
                </div>
              </div>
            )}

          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
