import * as Dialog from '@radix-ui/react-dialog';
import { X, Clock, Gamepad2, Info, Zap } from 'lucide-react';

const statusConfig = {
  available: { color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', label: 'AVAILABLE' },
  occupied:  { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)',  label: 'OCCUPIED' },
  racing:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', label: 'RACING SIM' },
};

function parseSlots(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return String(raw).split(',').map(s => s.trim()).filter(Boolean);
}

export default function StationModal({ station, onClose }) {
  if (!station) return null;
  const isRacing = station.Station_Type === 'Racing Simulator';
  const key = isRacing ? 'racing' : (station.Status === 'available' ? 'available' : 'occupied');
  const cfg = statusConfig[key];
  const slots = parseSlots(station.Booked_Slots);

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
        <Dialog.Content style={{
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
        }}>

          {/* Colored top bar */}
          <div style={{ height: 4, background: cfg.color, borderRadius: '16px 16px 0 0' }} />

          <div style={{ padding: '28px 28px 32px' }}>

            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Big circle badge */}
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: cfg.bg,
                  border: `2px solid ${cfg.border}`,
                  boxShadow: `0 0 16px ${cfg.bg}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Rajdhani', 'Inter', sans-serif",
                  fontWeight: 700, fontSize: '1.4rem', color: '#fff',
                }}>
                  {String(station.Station_ID).padStart(2,'0')}
                </div>
                <div>
                  <Dialog.Title style={{ fontFamily: "'Rajdhani'", fontWeight: 700, fontSize: '1.25rem', color: '#fff', lineHeight: 1.2 }}>
                    {isRacing ? 'Racing Simulator' : `PS5 Station`}
                  </Dialog.Title>
                  <div style={{
                    marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '2px 10px', borderRadius: 99,
                    background: cfg.bg, border: `1px solid ${cfg.border}`,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: cfg.color }}>{cfg.label}</span>
                  </div>
                </div>
              </div>
              <Dialog.Close asChild>
                <button style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 180ms ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.1)'; e.currentTarget.style.color='#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='rgba(255,255,255,0.5)'; }}
                >
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 24 }} />

            {/* Booked Slots */}
            <section style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Clock size={14} color='rgba(255,255,255,0.4)' />
                <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Booked Slots</span>
              </div>
              {slots.length === 0 ? (
                <div style={{
                  padding: '14px 16px', borderRadius: 10,
                  background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
                  fontSize: '0.85rem', color: '#22c55e',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Zap size={14} /> No bookings — walk in anytime!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {slots.map((slot, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}>
                      <span style={{
                        minWidth: 20, height: 20, borderRadius: '50%',
                        background: cfg.bg, border: `1px solid ${cfg.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.6rem', fontWeight: 700, color: cfg.color,
                      }}>{i + 1}</span>
                      <span style={{ fontFamily: "'Rajdhani'", fontSize: '0.95rem', fontWeight: 600, color: '#e8e8f0', letterSpacing: '0.04em' }}>{slot}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Preferred Game */}
            {station.Preferred_Game && (
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Gamepad2 size={14} color='rgba(255,255,255,0.4)' />
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Preferred Game</span>
                </div>
                <div style={{
                  padding: '12px 16px', borderRadius: 10,
                  background: 'rgba(124,58,237,0.08)',
                  border: '1px solid rgba(124,58,237,0.2)',
                  fontSize: '0.9rem', fontWeight: 600, color: '#c4b5fd',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: '1.1rem' }}>🎮</span>
                  {station.Preferred_Game}
                </div>
              </section>
            )}

            {/* Current game if occupied */}
            {station.Status === 'occupied' && station.Current_Game && (
              <section style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Info size={14} color='rgba(255,255,255,0.4)' />
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Currently Playing</span>
                </div>
                <div style={{
                  padding: '12px 16px', borderRadius: 10,
                  background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.15)',
                  fontSize: '0.9rem', fontWeight: 600, color: '#fca5a5',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: '1.1rem' }}>🕹️</span>
                  {station.Current_Game}
                </div>
              </section>
            )}

          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
