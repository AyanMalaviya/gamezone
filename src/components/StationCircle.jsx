import { Gamepad2, Steering } from 'lucide-react';

const statusStyles = {
  available: {
    ring: '#22c55e',
    glow: 'rgba(34,197,94,0.6)',
    glowSoft: 'rgba(34,197,94,0.15)',
    bg: 'rgba(34,197,94,0.08)',
    label: '#22c55e',
    text: 'AVAILABLE',
  },
  occupied: {
    ring: '#ef4444',
    glow: 'rgba(239,68,68,0.6)',
    glowSoft: 'rgba(239,68,68,0.15)',
    bg: 'rgba(239,68,68,0.08)',
    label: '#ef4444',
    text: 'OCCUPIED',
  },
  racing: {
    ring: '#f59e0b',
    glow: 'rgba(245,158,11,0.6)',
    glowSoft: 'rgba(245,158,11,0.15)',
    bg: 'rgba(245,158,11,0.08)',
    label: '#f59e0b',
    text: 'RACING SIM',
  },
};

export default function StationCircle({ station, onClick, size = 'md' }) {
  const isRacing = station.Station_Type === 'Racing Simulator';
  const key = isRacing ? 'racing' : (station.Status === 'available' ? 'available' : 'occupied');
  const s = statusStyles[key];

  const dim = size === 'lg' ? 110 : 88;
  const fontSize = size === 'lg' ? '2rem' : '1.6rem';
  const iconSize = size === 'lg' ? 18 : 14;

  return (
    <button
      onClick={() => onClick(station)}
      title={`Station ${station.Station_ID} — ${s.text}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
        animation: 'fadeInUp 0.4s ease both',
      }}
    >
      {/* Circle */}
      <div style={{
        width: dim,
        height: dim,
        borderRadius: '50%',
        background: s.bg,
        border: `2.5px solid ${s.ring}`,
        boxShadow: `0 0 12px ${s.glow}, 0 0 32px ${s.glowSoft}, inset 0 0 20px ${s.glowSoft}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        transition: 'transform 180ms cubic-bezier(0.16,1,0.3,1), box-shadow 180ms ease',
        position: 'relative',
        animation: `pulse-${key} 3s ease-in-out infinite`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'scale(1.1)';
        e.currentTarget.style.boxShadow = `0 0 24px ${s.glow}, 0 0 56px ${s.glowSoft}, inset 0 0 24px ${s.glowSoft}`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = `0 0 12px ${s.glow}, 0 0 32px ${s.glowSoft}, inset 0 0 20px ${s.glowSoft}`;
      }}
      >
        {/* Station number */}
        <span style={{
          fontFamily: "'Rajdhani', 'Inter', sans-serif",
          fontWeight: 700,
          fontSize,
          color: '#ffffff',
          lineHeight: 1,
          textShadow: `0 0 12px ${s.glow}`,
        }}>
          {String(station.Station_ID).padStart(2, '0')}
        </span>

        {/* Icon */}
        {isRacing
          ? <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={s.ring} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="9"/><line x1="12" y1="15" x2="12" y2="22"/><line x1="2" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="22" y2="12"/></svg>
          : <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={s.ring} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 6v12"/><path d="m8 10 2 2-2 2"/><circle cx="16" cy="12" r="1"/></svg>
        }
      </div>

      {/* Label below */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: '0.65rem',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: s.label,
        }}>
          {isRacing ? 'RACING' : `PS5 #${station.Station_ID}`}
        </div>
        {station.Status === 'occupied' && station.Current_Game && (
          <div style={{
            fontSize: '0.6rem',
            color: 'rgba(255,255,255,0.4)',
            marginTop: 2,
            maxWidth: 90,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {station.Current_Game}
          </div>
        )}
      </div>
    </button>
  );
}
