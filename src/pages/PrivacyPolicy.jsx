import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';

const STYLE_ID = 'gz-legal-styles';
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    .gz-legal-page {
      min-height: 100vh;
      background: #0a0a0e;
      padding: 80px 24px 64px;
    }
    .gz-legal-inner {
      max-width: 760px;
      margin: 0 auto;
    }
    .gz-legal-back {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.82rem;
      color: rgba(255,255,255,0.45);
      text-decoration: none;
      margin-bottom: 32px;
      transition: color 0.15s;
    }
    .gz-legal-back:hover { color: #a78bfa; }
    .gz-legal-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 8px;
    }
    .gz-legal-icon {
      width: 44px; height: 44px;
      border-radius: 12px;
      background: rgba(124,58,237,0.12);
      border: 1px solid rgba(124,58,237,0.25);
      display: flex; align-items: center; justify-content: center;
      color: #a78bfa;
      flex-shrink: 0;
    }
    .gz-legal-title {
      font-family: 'Rajdhani','Inter',sans-serif;
      font-size: clamp(1.5rem,4vw,2rem);
      font-weight: 800;
      color: #fff;
      letter-spacing: 0.02em;
    }
    .gz-legal-updated {
      font-size: 0.76rem;
      color: rgba(255,255,255,0.3);
      margin-bottom: 36px;
      padding-bottom: 28px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    .gz-legal-section {
      margin-bottom: 32px;
    }
    .gz-legal-section h2 {
      font-family: 'Rajdhani','Inter',sans-serif;
      font-size: 1.05rem;
      font-weight: 700;
      color: #c4b5fd;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .gz-legal-section p, .gz-legal-section li {
      font-size: 0.9rem;
      color: rgba(255,255,255,0.6);
      line-height: 1.75;
    }
    .gz-legal-section ul {
      padding-left: 18px;
      margin-top: 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .gz-legal-section a {
      color: #a78bfa;
      text-decoration: underline;
    }
  `;
  document.head.appendChild(s);
}

export default function PrivacyPolicy() {
  useEffect(() => {
    injectStyles();
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="gz-legal-page">
      <div className="gz-legal-inner">
        <Link to="/" className="gz-legal-back">
          <ArrowLeft size={14} /> Back to Home
        </Link>

        <div className="gz-legal-header">
          <div className="gz-legal-icon"><Shield size={20} /></div>
          <h1 className="gz-legal-title">Privacy Policy</h1>
        </div>
        <p className="gz-legal-updated">Last updated: June 2025</p>

        <div className="gz-legal-section">
          <h2>1. Introduction</h2>
          <p>
            Welcome to GameZone (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;). We operate a gaming
            lounge and this web application (&ldquo;the App&rdquo;) to allow customers to view station
            availability and book gaming sessions. This Privacy Policy explains what personal
            information we collect, how we use it, and your rights regarding that information.
          </p>
        </div>

        <div className="gz-legal-section">
          <h2>2. Information We Collect</h2>
          <ul>
            <li><strong>Account information</strong> — name, email address, and profile photo collected via Google Sign-In (OAuth 2.0).</li>
            <li><strong>Phone number</strong> — collected during profile completion to send booking confirmations.</li>
            <li><strong>Booking data</strong> — station ID, selected time slot, game preference, and payment reference number.</li>
            <li><strong>Usage data</strong> — pages visited, timestamps, and browser/device type collected via Firebase Analytics.</li>
          </ul>
        </div>

        <div className="gz-legal-section">
          <h2>3. How We Use Your Information</h2>
          <ul>
            <li>To authenticate your account and keep sessions secure.</li>
            <li>To process and confirm station bookings.</li>
            <li>To display your booking history on the Profile page.</li>
            <li>To send booking confirmation messages (WhatsApp or SMS) using your phone number.</li>
            <li>To improve the App based on aggregated usage analytics.</li>
          </ul>
        </div>

        <div className="gz-legal-section">
          <h2>4. Data Storage &amp; Security</h2>
          <p>
            Your data is stored in Google Firebase (Firestore &amp; Authentication) hosted on
            Google Cloud infrastructure with industry-standard encryption at rest and in transit.
            Station availability data is stored in a Google Sheet accessible only by authorised
            admin accounts. We do not store payment credentials — UPI transactions are processed
            externally and only the reference ID is logged.
          </p>
        </div>

        <div className="gz-legal-section">
          <h2>5. Third-Party Services</h2>
          <ul>
            <li><strong>Google Firebase</strong> — authentication, database, and hosting.</li>
            <li><strong>Google Sheets API</strong> — real-time station availability.</li>
            <li><strong>UPI Payment Apps</strong> — payment processing (PhonePe / GPay / Paytm). We do not control their privacy practices.</li>
          </ul>
        </div>

        <div className="gz-legal-section">
          <h2>6. Data Retention</h2>
          <p>
            Account data is retained for as long as your account is active. Booking records are
            kept for 12 months for dispute resolution. You may request deletion of your account
            and associated data at any time by contacting us.
          </p>
        </div>

        <div className="gz-legal-section">
          <h2>7. Your Rights</h2>
          <ul>
            <li>Access the personal data we hold about you.</li>
            <li>Correct inaccurate data via your Profile page.</li>
            <li>Request deletion of your account and data.</li>
            <li>Withdraw consent for analytics at any time.</li>
          </ul>
        </div>

        <div className="gz-legal-section">
          <h2>8. Children&apos;s Privacy</h2>
          <p>
            The App is not directed to children under 13. We do not knowingly collect personal
            information from children. If you believe a child has provided us data, please contact
            us immediately.
          </p>
        </div>

        <div className="gz-legal-section">
          <h2>9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. The &ldquo;Last updated&rdquo; date at the
            top will reflect any changes. Continued use of the App after changes constitutes
            acceptance of the revised policy.
          </p>
        </div>

        <div className="gz-legal-section">
          <h2>10. Contact Us</h2>
          <p>
            For privacy-related queries, contact us at the gaming lounge or reach out via the
            contact details displayed at the venue. You may also visit the{' '}
            <Link to="/terms">Terms &amp; Conditions</Link> page.
          </p>
        </div>
      </div>
    </div>
  );
}
