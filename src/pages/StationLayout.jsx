import { useState } from 'react';
import useStationData from '../hooks/useStationData';
import Navbar from '../components/Navbar';
import PageLayout, { PageBody } from '../components/PageLayout';
import StationCard from '../components/StationCard';
import StationModal from '../components/StationModal';
import StatusLegend from '../components/StatusLegend';
import SkeletonCard from '../components/SkeletonCard';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const StationLayout = () => {
  const { stations, isLoading, isError, refetch } = useStationData();
  const [selectedStation, setSelectedStation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelect = (summary) => {
    const full = stations?.find((s) => s.id === summary.id) || summary;
    setSelectedStation(full);
    setIsModalOpen(true);
  };

  const available = stations?.filter((s) => s.status?.toLowerCase() === 'available').length ?? 0;
  const occupied  = stations?.filter((s) => s.status?.toLowerCase() === 'occupied').length ?? 0;
  const total     = stations?.length ?? 0;

  return (
    <PageLayout>
      <Navbar />
      <PageBody>
        {/* Page heading */}
        <div className="mb-6">
          <h1 className="text-2xl font-black tracking-tight text-white">Station Layout</h1>
          <p className="mt-1 text-sm text-white/40">Click any station to view details and bookings</p>
        </div>

        {/* Legend / stats bar */}
        {!isLoading && !isError && (
          <div className="mb-6 rounded-xl border border-white/5 bg-white/[0.025] px-5 py-3">
            <StatusLegend available={available} occupied={occupied} total={total} />
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-red-500/20 bg-red-500/5 px-6 py-12 text-center">
            <AlertTriangle size={32} className="text-red-400" />
            <div>
              <p className="font-semibold text-red-400">Failed to load station data</p>
              <p className="mt-1 text-sm text-white/40">Check your Google Sheets configuration</p>
            </div>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        )}

        {/* Station grid */}
        {!isError && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {isLoading
              ? Array.from({ length: 15 }).map((_, i) => <SkeletonCard key={i} />)
              : stations.map((station) => (
                  <StationCard
                    key={station.id}
                    id={station.id}
                    status={station.status}
                    currentGame={station.currentGame}
                    stationType={station.stationType}
                    onSelect={handleSelect}
                  />
                ))}
          </div>
        )}

        {/* Footer note */}
        {!isLoading && !isError && (
          <p className="mt-8 text-center text-xs text-white/20">
            Auto-refreshes every 30 seconds
          </p>
        )}
      </PageBody>

      <StationModal
        station={selectedStation}
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </PageLayout>
  );
};

export default StationLayout;
