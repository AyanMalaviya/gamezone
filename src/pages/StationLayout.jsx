import { useState } from 'react';
import useStationData from '../hooks/useStationData';
import StationCircle from '../components/StationCircle';
import StationModal from '../components/StationModal';
import Navbar from '../components/Navbar';

// Layout per your spec:
// Row A (top):    stations 1–7  (left → right)
// Row B (middle): station 8 racing sim on the RIGHT only
// Row C (bottom): stations 9–14 reversed (14 13 12 11 10 9, left → right)

function SkeletonCircle() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div className="skeleton-shimmer" style={{ width: 72, height: 72, borderRadius: '50%' }} />
      <div className="skeleton-shimmer" style={{ width: 48, height: 8, borderRadius: 4 }} />
    </div>
  );
}

export default function StationLayout() {
  const { stations, isLoading, isError } = useStationData();
  const [selected, setSelected] = useState(null);

  // Sorted by numeric id
  const sorted = [...stations].sort((a, b) => Number(a.id) - Number(b.id));

  // Row splits — ids 1-7 top, id 8 racing middle-right, ids 9-14 bottom reversed
  const rowTop    = sorted.filter(s => Number(s.id) >= 1  && Number(s.id) <= 7);
  const rowRacing = sorted.filter(s => Number(s.id) === 8);
  const rowBottom = sorted.filter(s => Number(s.id) >= 9  && Number(s.id) <= 14).reverse(); // 14→9 left to right

  const available = stations.filter(s => s.status === 'available' && Number(s.id) !== 8).length;
  const occupied  = stations.filter(s => s.status === 'occupied'  && Number(s.id) !== 8).length;

  return (
    <div style={{ minHeight: '100dvh', background: '#0d0d0f', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* Ambient background */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `
          radial-gradient(ellipse 60% 35% at 50% 0%, rgba(124,58,237,0.06) 0%, transparent 70%),
          radial-gradient(ellipse 35% 30% at 85% 85%, rgba(245,158,11,0.05) 0%, transparent 60%)
        `,
      }} />

      <main style={{ flex: 1, position: 'relative', zIndex: 1, padding: '36px 24px 56px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>

          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h1 style={{
              fontFamily: "'Rajdhani', 'Inter', sans-serif",
              fontWeight: 800,
              fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
              letterSpacing: '-0.02em',
              color: '#fff', lineHeight: 1.1, marginBottom: 10,
            }}>
              GAME<span style={{ color: '#7c3aed' }}>ZONE</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Live Station Availability · Click any station
            </p>

            {/* Legend */}
            {!isLoading && !isError && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, marginTop: 16, flexWrap: 'wrap' }}>
                {[
                  { color: '#22c55e', label: `${available} Available` },
                  { color: '#ef4444', label: `${occupied} Occupied` },
                  { color: '#f59e0b', label: `${rowRacing.length} Racing Sim` },
                ].map(({ color, label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}`, display: 'inline-block' }} />
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── FLOOR PLAN ── */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 20,
            padding: 'clamp(20px, 4vw, 48px)',
            position: 'relative',
            minHeight: 400,
            display: 'flex',
            flexDirection: 'column',
            gap: 36,
          }}>
            <span style={{
              position: 'absolute', top: 13, left: 18,
              fontSize: '0.58rem', letterSpacing: '0.18em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.13)', fontWeight: 700,
            }}>Floor Plan</span>

            {/* Loading */}
            {isLoading && (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(12px,2.5vw,36px)', flexWrap: 'wrap', paddingTop: 16 }}>
                  {Array.from({ length: 7 }).map((_, i) => <SkeletonCircle key={i} />)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <SkeletonCircle />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(12px,2.5vw,36px)', flexWrap: 'wrap' }}>
                  {Array.from({ length: 6 }).map((_, i) => <SkeletonCircle key={i} />)}
                </div>
              </>
            )}

            {/* Error */}
            {isError && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: '40px 0' }}>
                <span style={{ fontSize: '1.8rem' }}>⚠️</span>
                <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>Failed to load station data.</p>
                <button onClick={() => window.location.reload()} style={{
                  padding: '7px 18px', borderRadius: 8,
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)',
                  color: '#ef4444', cursor: 'pointer', fontSize: '0.78rem',
                }}>Retry</button>
              </div>
            )}

            {!isLoading && !isError && (
              <>
                {/* Row A: stations 1–7 */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-end',
                  gap: 'clamp(10px, 2.5vw, 36px)',
                  flexWrap: 'wrap',
                  paddingTop: 12,
                }}>
                  {rowTop.map(s => (
                    <StationCircle key={s.id} station={s} onClick={setSelected} />
                  ))}
                </div>

                {/* Row B: racing sim right-aligned */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  paddingRight: 'clamp(0px, 1vw, 20px)',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em',
                      textTransform: 'uppercase', color: 'rgba(245,158,11,0.5)',
                    }}>🏁 Racing Zone</span>
                    {rowRacing.map(s => (
                      <StationCircle key={s.id} station={s} onClick={setSelected} />
                    ))}
                  </div>
                </div>

                {/* Row C: stations 14→9 */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  gap: 'clamp(10px, 2.5vw, 36px)',
                  flexWrap: 'wrap',
                }}>
                  {rowBottom.map(s => (
                    <StationCircle key={s.id} station={s} onClick={setSelected} />
                  ))}
                </div>
              </>
            )}
          </div>

          <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.65rem', color: 'rgba(255,255,255,0.18)', letterSpacing: '0.06em' }}>
            Auto-refreshes every 30 seconds
          </p>
        </div>
      </main>

      <StationModal station={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
