const StationCard = ({ currentGame, id, status, onSelect }) => {
  const isAvailable = status?.toLowerCase() === 'available';

  return (
    <button
      className={`group flex h-full min-h-[160px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border p-6 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-950 ${
        isAvailable
          ? 'border-green-500/50 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:bg-green-500/20 hover:shadow-[0_0_20px_rgba(34,197,94,0.5)]'
          : 'border-red-500/50 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:bg-red-500/20 hover:shadow-[0_0_20px_rgba(239,68,68,0.5)]'
      }`}
      onClick={() => onSelect({ currentGame, id, status })}
    >
      <h2 className="mb-2 text-5xl font-bold text-white transition-transform group-hover:scale-110">
        {id}
      </h2>
      
      <div
        className={`mb-3 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
          isAvailable
            ? 'bg-green-500/20 text-green-400 group-hover:bg-green-500/30'
            : 'bg-red-500/20 text-red-400 group-hover:bg-red-500/30'
        }`}
      >
        {isAvailable ? 'Available' : 'Occupied'}
      </div>

      {!isAvailable && currentGame && (
        <p className="mt-auto text-lg font-medium text-slate-300">{currentGame}</p>
      )}
    </button>
  );
};

export default StationCard;
