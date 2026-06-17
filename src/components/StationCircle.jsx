// Station data shape from sheets.js:
// { id, status, currentGame, bookedSlots, preferredGame }
// id 8 is the racing simulator (the only one with Station_Type via index)

const RACING_ID = '8'; // adjust if your sheet has a different ID for racing sim

const statusStyles = {
  available: {
    ring: '#22c55e',
    glow: 'rgba(34,197,94,0.55)',
    glowSoft: 'rgba(34,197,94,0.12)',
    bg: 'rgba(34,197,94,0.07)',
    labelColor: '#22c55e',
  },
  occupied: {
    ring: '#ef4444',
    glow: 'rgba(239,68,68,0.55)',
    glowSoft: 'rgba(239,68,68,0.12)',
    bg: 'rgba(239,68,68,0.07)',
    labelColor: '#ef4444',
  },
  racing: {
    ring: '#f59e0b',
    glow: 'rgba(245,158,11,0.55)',
    glowSoft: 'rgba(245,158,11,0.12)',
    bg: 'rgba(245,158,11,0.07)',
    labelColor: '#f59e0b',
  },
};

// Inline SVG icons — no lucide dependency issues
const ControllerIcon = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="2"/>
    <path d="M12 6v12"/>
    <path d="m8 10 2 2-2 2"/>
    <circle cx="16" cy="12" r="1"/>
  </svg>
);

const WheelIcon = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="3"/>
    <line x1="12" y1="2" x2="12" y2="9"/>
    <line x1="12" y1="15" x2="12" y2="22"/>
    <line x1="4.22" y1="4.22" x2="8.49" y2="8.49"/>
    <line x1="15.51" y1="15.51" x2="19.78" y2="19.78"/>
    <line x1="2" y1="12" x2="9" y2="12"/>
    <line x1="15" y1="12" x2="22" y2="12"/>
    <line x1="4.22" y1="19.78" x2="8.49" y2="15.51"/>
    <line x1="15.51" y1="8.49" x2="19.78" y2="4.22"/>
  </svg>
);

export default function StationCircle({ station, onClick }) {
  const isRacing = String(station.id) === RACING_ID;
  const statusKey = isRacing ? 'racing' : (station.status === 'available' ? 'available' : 'occupied');
  const s = statusStyles[statusKey];
  const dim = 72;

  return (
    <button
      onClick={() => onClick(station)}
      title={`Station ${station.id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 4,
        animation: 'fadeInUp 0.35s ease both',
      }}
    >
      <div
        style={{
          width: dim,
          height: dim,
          borderRadius: '50%',
          background: s.bg,
          border: `2px solid ${s.ring}`,
          boxShadow: `0 0 10px ${s.glow}, 0 0 28px ${s.glowSoft}, inset 0 0 16px ${s.glowSoft}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          transition: 'transform 160ms cubic-bezier(0.16,1,0.3,1), box-shadow 160ms ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.12)';
          e.currentTarget.style.boxShadow = `0 0 20px ${s.glow}, 0 0 48px ${s.glowSoft}, inset 0 0 20px ${s.glowSoft}`;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = `0 0 10px ${s.glow}, 0 0 28px ${s.glowSoft}, inset 0 0 16px ${s.glowSoft}`;
        }}
      >
        <span style={{
          fontFamily: "'Rajdhani', 'Inter', sans-serif",
          fontWeight: 700,
          fontSize: '1.35rem',
          color: '#fff',
          lineHeight: 1,
          textShadow: `0 0 10px ${s.glow}`,
        }}>
          {String(station.id).padStart(2, '0')}
        </span>
        {isRacing
          ? <WheelIcon size={13} color={s.ring} />
          : <ControllerIcon size={13} color={s.ring} />}
      </div>

      {/* Sub-label */}
      <div style={{ textAlign: 'center', lineHeight: 1.3 }}>
        <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: s.labelColor }}>
          {isRacing ? 'RACING' : (station.status === 'available' ? 'FREE' : 'IN USE')}
        </div>
        {station.status === 'occupied' && station.currentGame && (
          <div style={{
            fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)', marginTop: 1,
            maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {station.currentGame}
          </div>
        )}
      </div>
    </button>
  );
}
