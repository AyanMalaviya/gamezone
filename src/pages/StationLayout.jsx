import { useState } from 'react';
import useStationData from '../hooks/useStationData';
import StationCircle from '../components/StationCircle';
import StationModal from '../components/StationModal';
import Navbar from '../components/Navbar';

function SkeletonRow({ count }) {
  return (
    <div className="station-row">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap: 6, flexShrink: 0 }}>
          <div className="skeleton-shimmer" style={{
            width: 'clamp(40px,7vw,68px)', height: 'clamp(40px,7vw,68px)', borderRadius: '50%',
          }} />
          <div className="skeleton-shimmer" style={{ width: 'clamp(32px,5vw,48px)', height: 7, borderRadius: 3 }} />
        </div>
      ))}
    </div>
  );
}

export default function StationLayout() {
  const { stations, isLoading, isError } = useStationData();
  // selected = { station, stationIndex } so modal always gets the correct row index
  const [selected, setSelected] = useState(null);

  const sorted    = [...stations].sort((a, b) => Number(a.id) - Number(b.id));
  const rowTop    = sorted.filter(s => Number(s.id) >= 1 && Number(s.id) <= 7);
  const rowRacing = sorted.filter(s => Number(s.id) === 8);
  const rowBottom = sorted.filter(s => Number(s.id) >= 9 && Number(s.id) <= 14).reverse();

  const available = stations.filter(s => s.status === 'available' && Number(s.id) !== 8).length;
  const occupied  = stations.filter(s => s.status === 'occupied'  && Number(s.id) !== 8).length;

  // Pass both station and its 0-based index in sorted[] to the modal.
  // This is the row index used by updateStation() for Sheets writes.
  const handleSelect = (station) => {
    const stationIndex = sorted.findIndex(s => s.id === station.id);
    setSelected({ station, stationIndex });
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#0d0d0f', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* Ambient glow */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `
          radial-gradient(ellipse 60% 35% at 50% 0%,   rgba(124,58,237,0.06) 0%, transparent 70%),
          radial-gradient(ellipse 35% 30% at 85% 85%,  rgba(245,158,11,0.05) 0%, transparent 60%)
        `,
      }} />

      <main style={{
        flex: 1, position: 'relative', zIndex: 1,
        padding: '72px clamp(16px,3vw,32px) 56px',
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>

          <div style={{ textAlign: 'center', marginBottom: 'clamp(16px,3vw,32px)' }}>
            <p style={{
              color: 'rgba(255,255,255,0.35)',
              fontSize: 'clamp(0.6rem,1.1vw,0.78rem)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}>
              Live Station Availability · Click any station
            </p>
            {!isLoading && !isError && (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap: 20, marginTop: 10, flexWrap:'wrap' }}>
                {[
                  { color: '#22c55e', label: `${available} Available` },
                  { color: '#ef4444', label: `${occupied} Occupied` },
                  { color: '#f59e0b', label: `${rowRacing.length} Racing Sim` },
                ].map(({ color, label }) => (
                  <div key={label} style={{ display:'flex', alignItems:'center', gap: 6 }}>
                    <span style={{
                      width: 7, height: 7, borderRadius:'50%',
                      background: color, boxShadow:`0 0 5px ${color}`,
                      display:'inline-block', flexShrink:0,
                    }} />
                    <span style={{
                      fontSize: 'clamp(0.62rem,1vw,0.72rem)',
                      color: 'rgba(255,255,255,0.4)',
                      letterSpacing:'0.05em',
                    }}>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Floor plan card */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 20,
            padding: 'clamp(28px,4vw,52px) clamp(16px,3vw,40px)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(24px,3.5vw,40px)',
          }}>
            <span style={{
              position:'absolute', top:12, left:16,
              fontSize:'0.55rem', letterSpacing:'0.18em', textTransform:'uppercase',
              color:'rgba(255,255,255,0.12)', fontWeight:700,
            }}>Floor Plan</span>

            {isLoading && (
              <>
                <SkeletonRow count={7} />
                <div style={{ display:'flex', justifyContent:'flex-end' }}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                    <div className="skeleton-shimmer" style={{ width:'clamp(40px,7vw,68px)', height:'clamp(40px,7vw,68px)', borderRadius:'50%' }} />
                    <div className="skeleton-shimmer" style={{ width:48, height:7, borderRadius:3 }} />
                  </div>
                </div>
                <SkeletonRow count={6} />
              </>
            )}

            {isError && (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, padding:'40px 0' }}>
                <span style={{ fontSize:'1.8rem' }}>⚠️</span>
                <p style={{ color:'#ef4444', fontSize:'0.85rem' }}>Failed to load station data.</p>
                <button onClick={() => window.location.reload()} style={{
                  padding:'7px 18px', borderRadius:8,
                  background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.22)',
                  color:'#ef4444', cursor:'pointer', fontSize:'0.78rem',
                }}>Retry</button>
              </div>
            )}

            {!isLoading && !isError && (
              <>
                <div className="station-row">
                  {rowTop.map(s => <StationCircle key={s.id} station={s} onClick={handleSelect} />)}
                </div>
                <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center' }}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap: 5 }}>
                    <span style={{
                      fontSize:'clamp(0.48rem,0.9vw,0.58rem)', fontWeight:700,
                      letterSpacing:'0.12em', textTransform:'uppercase',
                      color:'rgba(245,158,11,0.5)',
                    }}>🏁 Racing</span>
                    {rowRacing.map(s => <StationCircle key={s.id} station={s} onClick={handleSelect} />)}
                  </div>
                </div>
                <div className="station-row">
                  {rowBottom.map(s => <StationCircle key={s.id} station={s} onClick={handleSelect} />)}
                </div>
              </>
            )}
          </div>

          <p style={{
            textAlign:'center', marginTop:14,
            fontSize:'0.62rem', color:'rgba(255,255,255,0.16)', letterSpacing:'0.06em',
          }}>
            Auto-refreshes every 30 seconds
          </p>
        </div>
      </main>

      <StationModal
        station={selected?.station ?? null}
        stationIndex={selected?.stationIndex ?? null}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
