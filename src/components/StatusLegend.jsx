const Dot = ({ color }) => (
  <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
);

const StatusLegend = ({ available = 0, occupied = 0, total = 0 }) => (
  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
    <div className="flex items-center gap-2">
      <Dot color="bg-green-400 shadow-[0_0_6px_rgba(34,197,94,0.7)]" />
      <span className="text-sm text-white/60">Available</span>
      <span className="text-sm font-bold text-white">{available}</span>
    </div>
    <div className="flex items-center gap-2">
      <Dot color="bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.7)]" />
      <span className="text-sm text-white/60">Occupied</span>
      <span className="text-sm font-bold text-white">{occupied}</span>
    </div>
    <div className="flex items-center gap-2">
      <Dot color="bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.7)]" />
      <span className="text-sm text-white/60">Racing Sim</span>
    </div>
    <div className="ml-auto hidden text-sm text-white/30 sm:block">
      {occupied}/{total} stations in use
    </div>
  </div>
);

export default StatusLegend;
