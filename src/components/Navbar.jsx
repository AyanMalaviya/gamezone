import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, LogOut, ChevronDown, Gamepad2 } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { logout } from '../hooks/useAuth';
import AuthModal from './AuthModal';

const adminSlug = import.meta.env.VITE_ADMIN_SLUG || 'admin';

export default function Navbar() {
  const { user, role } = useAuthStore();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen]     = useState(false);
  const [authTab,  setAuthTab]      = useState('login');
  const [dropOpen, setDropOpen]     = useState(false);

  const openLogin    = () => { setAuthTab('login');    setAuthOpen(true); };
  const openRegister = () => { setAuthTab('register'); setAuthOpen(true); };
  const handleLogout = async () => { await logout(); setDropOpen(false); navigate('/'); };

  const avatarLetter = user?.displayName?.[0] ?? user?.email?.[0]?.toUpperCase() ?? '?';

  // shared button style
  const btnBase = {
    display:'inline-flex', alignItems:'center', gap:6,
    padding:'7px 16px', borderRadius:9,
    fontSize:'0.82rem', fontWeight:600, cursor:'pointer',
    transition:'all 160ms ease',
    whiteSpace:'nowrap',
  };

  return (
    <>
      <nav style={{
        position:'sticky', top:0, zIndex:40,
        background:'rgba(13,13,15,0.85)',
        backdropFilter:'blur(16px)',
        borderBottom:'1px solid rgba(255,255,255,0.06)',
        boxShadow:'0 1px 0 rgba(124,58,237,0.08)',
      }}>
        {/* Thin purple top accent line */}
        <div style={{ height:2, background:'linear-gradient(90deg, transparent, #7c3aed 40%, #a855f7 60%, transparent)', opacity:0.7 }} />

        <div style={{
          maxWidth:1100, margin:'0 auto',
          padding:'0 clamp(16px,3vw,32px)',
          height:60,
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:16,
        }}>

          {/* Logo */}
          <Link to="/" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
            {/* SVG Logo mark */}
            <div style={{
              width:36, height:36, borderRadius:10,
              background:'rgba(124,58,237,0.18)',
              border:'1px solid rgba(124,58,237,0.35)',
              boxShadow:'0 0 12px rgba(124,58,237,0.3)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="2"/>
                <path d="M12 6v12"/>
                <path d="m8 10 2 2-2 2"/>
                <circle cx="16" cy="12" r="1" fill="#a78bfa"/>
              </svg>
            </div>
            <span style={{
              fontFamily:"'Rajdhani','Inter',sans-serif",
              fontWeight:800, fontSize:'1.2rem', letterSpacing:'-0.01em',
              color:'#fff',
            }}>
              GAME<span style={{ color:'#a78bfa' }}>ZONE</span>
            </span>
          </Link>

          {/* Nav links — center */}
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <Link to="/" style={{
              padding:'5px 12px', borderRadius:7,
              fontSize:'0.82rem', fontWeight:500,
              color:'rgba(255,255,255,0.55)', textDecoration:'none',
              transition:'color 150ms ease',
            }}
            onMouseEnter={e=>e.currentTarget.style.color='#fff'}
            onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.55)'}>
              Stations
            </Link>
            {role === 'admin' && (
              <Link to={`/${adminSlug}`} style={{
                padding:'5px 12px', borderRadius:7,
                fontSize:'0.82rem', fontWeight:500,
                color:'rgba(167,139,250,0.7)', textDecoration:'none',
                display:'flex', alignItems:'center', gap:5,
                transition:'color 150ms ease',
              }}
              onMouseEnter={e=>e.currentTarget.style.color='#a78bfa'}
              onMouseLeave={e=>e.currentTarget.style.color='rgba(167,139,250,0.7)'}>
                <Shield size={13}/> Admin
              </Link>
            )}
          </div>

          {/* Right: auth */}
          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            {!user ? (
              <>
                <button onClick={openLogin} style={{
                  ...btnBase,
                  background:'transparent',
                  border:'1px solid rgba(255,255,255,0.12)',
                  color:'rgba(255,255,255,0.65)',
                }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.25)';e.currentTarget.style.color='#fff';}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.12)';e.currentTarget.style.color='rgba(255,255,255,0.65)';}}
                >Login</button>

                <button onClick={openRegister} style={{
                  ...btnBase,
                  background:'linear-gradient(135deg,#7c3aed,#9333ea)',
                  border:'1px solid rgba(124,58,237,0.5)',
                  color:'#fff',
                  boxShadow:'0 0 14px rgba(124,58,237,0.35)',
                }}
                onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 0 22px rgba(124,58,237,0.55)';e.currentTarget.style.opacity='0.92';}}
                onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 0 14px rgba(124,58,237,0.35)';e.currentTarget.style.opacity='1';}}
                >Register</button>
              </>
            ) : (
              /* Logged-in avatar + dropdown */
              <div style={{ position:'relative' }}>
                <button onClick={() => setDropOpen(o => !o)} style={{
                  display:'flex', alignItems:'center', gap:8,
                  padding:'5px 10px 5px 6px', borderRadius:10,
                  background:'rgba(255,255,255,0.05)',
                  border:'1px solid rgba(255,255,255,0.1)',
                  cursor:'pointer', transition:'background 150ms ease',
                }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.09)'}
                onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'}>
                  {/* Avatar circle */}
                  <div style={{
                    width:28, height:28, borderRadius:'50%',
                    background:'linear-gradient(135deg,#7c3aed,#a855f7)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'0.75rem', fontWeight:700, color:'#fff', flexShrink:0,
                  }}>{avatarLetter}</div>
                  <span style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.7)', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {user.displayName ?? user.email?.split('@')[0]}
                  </span>
                  {role === 'admin' && (
                    <span style={{
                      fontSize:'0.58rem', fontWeight:700, letterSpacing:'0.08em',
                      padding:'1px 6px', borderRadius:99,
                      background:'rgba(124,58,237,0.25)', border:'1px solid rgba(124,58,237,0.4)',
                      color:'#c4b5fd',
                    }}>ADMIN</span>
                  )}
                  <ChevronDown size={13} style={{ color:'rgba(255,255,255,0.4)', transform: dropOpen ? 'rotate(180deg)' : 'rotate(0)', transition:'transform 150ms ease' }} />
                </button>

                {/* Dropdown */}
                {dropOpen && (
                  <div style={{
                    position:'absolute', top:'calc(100% + 8px)', right:0,
                    background:'#1a1a22',
                    border:'1px solid rgba(255,255,255,0.09)',
                    borderRadius:12, overflow:'hidden',
                    minWidth:180,
                    boxShadow:'0 12px 32px rgba(0,0,0,0.6)',
                    animation:'fadeInUp 0.15s ease',
                    zIndex:50,
                  }}>
                    <div style={{ padding:'10px 14px 8px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.4)' }}>Signed in as</div>
                      <div style={{ fontSize:'0.82rem', color:'#e8e8f0', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.email}</div>
                    </div>
                    {role === 'admin' && (
                      <Link to={`/${adminSlug}`} onClick={() => setDropOpen(false)} style={{
                        display:'flex', alignItems:'center', gap:9,
                        padding:'10px 14px', fontSize:'0.83rem',
                        color:'#a78bfa', textDecoration:'none',
                        transition:'background 150ms ease',
                      }}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(124,58,237,0.1)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <Shield size={14}/> Admin Dashboard
                      </Link>
                    )}
                    <button onClick={handleLogout} style={{
                      width:'100%', display:'flex', alignItems:'center', gap:9,
                      padding:'10px 14px', fontSize:'0.83rem',
                      color:'rgba(255,255,255,0.55)', textAlign:'left',
                      background:'transparent', border:'none', cursor:'pointer',
                      transition:'background 150ms ease',
                    }}
                    onMouseEnter={e=>{e.currentTarget.style.background='rgba(239,68,68,0.08)';e.currentTarget.style.color='#fca5a5';}}
                    onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='rgba(255,255,255,0.55)';}}
                    >
                      <LogOut size={14}/> Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} defaultTab={authTab} />
    </>
  );
}
