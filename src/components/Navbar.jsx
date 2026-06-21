import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, UserCircle2 } from 'lucide-react';
import useAuthStore from '../store/authStore';

const ADMIN_PATH = 'admin'; // matches <Route path="/admin" /> in App.jsx

const PUBLIC_NAV = [
  { label: 'Home',     href: '/' },
  { label: 'Stations', href: '/stations' },
  { label: 'Pricing',  href: '/pricing' },
];

const GameZoneLogo = ({ size = 36 }) => (
  <svg
    width={size} height={size} viewBox="0 0 48 48"
    fill="none" xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true" style={{ flexShrink: 0, display: 'block' }}
  >
    <defs>
      <radialGradient id="gz-bg" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#1e1040" />
        <stop offset="100%" stopColor="#0a0010" />
      </radialGradient>
      <linearGradient id="gz-ring" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#a855f7" />
        <stop offset="50%" stopColor="#7c3aed" />
        <stop offset="100%" stopColor="#c084fc" />
      </linearGradient>
      <linearGradient id="gz-btn" x1="14" y1="24" x2="34" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#a855f7" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>
      <filter id="gz-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
    <circle cx="24" cy="24" r="23" fill="url(#gz-bg)" />
    <circle cx="24" cy="24" r="22" stroke="url(#gz-ring)" strokeWidth="1.5" fill="none" />
    <rect x="10" y="18" width="28" height="16" rx="7" fill="url(#gz-btn)" filter="url(#gz-glow)" />
    <rect x="14" y="23" width="6" height="2" rx="1" fill="#fff" opacity="0.9" />
    <rect x="16" y="21" width="2" height="6" rx="1" fill="#fff" opacity="0.9" />
    <circle cx="33" cy="23" r="1.4" fill="#f9a8d4" opacity="0.95" />
    <circle cx="36" cy="26" r="1.4" fill="#86efac" opacity="0.95" />
    <circle cx="30" cy="26" r="1.4" fill="#fde68a" opacity="0.95" />
    <circle cx="33" cy="29" r="1.4" fill="#93c5fd" opacity="0.95" />
    <circle cx="24" cy="26" r="2.2" fill="#fff" opacity="0.15" />
    <circle cx="24" cy="26" r="1.2" fill="#c4b5fd" opacity="0.9" />
    <path d="M19 18 Q20 14 24 14 Q28 14 29 18" stroke="#a855f7" strokeWidth="1.2" fill="none" opacity="0.6" />
    <path d="M15 31 Q17 34 20 33" stroke="#c084fc" strokeWidth="0.8" fill="none" opacity="0.5" />
    <path d="M33 31 Q31 34 28 33" stroke="#c084fc" strokeWidth="0.8" fill="none" opacity="0.5" />
    <circle cx="37" cy="13" r="2" fill="#a855f7" opacity="0.5" />
    <circle cx="37" cy="13" r="1" fill="#e879f9" opacity="0.9" />
  </svg>
);

export default function Navbar() {
  const [scrolled,   setScrolled]  = useState(false);
  const [navHidden,  setNavHidden] = useState(false);
  const [mobileOpen, setMobile]    = useState(false);
  const lastScrollY  = useRef(0);
  const ticking      = useRef(false);
  const location     = useLocation();
  const navigate     = useNavigate();
  const { user, role, phone, logout } = useAuthStore();
  const isAdmin = role === 'admin';

  useEffect(() => {
    const HIDE_THRESHOLD = 80;
    const SCROLL_DELTA   = 6;

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const y     = window.scrollY;
        const delta = y - lastScrollY.current;
        setScrolled(y > 30);
        if (y > HIDE_THRESHOLD) {
          if (delta > SCROLL_DELTA)       setNavHidden(true);
          else if (delta < -SCROLL_DELTA) setNavHidden(false);
        } else {
          setNavHidden(false);
        }
        lastScrollY.current = y;
        ticking.current = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobile(false); }, [location.pathname]);
  useEffect(() => { if (mobileOpen) setNavHidden(false); }, [mobileOpen]);

  const isActive = (href) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href);

  const goAuth = (mode) => { navigate(`/auth/${mode}`); setMobile(false); };

  const handleDashboardClick = (e) => {
    e.preventDefault();
    setMobile(false);
    navigate(`/${ADMIN_PATH}`);
  };

  const navClass = ['navbar-root', scrolled ? 'navbar-scrolled' : '', navHidden ? 'navbar-hidden' : ''].filter(Boolean).join(' ');
  const borderClass = ['navbar-border-light', navHidden ? 'navbar-hidden-border' : ''].filter(Boolean).join(' ');

  return (
    <>
      <div className={borderClass} />
      <header className={navClass} role="banner">
        <div className="navbar-scan" />
        <div className="navbar-inner">

          <Link to="/" className="navbar-logo" aria-label="GameZone home">
            <GameZoneLogo size={36} />
            <span className="navbar-logo-text">GAME<span className="navbar-logo-accent">ZONE</span></span>
          </Link>

          <nav className="navbar-links" aria-label="Primary navigation">
            {PUBLIC_NAV.map(link => (
              <Link key={link.label} to={link.href}
                className={`navbar-link${isActive(link.href) ? ' navbar-link-active' : ''}`}>
                {link.label}<span className="navbar-link-bar" />
              </Link>
            ))}
            {isAdmin && (
              <a href="#" onClick={handleDashboardClick}
                className={`navbar-link navbar-link-admin${isActive(`/${ADMIN_PATH}`) ? ' navbar-link-active' : ''}`}
                title="Admin Dashboard">
                <LayoutDashboard size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
                Dashboard<span className="navbar-link-bar" />
              </a>
            )}
          </nav>

          <div className="navbar-auth">
            {user ? (
              <>
                <Link to="/profile" style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 10px', borderRadius: 8,
                  background: isActive('/profile') ? 'rgba(124,58,237,.15)' : 'rgba(255,255,255,.05)',
                  border: `1px solid ${isActive('/profile') ? 'rgba(124,58,237,.3)' : 'rgba(255,255,255,.08)'}`,
                  color: isActive('/profile') ? '#c4b5fd' : 'rgba(255,255,255,.55)',
                  textDecoration: 'none', fontSize: '0.78rem', fontWeight: 600,
                  transition: 'all .2s',
                }}
                onMouseEnter={e => { if (!isActive('/profile')) { e.currentTarget.style.background = 'rgba(255,255,255,.09)'; e.currentTarget.style.color = 'rgba(255,255,255,.85)'; } }}
                onMouseLeave={e => { if (!isActive('/profile')) { e.currentTarget.style.background = 'rgba(255,255,255,.05)'; e.currentTarget.style.color = 'rgba(255,255,255,.55)'; } }}
                >
                  <UserCircle2 size={15} />
                  <span>{user.displayName?.split(' ')[0] || user.email?.split('@')[0]}</span>
                  {!phone && (
                    <span title="Add phone number to book" style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: '#ef4444',
                      boxShadow: '0 0 5px rgba(239,68,68,.6)',
                      flexShrink: 0,
                    }} />
                  )}
                  {isAdmin && (
                    <span style={{
                      fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em',
                      background: 'linear-gradient(90deg,#7c3aed,#a855f7)',
                      color: '#fff', padding: '1px 5px', borderRadius: 3,
                    }}>ADMIN</span>
                  )}
                </Link>
                <button className="navbar-btn navbar-btn-ghost" onClick={logout}>Sign out</button>
              </>
            ) : (
              <>
                <button className="navbar-btn navbar-btn-ghost" onClick={() => goAuth('login')}>Login</button>
                <button className="navbar-btn navbar-btn-primary" onClick={() => goAuth('register')}>
                  <span className="navbar-btn-shine" />Register
                </button>
              </>
            )}
          </div>

          <button className="navbar-hamburger" onClick={() => setMobile(v => !v)}
            aria-expanded={mobileOpen} aria-label="Toggle navigation">
            <span className={`ham-line${mobileOpen ? ' ham-open-1' : ''}`} />
            <span className={`ham-line${mobileOpen ? ' ham-open-2' : ''}`} />
            <span className={`ham-line${mobileOpen ? ' ham-open-3' : ''}`} />
          </button>
        </div>
      </header>

      <div className={`mobile-drawer${mobileOpen ? ' drawer-open' : ''}`} aria-hidden={!mobileOpen}>
        <div className="mobile-drawer-inner">
          {PUBLIC_NAV.map(link => (
            <Link key={link.label} to={link.href}
              className={`mobile-nav-link${isActive(link.href) ? ' mobile-nav-active' : ''}`}
              onClick={() => setMobile(false)}>{link.label}</Link>
          ))}
          {isAdmin && (
            <a href="#" onClick={handleDashboardClick} className="mobile-nav-link mobile-nav-admin">
              <LayoutDashboard size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
              Dashboard
            </a>
          )}
          {user && (
            <Link to="/profile"
              className={`mobile-nav-link${isActive('/profile') ? ' mobile-nav-active' : ''}`}
              onClick={() => setMobile(false)}>
              <UserCircle2 size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
              Profile {!phone && '⚠️'}
            </Link>
          )}
          <div className="mobile-auth-row">
            {user ? (
              <button className="navbar-btn navbar-btn-ghost w-full"
                onClick={() => { logout(); setMobile(false); }}>Sign out</button>
            ) : (
              <>
                <button className="navbar-btn navbar-btn-ghost" onClick={() => goAuth('login')}>Login</button>
                <button className="navbar-btn navbar-btn-primary" onClick={() => goAuth('register')}>Register</button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
