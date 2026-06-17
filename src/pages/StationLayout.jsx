import { useState } from 'react';
import useStationData from '../hooks/useStationData';
import StationCircle from '../components/StationCircle';
import StationModal from '../components/StationModal';
import Navbar from '../components/Navbar';

function SkeletonCircle() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div className="skeleton-shimmer" style={{ width: 88, height: 88, borderRadius: '50%' }} />
      <div className="skeleton-shimmer" style={{ width: 60, height: 10, borderRadius: 4 }} />
    </div>
  );
}

export default function StationLayout() {
  const { stations, isLoading, isError } = useStationData();
  const [selected, setSelected] = useState(null);

  // Split: racing simulator vs PS5 stations
  const ps5 = stations.filter(s => s.Station_Type !== 'Racing Simulator');
  const racing = stations.filter(s => s.Station_Type === 'Racing Simulator');

  const available = stations.filter(s => s.Status === 'available' && s.Station_Type !== 'Racing Simulator').length;
  const occupied  = stations.filter(s => s.Status === 'occupied'  && s.Station_Type !== 'Racing Simulator').length;

  return (
    <div style={{ minHeight: '100dvh', background: '#0d0d0f', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* Ambient background glows */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `
          radial-gradient(ellipse 60% 40% at 50% 0%, rgba(124,58,237,0.07) 0%, transparent 70%),
          radial-gradient(ellipse 40% 30% at 80% 80%, rgba(245,158,11,0.05) 0%, transparent 60%)
        `,
      }} />

      <main style={{ flex: 1, position: 'relative', zIndex: 1, padding: '40px 24px 60px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          {/* Page title */}
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h1 style={{
              fontFamily: "'Rajdhani', 'Inter', sans-serif",
              fontWeight: 800,
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              letterSpacing: '-0.02em',
              color: '#fff',
              lineHeight: 1.1,
              marginBottom: 12,
            }}>
              GAME<span style={{ color: '#7c3aed' }}>ZONE</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Live Station Availability
            </p>

            {/* Legend */}
            {!isLoading && !isError && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, marginTop: 20, flexWrap: 'wrap' }}>
                {[
                  { color: '#22c55e', label: `${available} Available` },
                  { color: '#ef4444', label: `${occupied} Occupied` },
                  { color: '#f59e0b', label: `${racing.length} Racing Sim` },
                ].map(({ color, label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: color,
                      boxShadow: `0 0 6px ${color}`,
                      display: 'inline-block',
                    }} />
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.06em' }}>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── FLOOR PLAN AREA ── */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 24,
            padding: 'clamp(24px, 4vw, 56px)',
            position: 'relative',
            minHeight: 480,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 48,
          }}>

            {/* Floor label */}
            <div style={{
              position: 'absolute', top: 16, left: 20,
              fontSize: '0.6rem', letterSpacing: '0.18em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.15)',
              fontWeight: 700,
            }}>Floor Plan · Click a Station</div>

            {/* Loading state */}
            {isLoading && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 48 }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(16px,3vw,40px)', flexWrap: 'wrap' }}>
                  {Array.from({ length: 6 }).map((_, i) => <SkeletonCircle key={i} />)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <SkeletonCircle />
                </div>
              </div>
            )}

            {/* Error state */}
            {isError && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
                <span style={{ fontSize: '2rem' }}>⚠️</span>
                <p style={{ color: '#ef4444', fontSize: '0.9rem' }}>Failed to load station data.</p>
                <button onClick={() => window.location.reload()} style={{
                  padding: '8px 20px', borderRadius: 8,
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                  color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem',
                }}>Retry</button>
              </div>
            )}

            {/* ─── Row 3 (middle/top section): 6 PS5 circles ─── */}
            {!isLoading && !isError && (
              <>
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 'clamp(14px, 3vw, 48px)',
                  flexWrap: 'wrap',
                }}>
                  {ps5.map(station => (
                    <StationCircle key={station.Station_ID} station={station} onClick={setSelected} />
                  ))}
                </div>

                {/* ─── Bottom row: racing sim aligned right ─── */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingRight: 'clamp(0px, 2vw, 32px)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    {/* Dashed separator line hinting it's a different zone */}
                    <div style={{
                      fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase',
                      color: 'rgba(245,158,11,0.4)', marginBottom: 6, fontWeight: 700,
                    }}>🏁 Racing Zone</div>
                    {racing.map(station => (
                      <StationCircle key={station.Station_ID} station={station} onClick={setSelected} size="lg" />
                    ))}
                  </div>
                </div>
              </>
            )}

          </div>

          {/* Auto-refresh notice */}
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.06em' }}>
            Auto-refreshes every 30 seconds
          </p>
        </div>
      </main>

      {/* Modal */}
      <StationModal station={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
