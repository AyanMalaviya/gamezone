import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { createSlugSession } from '../lib/adminSlug';

const PUBLIC_NAV = [
  { label: 'Home',     href: '/' },
  { label: 'Stations', href: '/stations' },
  { label: 'Pricing',  href: '#pricing' },
  { label: 'Contact',  href: '#contact' },
];

function GZLogo() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-label="GameZone logo">
      <defs>
        <linearGradient id="lgn" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
        <filter id="glow-logo">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#lgn)" filter="url(#glow-logo)" />
      <path d="M10 20 L16 12 L24 12 L24 17 L20 17 L20 14 L17 14 L13 20 L17 26 L20 26 L20 23 L24 23 L24 28 L16 28 Z" fill="white" />
      <path d="M26 16 L30 16 L30 18 L28 18 L28 22 L30 22 L30 24 L26 24 L26 22 L27 22 L27 18 L26 18 Z" fill="rgba(255,255,255,0.7)" />
    </svg>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobile] = useState(false);
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user, role, adminSlug, slugExpiry, setAdminSlug, logout } = useAuthStore();

  const isAdmin   = role === 'admin';
  const slugAlive = adminSlug && slugExpiry && Date.now() < slugExpiry;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobile(false); }, [location.pathname]);

  const isActive = (href) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href);

  const goAuth = (mode) => { navigate(`/auth/${mode}`); setMobile(false); };

  // Called when admin clicks "Dashboard" button.
  // Generates a fresh slug (or reuses alive one), stores it, then navigates.
  const handleDashboardClick = (e) => {
    e.preventDefault();
    setMobile(false);
    if (slugAlive) {
      // Slug still valid — just navigate to it
      navigate(`/${adminSlug}`);
    } else {
      // Generate a brand-new slug session
      const { slug, expiry } = createSlugSession();
      setAdminSlug(slug, expiry);
      // React Router registers the route on next render; use setTimeout to let
      // the store update propagate before navigating.
      setTimeout(() => navigate(`/${slug}`), 0);
    }
  };

  return (
    <>
      <div className="navbar-border-light" />

      <header
        className={`navbar-root${scrolled ? ' navbar-scrolled' : ''}`}
        role="banner"
      >
        <div className="navbar-scan" />

        <div className="navbar-inner">
          {/* Logo */}
          <Link to="/" className="navbar-logo" aria-label="GameZone home">
            <GZLogo />
            <span className="navbar-logo-text">
              GAME<span className="navbar-logo-accent">ZONE</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="navbar-links" aria-label="Primary navigation">
            {PUBLIC_NAV.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className={`navbar-link${isActive(link.href) ? ' navbar-link-active' : ''}`}
              >
                {link.label}
                <span className="navbar-link-bar" />
              </Link>
            ))}

            {/* Admin dashboard button — visible to any admin user, slug generated on click */}
            {isAdmin && (
              <a
                href="#"
                onClick={handleDashboardClick}
                className={`navbar-link navbar-link-admin${
                  slugAlive && adminSlug && isActive(`/${adminSlug}`) ? ' navbar-link-active' : ''
                }`}
                title="Admin Dashboard"
              >
                <LayoutDashboard size={14} style={{ display:'inline', marginRight:5, verticalAlign:'middle' }} />
                Dashboard
                <span className="navbar-link-bar" />
              </a>
            )}
          </nav>

          {/* Auth buttons */}
          <div className="navbar-auth">
            {user ? (
              <>
                <span className="navbar-user-pill">
                  <span className="navbar-user-dot" />
                  {isAdmin && (
                    <span style={{
                      fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.06em',
                      background:'linear-gradient(90deg,#7c3aed,#a855f7)',
                      color:'#fff', padding:'1px 6px', borderRadius:4,
                      marginRight:5, textTransform:'uppercase',
                    }}>ADMIN</span>
                  )}
                  {user.email?.split('@')[0]}
                </span>
                <button
                  className="navbar-btn navbar-btn-ghost"
                  onClick={logout}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <button
                  className="navbar-btn navbar-btn-ghost"
                  onClick={() => goAuth('login')}
                >
                  Login
                </button>
                <button
                  className="navbar-btn navbar-btn-primary"
                  onClick={() => goAuth('register')}
                >
                  <span className="navbar-btn-shine" />
                  Register
                </button>
              </>
            )}
          </div>

          {/* Hamburger */}
          <button
            className="navbar-hamburger"
            onClick={() => setMobile(v => !v)}
            aria-expanded={mobileOpen}
            aria-label="Toggle navigation"
          >
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
            <Link
              key={link.label}
              to={link.href}
              className={`mobile-nav-link${isActive(link.href) ? ' mobile-nav-active' : ''}`}
              onClick={() => setMobile(false)}
            >
              {link.label}
            </Link>
          ))}

          {isAdmin && (
            <a
              href="#"
              onClick={handleDashboardClick}
              className="mobile-nav-link mobile-nav-admin"
            >
              <LayoutDashboard size={14} style={{ display:'inline', marginRight:6, verticalAlign:'middle' }} />
              Dashboard
            </a>
          )}

          <div className="mobile-auth-row">
            {user ? (
              <button
                className="navbar-btn navbar-btn-ghost w-full"
                onClick={() => { logout(); setMobile(false); }}
              >
                Sign out
              </button>
            ) : (
              <>
                <button
                  className="navbar-btn navbar-btn-ghost"
                  onClick={() => goAuth('login')}
                >
                  Login
                </button>
                <button
                  className="navbar-btn navbar-btn-primary"
                  onClick={() => goAuth('register')}
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
