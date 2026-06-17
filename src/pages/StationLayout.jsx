import { useState } from 'react';
import useStationData from '../hooks/useStationData';
import StationCard from '../components/StationCard';
import StationModal from '../components/StationModal';

const SkeletonCard = () => (
  <div className="h-[160px] animate-pulse rounded-xl bg-slate-800" />
);

const StationLayout = () => {
  const { stations, isLoading, isError } = useStationData();
  const [selectedStation, setSelectedStation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelect = (stationSummary) => {
    // Attempt to pass the full station object to the modal if available
    const fullStation = stations.find((s) => s.id === stationSummary.id) || stationSummary;
    setSelectedStation(fullStation);
    setIsModalOpen(true);
  };

  if (isError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
        <h2 className="mb-2 text-2xl font-bold text-red-500">Error Loading Stations</h2>
        <p className="text-slate-400">Failed to load station data from the spreadsheet. Please check your connection or settings.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      {/* Header and Status Legend */}
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <h1 className="text-3xl font-bold text-white">GameZone Stations</h1>
        
        <div className="flex gap-6 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            <span className="text-sm font-medium text-slate-300">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
            <span className="text-sm font-medium text-slate-300">Occupied</span>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {isLoading
          ? Array.from({ length: 15 }).map((_, i) => <SkeletonCard key={i} />)
          : stations.map((station) => {
              // Assume ID '15' or one labeled 'sim' is the racing simulator
              const isSimulator = station.id === '15' || String(station.id).toLowerCase().includes('sim');
              
              return (
                <div key={station.id} className="relative h-full">
                  {isSimulator && (
                    <div className="absolute -top-3 right-[-10px] z-10 rotate-3 rounded-xl border border-yellow-500 bg-yellow-500/20 px-3 py-1 font-black tracking-wider text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.4)] backdrop-blur-md">
                      RACING SIM
                    </div>
                  )}
                  <StationCard
                    id={station.id}
                    status={station.status}
                    currentGame={station.currentGame}
                    onSelect={handleSelect}
                  />
                </div>
              );
            })}
      </div>

      <StationModal
        station={selectedStation}
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default StationLayout;
