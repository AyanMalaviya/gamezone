import { Link } from 'react-router-dom';

const STYLE_ID = 'gz-footer-styles';
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    .gz-footer {
      background: #0a0a0e;
      border-top: 1px solid rgba(124,58,237,0.18);
      padding: 40px 24px 24px;
      margin-top: auto;
    }
    .gz-footer-inner {
      max-width: 1100px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 28px;
    }
    .gz-footer-top {
      display: flex;
      flex-wrap: wrap;
      gap: 32px;
      justify-content: space-between;
      align-items: flex-start;
    }
    .gz-footer-brand {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 260px;
    }
    .gz-footer-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
    }
    .gz-footer-logo img {
      width: 32px;
      height: 32px;
      object-fit: contain;
    }
    .gz-footer-logo span {
      font-family: 'Rajdhani','Inter',sans-serif;
      font-weight: 800;
      font-size: 1.15rem;
      color: #fff;
      letter-spacing: 0.06em;
    }
    .gz-footer-tagline {
      font-size: 0.78rem;
      color: rgba(255,255,255,0.38);
      line-height: 1.5;
    }
    .gz-footer-links {
      display: flex;
      flex-wrap: wrap;
      gap: 40px;
    }
    .gz-footer-col {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 120px;
    }
    .gz-footer-col-title {
      font-family: 'Rajdhani','Inter',sans-serif;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.35);
      margin-bottom: 2px;
    }
    .gz-footer-col a {
      font-size: 0.84rem;
      color: rgba(255,255,255,0.55);
      text-decoration: none;
      transition: color 0.15s;
    }
    .gz-footer-col a:hover {
      color: #a78bfa;
    }
    .gz-footer-bottom {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-top: 20px;
      border-top: 1px solid rgba(255,255,255,0.06);
    }
    .gz-footer-copy {
      font-size: 0.75rem;
      color: rgba(255,255,255,0.28);
    }
    .gz-footer-legal {
      display: flex;
      gap: 20px;
    }
    .gz-footer-legal a {
      font-size: 0.75rem;
      color: rgba(255,255,255,0.35);
      text-decoration: none;
      transition: color 0.15s;
    }
    .gz-footer-legal a:hover {
      color: #a78bfa;
    }
    @media (max-width: 540px) {
      .gz-footer-top { flex-direction: column; }
      .gz-footer-bottom { flex-direction: column; align-items: flex-start; }
    }
  `;
  document.head.appendChild(s);
}

export default function Footer() {
  injectStyles();
  const year = new Date().getFullYear();

  return (
    <footer className="gz-footer">
      <div className="gz-footer-inner">
        <div className="gz-footer-top">

          {/* Brand — use favicon.ico which is guaranteed to exist */}
          <div className="gz-footer-brand">
            <Link to="/" className="gz-footer-logo">
              <img src="/favicon.ico" alt="GameZone" />
              <span>GAMEZONE</span>
            </Link>
            <p className="gz-footer-tagline">
              Premium gaming lounge · PS5 &amp; Racing Simulator · Real-time seat booking
            </p>
          </div>

          {/* Link columns */}
          <div className="gz-footer-links">
            <div className="gz-footer-col">
              <span className="gz-footer-col-title">Navigate</span>
              <Link to="/">Home</Link>
              <Link to="/stations">Stations</Link>
              <Link to="/pricing">Pricing</Link>
            </div>
            <div className="gz-footer-col">
              <span className="gz-footer-col-title">Account</span>
              <Link to="/auth/login">Sign In</Link>
              <Link to="/auth/register">Register</Link>
              <Link to="/profile">My Profile</Link>
            </div>
            <div className="gz-footer-col">
              <span className="gz-footer-col-title">Legal</span>
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms &amp; Conditions</Link>
            </div>
          </div>
        </div>

        <div class="gz-footer-bottom">
          <span class="gz-footer-copy">
            &copy; {year} GameZone. All rights reserved.
          </span>
          <div class="gz-footer-legal">
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms &amp; Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
