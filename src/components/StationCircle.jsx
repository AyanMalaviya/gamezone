/**
 * StationCircle
 *
 * Visual circle on the floor-plan. Station 8 (stationType='racing') always
 * shows amber with the steering-wheel icon regardless of status field.
 * Other stations: red if occupied/activeSlot, green otherwise.
 */

/**
 * isRacingStation — dual detection so the UI works even if the sheet
 * column F (stationType) is accidentally left blank.
 * Primary:   stationType === 'racing'
 * Fallback:  id === '8'
 */
const isRacingStation = (station) =>
  String(station?.stationType).toLowerCase() === 'racing' ||
  String(station?.id) === '8';

const S = {
  available: {
    ring: '#22c55e',
    glow: 'rgba(34,197,94,0.55)',
    soft: 'rgba(34,197,94,0.11)',
    bg:   'rgba(34,197,94,0.07)',
    label: '#22c55e',
    text: 'AVAILABLE',
  },
  occupied: {
    ring: '#ef4444',
    glow: 'rgba(239,68,68,0.55)',
    soft: 'rgba(239,68,68,0.11)',
    bg:   'rgba(239,68,68,0.07)',
    label: '#ef4444',
    text: 'OCCUPIED',
  },
  racing: {
    ring: '#f59e0b',
    glow: 'rgba(245,158,11,0.55)',
    soft: 'rgba(245,158,11,0.11)',
    bg:   'rgba(245,158,11,0.07)',
    label: '#f59e0b',
    text: 'RACING',
  },
};

const ControllerIcon = () => (
  <svg className="station-icon" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="2"/>
    <path d="M12 6v12"/>
    <path d="m8 10 2 2-2 2"/>
    <circle cx="16" cy="12" r="1" fill="currentColor"/>
  </svg>
);

const WheelIcon = () => (
  <svg className="station-icon" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="3"/>
    <line x1="12" y1="2"    x2="12" y2="9"/>
    <line x1="12" y1="15"   x2="12" y2="22"/>
    <line x1="2"  y1="12"   x2="9"  y2="12"/>
    <line x1="15" y1="12"   x2="22" y2="12"/>
    <line x1="4.22" y1="4.22"   x2="8.49"  y2="8.49"/>
    <line x1="15.51" y1="15.51" x2="19.78" y2="19.78"/>
    <line x1="4.22" y1="19.78"  x2="8.49"  y2="15.51"/>
    <line x1="15.51" y1="8.49"  x2="19.78" y2="4.22"/>
  </svg>
);

export default function StationCircle({ station, onClick }) {
  const isRacing   = isRacingStation(station);
  const isOccupied = station.status === 'occupied' || !!station.activeSlot;
  const key = isRacing ? 'racing' : (isOccupied ? 'occupied' : 'available');
  const s   = S[key];

  const gameLabel = station.activeSlot && station.activeGame ? station.activeGame : null;

  return (
    <button
      className="station-btn"
      onClick={() => onClick(station)}
      title={`Station ${station.id} \u2014 ${s.text}${gameLabel ? ` \u00b7 ${gameLabel}` : ''}`}
    >
      <div
        className="station-circle"
        style={{
          background: s.bg,
          border: `2px solid ${s.ring}`,
          color: s.ring,
          boxShadow: `0 0 8px ${s.glow}, 0 0 24px ${s.soft}, inset 0 0 14px ${s.soft}`,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = `0 0 18px ${s.glow}, 0 0 44px ${s.soft}, inset 0 0 18px ${s.soft}`;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = `0 0 8px ${s.glow}, 0 0 24px ${s.soft}, inset 0 0 14px ${s.soft}`;
        }}
      >
        <span
          className="station-number"
          style={{ textShadow: `0 0 8px ${s.glow}` }}
        >
          {String(station.id).padStart(2, '0')}
        </span>
        {isRacing ? <WheelIcon /> : <ControllerIcon />}
      </div>

      <div>
        <div className="station-label" style={{ color: s.label }}>
          {s.text}
        </div>
        {gameLabel && (
          <div className="station-game" style={{
            fontSize: 'clamp(0.48rem,0.85vw,0.6rem)',
            color: 'rgba(255,255,255,0.55)',
            textAlign: 'center',
            maxWidth: 68,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>{gameLabel}</div>
        )}
      </div>
    </button>
  );
}
