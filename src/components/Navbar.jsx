import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, UserCircle2 } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { ADMIN_PATH } from '../App';

const PUBLIC_NAV = [
  { label: 'Home',     href: '/' },
  { label: 'Stations', href: '/stations' },
  { label: 'Pricing',  href: '/pricing' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobile] = useState(false);
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user, role, phone, logout } = useAuthStore();

  const isAdmin = role === 'admin';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobile(false); }, [location.pathname]);

  const isActive = (href) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href);

  const goAuth = (mode) => { navigate(`/auth/${mode}`); setMobile(false); };

  const handleDashboardClick = (e) => {
    e.preventDefault(); setMobile(false);
    navigate(`/${ADMIN_PATH}`);
  };

  return (
    <>
      <div className="navbar-border-light" />
      <header className={`navbar-root${scrolled ? ' navbar-scrolled' : ''}`} role="banner">
        <div className="navbar-scan" />
        <div className="navbar-inner">

          {/* Logo — use favicon.ico which is guaranteed to exist */}
          <Link to="/" className="navbar-logo" aria-label="GameZone home">
            <img
              src="/favicon.ico"
              alt="GameZone logo"
              width="32" height="32"
              style={{ objectFit: 'contain', display: 'block', flexShrink: 0 }}
            />
            <span className="navbar-logo-text">
              GAME<span className="navbar-logo-accent">ZONE</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="navbar-links" aria-label="Primary navigation">
            {PUBLIC_NAV.map(link => (
              <Link key={link.label} to={link.href}
                className={`navbar-link${isActive(link.href) ? ' navbar-link-active' : ''}`}>
                {link.label}<span className="navbar-link-bar" />
              </Link>
            ))}
            {/* Dashboard — visible only to admins */}
            {isAdmin && (
              <a href="#" onClick={handleDashboardClick}
                className={`navbar-link navbar-link-admin${isActive(`/${ADMIN_PATH}`) ? ' navbar-link-active' : ''}`}
                title="Admin Dashboard">
                <LayoutDashboard size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
                Dashboard<span className="navbar-link-bar" />
              </a>
            )}
          </nav>

          {/* Auth buttons */}
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
                  {/* Red dot if phone missing */}
                  {!phone && (
                    <span title="Add phone number to book" style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: '#ef4444',
                      boxShadow: '0 0 5px rgba(239,68,68,.6)',
                      flexShrink: 0,
                    }} />
                  )}
                  {/* Admin badge */}
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

          {/* Hamburger */}
          <button className="navbar-hamburger" onClick={() => setMobile(v => !v)}
            aria-expanded={mobileOpen} aria-label="Toggle navigation">
            <span className={`ham-line${mobileOpen ? ' ham-open-1' : ''}`} />
            <span className={`ham-line${mobileOpen ? ' ham-open-2' : ''}`} />
            <span className={`ham-line${mobileOpen ? ' ham-open-3' : ''}`} />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
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
