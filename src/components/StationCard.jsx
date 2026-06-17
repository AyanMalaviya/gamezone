import { Gamepad2, Steering, Clock } from 'lucide-react';

const StationCard = ({ id, status, currentGame, stationType, onSelect }) => {
  const isAvailable = status?.toLowerCase() === 'available';
  const isRacing = stationType === 'Racing Simulator';

  const colors = isRacing
    ? {
        border: 'border-amber-500/30',
        bg: 'bg-amber-500/5 hover:bg-amber-500/10',
        glow: 'shadow-[0_0_18px_rgba(245,158,11,0.2)] hover:shadow-[0_0_28px_rgba(245,158,11,0.35)]',
        ring: 'focus-visible:ring-amber-500/50',
        numColor: 'text-amber-400',
        badgeBg: 'bg-amber-500/15 text-amber-400',
        dot: 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]',
      }
    : isAvailable
    ? {
        border: 'border-green-500/25',
        bg: 'bg-green-500/5 hover:bg-green-500/10',
        glow: 'shadow-[0_0_18px_rgba(34,197,94,0.15)] hover:shadow-[0_0_28px_rgba(34,197,94,0.3)]',
        ring: 'focus-visible:ring-green-500/50',
        numColor: 'text-white',
        badgeBg: 'bg-green-500/15 text-green-400',
        dot: 'bg-green-400 shadow-[0_0_6px_rgba(34,197,94,0.8)]',
      }
    : {
        border: 'border-red-500/25',
        bg: 'bg-red-500/5 hover:bg-red-500/10',
        glow: 'shadow-[0_0_18px_rgba(239,68,68,0.15)] hover:shadow-[0_0_28px_rgba(239,68,68,0.3)]',
        ring: 'focus-visible:ring-red-500/50',
        numColor: 'text-white',
        badgeBg: 'bg-red-500/15 text-red-400',
        dot: 'bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.8)]',
      };

  return (
    <button
      onClick={() => onSelect({ id, status, currentGame, stationType })}
      className={`group relative flex w-full cursor-pointer flex-col gap-3 rounded-xl border p-5 text-left
        transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        focus-visible:ring-offset-[#0d0d0f]
        ${colors.border} ${colors.bg} ${colors.glow} ${colors.ring}`}
    >
      {/* Top row: number + status dot */}
      <div className="flex items-start justify-between">
        <span className={`text-4xl font-black leading-none tracking-tighter ${colors.numColor}`}>
          {String(id).padStart(2, '0')}
        </span>
        <span className={`mt-1 h-2.5 w-2.5 rounded-full ${colors.dot}`} />
      </div>

      {/* Station type icon */}
      <div className="flex items-center gap-1.5 text-xs font-medium text-white/30">
        {isRacing
          ? <Steering size={13} />
          : <Gamepad2 size={13} />}
        <span>{isRacing ? 'Racing Simulator' : 'PS5'}</span>
      </div>

      {/* Bottom: badge + game */}
      <div className="mt-auto flex flex-col gap-1.5">
        <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${colors.badgeBg}`}>
          {isRacing ? 'Simulator' : isAvailable ? 'Available' : 'Occupied'}
        </span>
        {!isAvailable && currentGame && (
          <p className="truncate text-sm font-medium text-white/70 group-hover:text-white/90 transition-colors">
            {currentGame}
          </p>
        )}
        {isAvailable && (
          <p className="text-sm text-white/30">Ready to play</p>
        )}
      </div>
    </button>
  );
};

export default StationCard;
