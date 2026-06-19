import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import '../styles/pricing.css';

/* ─── data ─────────────────────────────────────────────── */
const SETUPS = [
  {
    id: 'ps5',
    icon: '🎮',
    label: 'PS5 / Regular Setup',
    tagline: 'Console gaming at its finest',
    price: 100,
    unit: '/ hour',
    accent: '#a855f7',
    accentDim: 'rgba(168,85,247,0.1)',
    accentBorder: 'rgba(168,85,247,0.35)',
    specs: [
      { icon: '🖥️', title: 'Display',     value: '55" 4K OLED TV, 120Hz, HDR10+' },
      { icon: '🎮', title: 'Console',     value: 'PlayStation 5 (Disc Edition)' },
      { icon: '🎧', title: 'Audio',       value: 'Pulse 3D Wireless Headset' },
      { icon: '🕹️', title: 'Controllers', value: '2× DualSense (haptic + adaptive triggers)' },
      { icon: '📡', title: 'Network',     value: '100 Mbps dedicated fibre' },
      { icon: '🛋️', title: 'Seating',     value: 'Ergonomic gaming chair' },
      { icon: '💡', title: 'Ambience',    value: 'RGB backlit booth, AC cooled' },
      { icon: '🎲', title: 'Game Library','value': '300+ titles incl. FIFA, GTA, CoD, God of War' },
    ],
    perks: [
      'Walk-in & advance booking',
      'Refreshment included (water + 1 soft drink)',
      'Save progress via PSN account',
      'Multiplayer on same screen or online',
    ],
  },
  {
    id: 'racing',
    icon: '🏎️',
    label: 'Racing Simulator',
    tagline: 'Feel every corner, every kerb',
    price: 250,
    unit: '/ hour',
    accent: '#f59e0b',
    accentDim: 'rgba(245,158,11,0.1)',
    accentBorder: 'rgba(245,158,11,0.4)',
    badge: 'PREMIUM',
    specs: [
      { icon: '🖥️', title: 'Display',      value: '3× 27" curved monitors, 180° FOV, 165Hz' },
      { icon: '🏎️', title: 'Steering Rig', value: 'Logitech G Pro Wheel + Pedals (load-cell brake)' },
      { icon: '💺', title: 'Seat',         value: 'Full motion racing bucket seat with harness' },
      { icon: '📳', title: 'Haptics',      value: 'Bass shakers — feel road texture & collisions' },
      { icon: '🎧', title: 'Audio',        value: 'Surround sound headset + booth speakers' },
      { icon: '🎮', title: 'Titles',       value: 'F1 24, Gran Turismo 7, Assetto Corsa, Dirt Rally' },
      { icon: '📡', title: 'Network',      value: '100 Mbps — online racing ready' },
      { icon: '🛠️', title: 'Setup Help',   value: 'Staff assisted rig setup & calibration' },
    ],
    perks: [
      'Advance booking strongly recommended',
      'Staff-assisted rig calibration',
      'Refreshment included (water + 1 energy drink)',
      'Leaderboard tracking across sessions',
    ],
  },
];

const MEMBERSHIPS = [
  {
    id: 'monthly',
    icon: '📅',
    label: 'Monthly Pass',
    duration: '1 Month',
    daysPerWeek: 4,
    hrsPerDay: 1,
    totalHours: 16,
    price: 1600,
    originalPrice: 1720,
    saving: '7% off',
    accent: '#a855f7',
    accentDim: 'rgba(168,85,247,0.1)',
    accentBorder: 'rgba(168,85,247,0.35)',
    breakdown: '4 days/week · 1 hr/day · ~4 weeks',
    perks: [
      'Priority slot booking (24hr advance)',
      'Access to PS5 Regular setups',
      'Rollover unused sessions (max 2)',
      'Member-only game nights',
      'Refreshments included every visit',
      'Digital membership card',
    ],
  },
  {
    id: 'quarterly',
    icon: '🗓️',
    label: 'Quarterly Pass',
    duration: '3 Months',
    daysPerWeek: 3,
    hrsPerDay: 1,
    totalHours: 36,
    price: 3200,
    originalPrice: 3900,
    saving: '18% off',
    accent: '#06b6d4',
    accentDim: 'rgba(6,182,212,0.1)',
    accentBorder: 'rgba(6,182,212,0.35)',
    badge: 'BEST VALUE',
    breakdown: '3 days/week · 1 hr/day · ~13 weeks',
    perks: [
      'Priority slot booking (48hr advance)',
      'Access to PS5 Regular setups',
      '1 free Racing Simulator session/month',
      'Rollover unused sessions (max 4)',
      'Member-only tournaments entry',
      'Refreshments included every visit',
      'Physical membership card',
      'Exclusive quarterly leaderboard ranking',
    ],
  },
  {
    id: 'champion',
    icon: '🏆',
    label: 'Champion Pass',
    duration: '1 Month — FREE',
    daysPerWeek: 4,
    hrsPerDay: 1,
    totalHours: 16,
    price: 0,
    originalPrice: 1600,
    saving: '100% FREE',
    accent: '#f59e0b',
    accentDim: 'rgba(245,158,11,0.1)',
    accentBorder: 'rgba(245,158,11,0.4)',
    badge: 'TOURNAMENT WINNERS',
    breakdown: 'Awarded to tournament champions',
    perks: [
      'Full Monthly Pass benefits',
      'Priority booking on all setups',
      'Access to Racing Simulator included',
      'Champion profile badge on leaderboard',
      'Featured on GameZone Hall of Fame',
      'Free refreshments every visit',
      'Exclusive champion-only events',
      'Bragging rights 🏆',
    ],
  },
];

const FAQS = [
  { q: 'Can I book in advance?',         a: 'Yes — regular users can book 12 hours ahead. Monthly members get 24-hour priority booking, and quarterly members get 48-hour advance booking.' },
  { q: 'What happens if I arrive late?', a: 'Your slot is held for 10 minutes. After that it may be released to walk-in customers. We recommend arriving 5 minutes early.' },
  { q: 'Can I use my own controller?',   a: 'Absolutely. Personal peripherals are welcome for hygiene and comfort. We also provide sanitised controllers at every station.' },
  { q: 'Is the Racing Sim for beginners too?', a: 'Yes! Staff will help calibrate the rig for your skill level. Beginners start on assisted modes; experienced drivers can go full simulation.' },
  { q: 'How do memberships work?',       a: 'Memberships give you a fixed number of 1-hour sessions per week. Unused sessions (up to the rollover limit) carry over to the next week.' },
  { q: 'How do I claim a Champion Pass?', a: 'Tournament winners are automatically issued a Champion Pass after the podium ceremony. Just show your GameZone tournament ID at the front desk.' },
];

/* ─── component ─────────────────────────────────────────── */
export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState(null);
  const [tab, setTab] = useState('payg'); // 'payg' | 'membership'
  const cardRefs = useRef([]);

  /* intersection observer for card reveal */
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('prx-visible');
      }),
      { threshold: 0.12 }
    );
    cardRefs.current.forEach(el => el && io.observe(el));
    return () => io.disconnect();
  }, [tab]);

  const allCards = [...SETUPS, ...MEMBERSHIPS];

  return (
    <div className="prx-root">
      <Navbar />

      {/* ── hero ── */}
      <section className="prx-hero">
        <div className="prx-hero-grid" />
        <div className="prx-hero-blob prx-blob-1" />
        <div className="prx-hero-blob prx-blob-2" />
        <div className="prx-hero-content">
          <span className="prx-eyebrow">💰 Transparent Pricing</span>
          <h1 className="prx-hero-title">
            SIMPLE.<br />
            <span className="prx-neon">FAIR.</span><br />
            EPIC.
          </h1>
          <p className="prx-hero-sub">
            Pay as you go or save big with a membership —<br />
            no hidden charges, ever.
          </p>
          <div className="prx-tab-row">
            <button
              className={`prx-tab-btn${tab === 'payg' ? ' prx-tab-active' : ''}`}
              onClick={() => setTab('payg')}
            >Pay-As-You-Go</button>
            <button
              className={`prx-tab-btn${tab === 'membership' ? ' prx-tab-active' : ''}`}
              onClick={() => setTab('membership')}
            >Memberships</button>
          </div>
        </div>
      </section>

      {/* ── pay-as-you-go ── */}
      {tab === 'payg' && (
        <section className="prx-section">
          <div className="prx-section-inner">
            <p className="prx-section-desc">
              Walk in, pick your station, pay only for the time you play.
            </p>
            <div className="prx-setups-grid">
              {SETUPS.map((s, i) => (
                <div
                  key={s.id}
                  className="prx-setup-card"
                  ref={el => cardRefs.current[i] = el}
                  style={{
                    '--sa': s.accent,
                    '--sad': s.accentDim,
                    '--sab': s.accentBorder,
                    '--pc-delay': `${i * 120}ms`,
                  }}
                >
                  {s.badge && <span className="prx-card-badge">{s.badge}</span>}
                  <div className="prx-card-icon-wrap" style={{ background: s.accentDim }}>
                    <span className="prx-card-icon">{s.icon}</span>
                  </div>
                  <h2 className="prx-card-label">{s.label}</h2>
                  <p className="prx-card-tagline">{s.tagline}</p>

                  <div className="prx-price-row">
                    <span className="prx-rupee">₹</span>
                    <span className="prx-amount">{s.price}</span>
                    <span className="prx-unit">{s.unit}</span>
                  </div>

                  <div className="prx-divider" />

                  {/* specs */}
                  <h3 className="prx-specs-heading">What's Included</h3>
                  <ul className="prx-specs-list">
                    {s.specs.map((sp, j) => (
                      <li key={j} className="prx-spec-item">
                        <span className="prx-spec-icon">{sp.icon}</span>
                        <span>
                          <strong className="prx-spec-title">{sp.title}</strong>
                          <span className="prx-spec-value"> — {sp.value}</span>
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="prx-divider" />

                  {/* perks */}
                  <h3 className="prx-specs-heading">Perks</h3>
                  <ul className="prx-perks-list">
                    {s.perks.map((p, j) => (
                      <li key={j} className="prx-perk-item">
                        <span className="prx-perk-check">✓</span>
                        {p}
                      </li>
                    ))}
                  </ul>

                  <Link to="/stations" className="prx-cta-btn">
                    Book a Station →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── memberships ── */}
      {tab === 'membership' && (
        <section className="prx-section">
          <div className="prx-section-inner">
            <p className="prx-section-desc">
              Commit to a plan, slash your per-session cost, and unlock exclusive perks.
            </p>

            {/* pricing math callout */}
            <div className="prx-math-callout">
              <span className="prx-math-icon">🧮</span>
              <div>
                <strong>How we calculate membership prices</strong>
                <p>Regular rate is ₹100/hr. Memberships bill you for fewer hours than you actually play — the difference is your saving. Racing Simulator sessions are billed separately unless you have the Quarterly Pass or Champion Pass.</p>
              </div>
            </div>

            <div className="prx-mem-grid">
              {MEMBERSHIPS.map((m, i) => (
                <div
                  key={m.id}
                  className={`prx-mem-card${m.id === 'quarterly' ? ' prx-mem-featured' : ''}`}
                  ref={el => cardRefs.current[i] = el}
                  style={{
                    '--ma': m.accent,
                    '--mad': m.accentDim,
                    '--mab': m.accentBorder,
                    '--pc-delay': `${i * 120}ms`,
                  }}
                >
                  {m.badge && (
                    <span className="prx-mem-badge" style={{ background: m.id === 'champion' ? 'linear-gradient(90deg,#f59e0b,#ef4444)' : m.id === 'quarterly' ? 'linear-gradient(90deg,#06b6d4,#7c3aed)' : undefined }}>
                      {m.badge}
                    </span>
                  )}

                  <div className="prx-mem-icon-wrap" style={{ background: m.accentDim }}>
                    <span className="prx-mem-icon">{m.icon}</span>
                  </div>

                  <h2 className="prx-mem-label">{m.label}</h2>
                  <p className="prx-mem-duration">{m.duration}</p>
                  <p className="prx-mem-breakdown">{m.breakdown}</p>

                  {/* price */}
                  <div className="prx-mem-price-row">
                    {m.price === 0 ? (
                      <span className="prx-mem-free">FREE 🏆</span>
                    ) : (
                      <>
                        <span className="prx-rupee" style={{ color: m.accent }}>₹</span>
                        <span className="prx-mem-amount" style={{ color: m.accent, textShadow: `0 0 24px ${m.accent}88` }}>{m.price.toLocaleString()}</span>
                        <span className="prx-unit">/ {m.duration.toLowerCase()}</span>
                      </>
                    )}
                  </div>

                  {m.originalPrice > 0 && (
                    <div className="prx-mem-saving-row">
                      <span className="prx-mem-original">Was ₹{m.originalPrice.toLocaleString()}</span>
                      <span className="prx-mem-saving-badge">{m.saving}</span>
                    </div>
                  )}

                  {/* schedule breakdown */}
                  <div className="prx-schedule-box" style={{ borderColor: m.accentBorder, background: m.accentDim }}>
                    <div className="prx-schedule-row">
                      <span className="prx-sch-label">Sessions / week</span>
                      <span className="prx-sch-val" style={{ color: m.accent }}>{m.daysPerWeek} days</span>
                    </div>
                    <div className="prx-schedule-row">
                      <span className="prx-sch-label">Duration / session</span>
                      <span className="prx-sch-val" style={{ color: m.accent }}>{m.hrsPerDay} hour</span>
                    </div>
                    <div className="prx-schedule-row">
                      <span className="prx-sch-label">Total hours included</span>
                      <span className="prx-sch-val" style={{ color: m.accent }}>{m.totalHours} hrs</span>
                    </div>
                    {m.price > 0 && (
                      <div className="prx-schedule-row prx-sch-rate">
                        <span className="prx-sch-label">Effective rate</span>
                        <span className="prx-sch-val" style={{ color: m.accent }}>₹{Math.round(m.price / m.totalHours)}/hr</span>
                      </div>
                    )}
                  </div>

                  <div className="prx-divider" />

                  <h3 className="prx-specs-heading">What You Get</h3>
                  <ul className="prx-perks-list">
                    {m.perks.map((p, j) => (
                      <li key={j} className="prx-perk-item">
                        <span className="prx-perk-check" style={{ color: m.accent }}>✓</span>
                        {p}
                      </li>
                    ))}
                  </ul>

                  {m.id === 'champion' ? (
                    <div className="prx-champion-note">
                      🏆 Automatically awarded to GameZone tournament winners
                    </div>
                  ) : (
                    <Link to="/auth/login" className="prx-cta-btn" style={{ '--cta-accent': m.accent, '--cta-dim': m.accentDim, '--cta-border': m.accentBorder }}>
                      Get {m.label} →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── comparison table ── */}
      <section className="prx-compare-section">
        <div className="prx-section-inner">
          <h2 className="prx-compare-heading">Plan Comparison</h2>
          <div className="prx-table-wrap">
            <table className="prx-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Pay-As-You-Go</th>
                  <th>Monthly Pass</th>
                  <th className="prx-th-featured">Quarterly Pass</th>
                  <th>Champion Pass</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Price',               '₹100/hr',    '₹1,600/mo',  '₹3,200/qtr', 'FREE'],
                  ['Sessions/week',       'Unlimited',  '4 days',     '3 days',     '4 days'],
                  ['Advance booking',     '—',          '24 hrs',     '48 hrs',     '48 hrs'],
                  ['Rollover sessions',   '—',          'Max 2',      'Max 4',      'Max 2'],
                  ['Racing Sim access',   '₹250/hr',    '₹250/hr',    '1 free/mo',  'Included'],
                  ['Refreshments',        'Paid',       'Included',   'Included',   'Included'],
                  ['Tournament entry',    '—',          '—',          '✓',          '✓'],
                  ['Leaderboard badge',   '—',          '—',          '—',          '🏆 Champion'],
                  ['Hall of Fame',        '—',          '—',          '—',          '✓'],
                ].map(([feat, ...vals], i) => (
                  <tr key={i}>
                    <td className="prx-td-feat">{feat}</td>
                    {vals.map((v, j) => (
                      <td key={j} className={j === 2 ? 'prx-td-featured' : ''}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="prx-faq-section">
        <div className="prx-section-inner prx-section-narrow">
          <h2 className="prx-faq-heading">Frequently Asked Questions</h2>
          {FAQS.map((f, i) => (
            <div key={i} className={`prx-faq-item${openFaq === i ? ' prx-faq-open' : ''}`}>
              <button className="prx-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span>{f.q}</span>
                <span className="prx-faq-chevron">{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && <p className="prx-faq-a">{f.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* ── footer cta ── */}
      <section className="prx-footer-cta">
        <h2>Ready to Play?</h2>
        <p>Walk in or book your station right now.</p>
        <div className="prx-footer-cta-btns">
          <Link to="/stations" className="prx-cta-btn">View Stations →</Link>
          <Link to="/auth/login" className="prx-cta-btn prx-cta-ghost">Create Account</Link>
        </div>
      </section>
    </div>
  );
}
