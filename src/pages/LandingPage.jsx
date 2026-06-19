import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AuthModal from '../components/AuthModal';

/* ── helpers ── */
function useCountUp(target, duration = 2000, startWhen = true) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!startWhen) return;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, startWhen]);
  return count;
}

function useInView(threshold = 0.2) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function StatItem({ value, suffix = '', label, duration = 2000, inView }) {
  const count = useCountUp(value, duration, inView);
  return (
    <div className="stat-item">
      <span className="stat-value">{count}{suffix}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
        <rect x="2" y="6" width="20" height="14" rx="2" />
        <path d="M8 6V4h8v2" />
        <circle cx="12" cy="13" r="1.5" fill="currentColor" />
        <path d="M9 10v6M15 10v6M6 13h3M15 13h3" />
      </svg>
    ),
    title: 'PS5 Stations',
    desc: '14 latest-gen Sony PlayStation 5 stations loaded with 80+ game titles.',
    accent: '#a855f7',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
        <rect x="1" y="4" width="22" height="14" rx="2" />
        <path d="M8 18v2H5M16 18v2h3" />
        <path d="M5 9h14M5 12h8" />
      </svg>
    ),
    title: '27″ Monitors',
    desc: 'Ultra-wide 4K curved displays at 165 Hz — no motion blur, pure immersion.',
    accent: '#7c3aed',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.4" />
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      </svg>
    ),
    title: 'Racing Simulator',
    desc: 'Full cockpit racing rig with force-feedback wheel, pedals, and wraparound display.',
    accent: '#c026d3',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    title: 'Live Availability',
    desc: 'Real-time station map — see which PS5 is free and what game is running right now.',
    accent: '#06b6d4',
  },
];

const GAMES = [
  'God of War Ragnarök', 'Spider-Man 2', 'Elden Ring', 'Gran Turismo 7',
  'Call of Duty', 'FIFA 25', 'Mortal Kombat 1', 'Hogwarts Legacy',
  'Returnal', 'Ratchet & Clank', "Demon's Souls", 'Resident Evil 4',
];

const PRICING = [
  {
    id: 'ps5',
    label: 'PS5 Setup',
    price: 100,
    unit: 'per hour',
    accent: '#a855f7',
    accentDim: 'rgba(168,85,247,0.18)',
    accentBorder: 'rgba(168,85,247,0.35)',
    badge: null,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
        <rect x="2" y="6" width="20" height="14" rx="2" />
        <path d="M8 6V4h8v2" />
        <circle cx="12" cy="13" r="1.5" fill="currentColor" />
        <path d="M9 10v6M15 10v6M6 13h3M15 13h3" />
      </svg>
    ),
    perks: [
      'Sony PlayStation 5 console',
      '27″ 4K 165 Hz curved display',
      'DualSense haptic controller',
      'Access to 80+ game titles',
      'Private station, no time sharing',
    ],
  },
  {
    id: 'racing',
    label: 'Racing Simulator',
    price: 250,
    unit: 'per hour',
    accent: '#c026d3',
    accentDim: 'rgba(192,38,211,0.18)',
    accentBorder: 'rgba(192,38,211,0.45)',
    badge: 'PREMIUM',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.4" />
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      </svg>
    ),
    perks: [
      'Full cockpit racing rig',
      'Force-feedback steering wheel',
      'Clutch + brake + throttle pedals',
      'Wraparound immersive display',
      'Gran Turismo 7 & more titles',
    ],
  },
];

export default function LandingPage() {
  const [authModal, setAuthModal] = useState(null);
  const [statsRef, statsInView]   = useInView(0.3);
  const [featRef, featInView]     = useInView(0.1);
  const [gamesRef, gamesInView]   = useInView(0.2);
  const [pricingRef, pricingInView] = useInView(0.15);
  const heroRef = useRef(null);

  /* Particle canvas */
  useEffect(() => {
    const canvas = document.getElementById('hero-particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = canvas.width  = canvas.offsetWidth;
    let h = canvas.height = canvas.offsetHeight;
    let raf;

    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() * 1.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.6 + 0.2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(168,85,247,${p.alpha})`;
        ctx.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();

    const resize = () => {
      w = canvas.width  = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <div className="landing-root">
      <Navbar onAuthClick={setAuthModal} />
      {authModal && <AuthModal mode={authModal} onClose={() => setAuthModal(null)} />}

      {/* ════════ HERO ════════ */}
      <section className="hero-section" ref={heroRef}>
        <canvas id="hero-particles" className="hero-canvas" aria-hidden="true" />
        <div className="hero-blob hero-blob-1" aria-hidden="true" />
        <div className="hero-blob hero-blob-2" aria-hidden="true" />
        <div className="hero-grid" aria-hidden="true" />

        <div className="hero-content">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            Now open in Juhapura, Ahmedabad
          </div>

          <h1 className="hero-heading">
            <span className="hero-line hero-line-1">LEVEL UP</span>
            <span className="hero-line hero-line-2">
              YOUR <span className="hero-neon">GAME</span>
            </span>
          </h1>

          <p className="hero-sub">
            14 PS5 stations · Ultra-wide 4K · Racing simulator · Real-time booking
          </p>

          <div className="hero-cta-row">
            <Link to="/stations" className="cta-primary">
              <span className="cta-shine" />
              Check Availability
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <button className="cta-secondary" onClick={() => setAuthModal('register')}>
              Book a Slot
            </button>
          </div>
        </div>

        <div className="hero-scroll" aria-hidden="true">
          <div className="scroll-bar"><div className="scroll-thumb" /></div>
        </div>
        <div className="hero-slice" aria-hidden="true" />
      </section>

      {/* ════════ STATS ════════ */}
      <section className="stats-section" ref={statsRef}>
        <div className="stats-neon-line stats-neon-top" />
        <div className="stats-inner">
          <StatItem value={14}   suffix=""   label="PS5 Stations"       inView={statsInView} />
          <div className="stats-divider" />
          <StatItem value={27}   suffix="″"  label="Monitor Size"       inView={statsInView} duration={1500} />
          <div className="stats-divider" />
          <StatItem value={80}   suffix="+"  label="Game Titles"        inView={statsInView} duration={2200} />
          <div className="stats-divider" />
          <StatItem value={1}    suffix=""   label="Racing Simulator"   inView={statsInView} duration={800}  />
          <div className="stats-divider" />
          <StatItem value={165}  suffix="Hz" label="Refresh Rate"       inView={statsInView} duration={1800} />
        </div>
        <div className="stats-neon-line stats-neon-bottom" />
        <div className="stats-slice" />
      </section>

      {/* ════════ FEATURES ════════ */}
      <section className="features-section" ref={featRef}>
        <div className="section-header">
          <p className="section-eyebrow">What we offer</p>
          <h2 className="section-title">Everything you need to <span className="section-title-accent">dominate</span></h2>
        </div>

        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`feature-slab${featInView ? ' feat-visible' : ''}`}
              style={{ '--feat-delay': `${i * 120}ms`, '--feat-accent': f.accent }}
            >
              <div className="feat-running-border" />
              <div className="feat-icon" style={{ color: f.accent }}>{f.icon}</div>
              <h3 className="feat-title">{f.title}</h3>
              <p className="feat-desc">{f.desc}</p>
              <div className="feat-slash" />
            </div>
          ))}
        </div>

        <div className="features-slice" />
      </section>

      {/* ════════ GAME TICKER ════════ */}
      <section className="ticker-section" ref={gamesRef}>
        <div className="ticker-top-slash" />
        <p className="ticker-eyebrow">Now playing across stations</p>
        <div className="ticker-track" aria-hidden="true">
          <div className="ticker-inner">
            {[...GAMES, ...GAMES].map((g, i) => (
              <span key={i} className="ticker-item">
                <span className="ticker-dot" />
                {g}
              </span>
            ))}
          </div>
        </div>
        <div className="ticker-bottom-slash" />
      </section>

      {/* ════════ PRICING ════════ */}
      <section className="pricing-section" id="pricing" ref={pricingRef}>
        <div className="section-header">
          <p className="section-eyebrow">Simple pricing</p>
          <h2 className="section-title">Pay per hour. <span className="section-title-accent">No hidden fees.</span></h2>
        </div>

        <div className="pricing-grid">
          {PRICING.map((plan, i) => (
            <div
              key={plan.id}
              className={`pricing-card${pricingInView ? ' pricing-card-visible' : ''}`}
              style={{
                '--pc-accent': plan.accent,
                '--pc-accent-dim': plan.accentDim,
                '--pc-accent-border': plan.accentBorder,
                '--pc-delay': `${i * 150}ms`,
              }}
            >
              {/* running animated border */}
              <div className="pc-running-border" />

              {plan.badge && (
                <div className="pc-badge">{plan.badge}</div>
              )}

              <div className="pc-icon" style={{ color: plan.accent }}>{plan.icon}</div>

              <h3 className="pc-label">{plan.label}</h3>

              <div className="pc-price-row">
                <span className="pc-currency">₹</span>
                <span className="pc-amount">{plan.price}</span>
                <span className="pc-unit">/{plan.unit}</span>
              </div>

              <div className="pc-divider" />

              <ul className="pc-perks">
                {plan.perks.map(perk => (
                  <li key={perk} className="pc-perk">
                    <svg className="pc-check" viewBox="0 0 16 16" fill="none" width="14" height="14">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {perk}
                  </li>
                ))}
              </ul>

              <button
                className="pc-cta"
                onClick={() => setAuthModal('register')}
              >
                Book Now
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <p className="pricing-note">
          Walk-ins welcome · No membership required · Pay at the counter or book online
        </p>
      </section>

      {/* ════════ CTA BANNER ════════ */}
      <section className="cta-banner">
        <div className="cta-banner-glow" />
        <div className="cta-banner-border" />
        <div className="cta-banner-inner">
          <p className="cta-banner-eyebrow">Ready to play?</p>
          <h2 className="cta-banner-heading">Walk in. <span className="cta-neon">Power on.</span> Play.</h2>
          <p className="cta-banner-sub">No membership required. Pay per hour or book a slot in advance.</p>
          <div className="hero-cta-row">
            <Link to="/stations" className="cta-primary">
              <span className="cta-shine" />
              View Live Stations
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <button className="cta-secondary" onClick={() => setAuthModal('register')}>
              Create Account
            </button>
          </div>
        </div>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer className="landing-footer" id="contact">
        <div className="footer-neon-top" />
        <div className="footer-inner">
          <div className="footer-brand">
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="10" fill="rgba(124,58,237,0.3)" />
              <path d="M10 20 L16 12 L24 12 L24 17 L20 17 L20 14 L17 14 L13 20 L17 26 L20 26 L20 23 L24 23 L24 28 L16 28 Z" fill="#a855f7" />
            </svg>
            <span className="footer-name">GAMEZONE</span>
          </div>
          <p className="footer-tagline">Surat's premium gaming arena</p>
          <p className="footer-copy">© {new Date().getFullYear()} GameZone. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
