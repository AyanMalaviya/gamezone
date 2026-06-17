import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Navbar from '../components/Navbar';
import AuthModal from '../components/AuthModal';
import useAuthStore from '../store/authStore';

const GAMES = [
  { title: 'God of War Ragnarök',  genre: 'Action RPG',     emoji: '⚔️' },
  { title: 'Spider-Man 2',         genre: 'Action',         emoji: '🕷️' },
  { title: 'EA Sports FC 25',      genre: 'Sports',         emoji: '⚽' },
  { title: 'Mortal Kombat 1',      genre: 'Fighting',       emoji: '🥊' },
  { title: 'GTA V',                genre: 'Open World',     emoji: '🌆' },
  { title: 'Gran Turismo 7',       genre: 'Racing',         emoji: '🏎️' },
];

const FEATURES = [
  { icon: '🖥️', title: '14 Monitors',       desc: 'Premium 4K displays with 144Hz refresh rate' },
  { icon: '🎮', title: 'PS5 Stations',       desc: '13 next-gen consoles, always updated' },
  { icon: '🏎️', title: 'Racing Simulator',  desc: 'Full force-feedback wheel & pedal setup' },
  { icon: '⚡', title: 'Live Availability',  desc: 'Real-time station status, no waiting in line' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div style={{ minHeight:'100dvh', background:'#0d0d0f', color:'#e8e8f0', overflowX:'hidden' }}>
      <Navbar />

      {/* ── AMBIENT GLOWS ── */}
      <div aria-hidden style={{
        position:'fixed', inset:0, pointerEvents:'none', zIndex:0,
        background:`
          radial-gradient(ellipse 80% 50% at 50% -10%, rgba(124,58,237,0.18) 0%, transparent 65%),
          radial-gradient(ellipse 50% 40% at 10% 60%,  rgba(124,58,237,0.07) 0%, transparent 60%),
          radial-gradient(ellipse 40% 35% at 90% 80%,  rgba(245,158,11,0.06) 0%, transparent 60%)
        `,
      }} />

      {/* ── HERO ── */}
      <section style={{
        position:'relative', zIndex:1,
        padding:'clamp(60px,10vw,120px) clamp(16px,4vw,40px) clamp(60px,8vw,100px)',
        textAlign:'center',
        display:'flex', flexDirection:'column', alignItems:'center',
      }}>
        {/* Pill badge */}
        <div style={{
          display:'inline-flex', alignItems:'center', gap:8,
          padding:'5px 14px', borderRadius:99, marginBottom:24,
          background:'rgba(124,58,237,0.12)',
          border:'1px solid rgba(124,58,237,0.3)',
        }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#a78bfa', boxShadow:'0 0 6px #a78bfa', display:'inline-block' }} />
          <span style={{ fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#c4b5fd' }}>Now Open</span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily:"'Rajdhani','Inter',sans-serif",
          fontWeight:900,
          fontSize:'clamp(2.8rem,8vw,6rem)',
          lineHeight:1.05,
          letterSpacing:'-0.03em',
          marginBottom:24,
          maxWidth:800,
        }}>
          <span style={{ color:'#fff' }}>THE ULTIMATE</span><br/>
          <span style={{
            background:'linear-gradient(135deg, #a78bfa 0%, #e879f9 50%, #a78bfa 100%)',
            backgroundSize:'200% 100%',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            backgroundClip:'text',
          }}>GAMING ZONE</span>
        </h1>

        {/* Sub */}
        <p style={{
          fontSize:'clamp(0.95rem,1.8vw,1.15rem)',
          color:'rgba(255,255,255,0.45)',
          maxWidth:480, marginBottom:40, lineHeight:1.7,
        }}>
          14 premium monitors · 13 PS5 stations · 1 racing simulator.<br/>
          Walk in, pick a station, play.
        </p>

        {/* CTA buttons */}
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center' }}>
          <button onClick={() => navigate('/stations')} style={{
            padding:'13px 32px',
            background:'linear-gradient(135deg,#7c3aed,#9333ea)',
            border:'1px solid rgba(124,58,237,0.5)',
            borderRadius:12, color:'#fff',
            fontFamily:"'Rajdhani','Inter',sans-serif",
            fontWeight:700, fontSize:'1rem', letterSpacing:'0.04em',
            cursor:'pointer',
            boxShadow:'0 0 24px rgba(124,58,237,0.45), 0 4px 16px rgba(0,0,0,0.4)',
            transition:'all 180ms ease',
          }}
          onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 0 40px rgba(124,58,237,0.65), 0 4px 20px rgba(0,0,0,0.5)';e.currentTarget.style.transform='translateY(-1px)';}}
          onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 0 24px rgba(124,58,237,0.45), 0 4px 16px rgba(0,0,0,0.4)';e.currentTarget.style.transform='translateY(0)';}}>
            Check Availability
          </button>
          {!user && (
            <button onClick={() => setAuthOpen(true)} style={{
              padding:'13px 32px',
              background:'rgba(255,255,255,0.05)',
              border:'1px solid rgba(255,255,255,0.13)',
              borderRadius:12, color:'rgba(255,255,255,0.75)',
              fontFamily:"'Rajdhani','Inter',sans-serif",
              fontWeight:700, fontSize:'1rem', letterSpacing:'0.04em',
              cursor:'pointer', transition:'all 180ms ease',
            }}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.09)';e.currentTarget.style.color='#fff';e.currentTarget.style.borderColor='rgba(255,255,255,0.25)';}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.05)';e.currentTarget.style.color='rgba(255,255,255,0.75)';e.currentTarget.style.borderColor='rgba(255,255,255,0.13)';}}>
            Sign In
          </button>
          )}
        </div>

        {/* Stats row */}
        <div style={{
          display:'flex', gap:'clamp(24px,5vw,56px)', marginTop:56, flexWrap:'wrap', justifyContent:'center',
        }}>
          {[
            { num:'13', label:'PS5 Stations' },
            { num:'14', label:'4K Monitors' },
            { num:'1',  label:'Racing Sim' },
            { num:'∞',  label:'Good Times' },
          ].map(({ num, label }) => (
            <div key={label} style={{ textAlign:'center' }}>
              <div style={{
                fontFamily:"'Rajdhani','Inter',sans-serif",
                fontWeight:800, fontSize:'clamp(1.8rem,4vw,2.6rem)',
                color:'#a78bfa', lineHeight:1,
                textShadow:'0 0 20px rgba(167,139,250,0.5)',
              }}>{num}</div>
              <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.35)', letterSpacing:'0.1em', textTransform:'uppercase', marginTop:4 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{
        position:'relative', zIndex:1,
        padding:'clamp(48px,7vw,80px) clamp(16px,4vw,40px)',
      }}>
        <div style={{ maxWidth:1000, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'clamp(32px,5vw,52px)' }}>
            <h2 style={{
              fontFamily:"'Rajdhani','Inter',sans-serif",
              fontWeight:800, fontSize:'clamp(1.5rem,3.5vw,2.2rem)',
              color:'#fff', letterSpacing:'-0.02em', marginBottom:10,
            }}>What We Offer</h2>
            <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.88rem' }}>Everything you need for a legendary session</p>
          </div>

          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',
            gap:'clamp(12px,2vw,20px)',
          }}>
            {FEATURES.map(({ icon, title, desc }) => (
              <div key={title} style={{
                background:'rgba(255,255,255,0.025)',
                border:'1px solid rgba(255,255,255,0.07)',
                borderRadius:16, padding:'clamp(18px,2.5vw,28px)',
                transition:'border-color 180ms ease, transform 180ms ease',
              }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(124,58,237,0.3)';e.currentTarget.style.transform='translateY(-2px)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.07)';e.currentTarget.style.transform='translateY(0)';}}>
                <div style={{ fontSize:'2rem', marginBottom:12 }}>{icon}</div>
                <div style={{
                  fontFamily:"'Rajdhani','Inter',sans-serif",
                  fontWeight:700, fontSize:'1rem', color:'#fff', marginBottom:6,
                }}>{title}</div>
                <div style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.38)', lineHeight:1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GAMES MARQUEE ── */}
      <section style={{
        position:'relative', zIndex:1,
        padding:'clamp(40px,6vw,64px) 0',
        borderTop:'1px solid rgba(255,255,255,0.05)',
        borderBottom:'1px solid rgba(255,255,255,0.05)',
        overflow:'hidden',
      }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <h2 style={{
            fontFamily:"'Rajdhani','Inter',sans-serif",
            fontWeight:800, fontSize:'clamp(1.4rem,3vw,2rem)',
            color:'#fff', letterSpacing:'-0.02em',
          }}>Popular Titles</h2>
        </div>
        <div style={{
          display:'flex', gap:'clamp(12px,2vw,20px)',
          flexWrap:'wrap', justifyContent:'center',
          padding:'0 clamp(16px,4vw,40px)',
        }}>
          {GAMES.map(({ title, genre, emoji }) => (
            <div key={title} style={{
              display:'flex', alignItems:'center', gap:10,
              padding:'10px 18px', borderRadius:12,
              background:'rgba(255,255,255,0.03)',
              border:'1px solid rgba(255,255,255,0.07)',
              transition:'border-color 160ms ease',
            }}
            onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(167,139,250,0.3)'}
            onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'}>
              <span style={{ fontSize:'1.3rem' }}>{emoji}</span>
              <div>
                <div style={{ fontSize:'0.85rem', fontWeight:600, color:'#e8e8f0' }}>{title}</div>
                <div style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.3)', letterSpacing:'0.06em' }}>{genre}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={{
        position:'relative', zIndex:1,
        padding:'clamp(56px,8vw,96px) clamp(16px,4vw,40px)',
        textAlign:'center',
      }}>
        <div style={{
          maxWidth:600, margin:'0 auto',
          padding:'clamp(36px,5vw,56px)',
          background:'rgba(124,58,237,0.07)',
          border:'1px solid rgba(124,58,237,0.2)',
          borderRadius:24,
          boxShadow:'0 0 60px rgba(124,58,237,0.1)',
        }}>
          <h2 style={{
            fontFamily:"'Rajdhani','Inter',sans-serif",
            fontWeight:800, fontSize:'clamp(1.5rem,3.5vw,2.2rem)',
            color:'#fff', letterSpacing:'-0.02em', marginBottom:12,
          }}>Ready to Play?</h2>
          <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.9rem', marginBottom:28, lineHeight:1.7 }}>
            Check live availability and walk straight in.
          </p>
          <button onClick={() => navigate('/stations')} style={{
            padding:'12px 36px',
            background:'linear-gradient(135deg,#7c3aed,#9333ea)',
            border:'1px solid rgba(124,58,237,0.5)',
            borderRadius:12, color:'#fff',
            fontFamily:"'Rajdhani','Inter',sans-serif",
            fontWeight:700, fontSize:'1rem', letterSpacing:'0.05em',
            cursor:'pointer',
            boxShadow:'0 0 24px rgba(124,58,237,0.4)',
            transition:'all 180ms ease',
          }}
          onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 0 40px rgba(124,58,237,0.6)';e.currentTarget.style.transform='translateY(-1px)';}}
          onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 0 24px rgba(124,58,237,0.4)';e.currentTarget.style.transform='translateY(0)';}}>
            View Stations →
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        position:'relative', zIndex:1,
        padding:'20px clamp(16px,4vw,40px)',
        borderTop:'1px solid rgba(255,255,255,0.05)',
        display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8,
      }}>
        <span style={{
          fontFamily:"'Rajdhani','Inter',sans-serif",
          fontWeight:700, color:'rgba(255,255,255,0.2)', fontSize:'0.8rem', letterSpacing:'0.08em',
        }}>GAME<span style={{ color:'rgba(167,139,250,0.4)' }}>ZONE</span></span>
        <span style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.18)' }}>© 2026 All rights reserved</span>
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} defaultTab="login" />
    </div>
  );
}
