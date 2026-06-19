import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';

export default function TermsAndConditions() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Reuse the same legal page styles injected by PrivacyPolicy
  // (they share the gz-legal-* classes)

  return (
    <div className="gz-legal-page">
      <div className="gz-legal-inner">
        <Link to="/" className="gz-legal-back">
          <ArrowLeft size={14} /> Back to Home
        </Link>

        <div className="gz-legal-header">
          <div className="gz-legal-icon" style={{ color: '#fbbf24', background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.25)' }}>
            <FileText size={20} />
          </div>
          <h1 className="gz-legal-title">Terms &amp; Conditions</h1>
        </div>
        <p className="gz-legal-updated">Last updated: June 2025</p>

        <div className="gz-legal-section">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using the GameZone web application (&ldquo;the App&rdquo;), you agree to be
            bound by these Terms &amp; Conditions. If you do not agree, please do not use the App.
            These terms apply to all visitors, registered users, and customers who book gaming
            sessions through this platform.
          </p>
        </div>

        <div className="gz-legal-section">
          <h2>2. Eligibility</h2>
          <ul>
            <li>You must be at least 13 years old to create an account.</li>
            <li>Users under 18 must have parental or guardian consent to make bookings.</li>
            <li>By registering, you confirm that the information you provide is accurate and complete.</li>
          </ul>
        </div>

        <div className="gz-legal-section">
          <h2>3. Booking Policy</h2>
          <ul>
            <li>Bookings are confirmed only after successful UPI payment and receipt of a payment reference number.</li>
            <li>Each booking is for a minimum of 1 hour. PS5 stations are billed at ₹100/hr; the Racing Simulator (Station 8) is billed at ₹250/hr.</li>
            <li>Arrive within 10 minutes of your slot start time. Unused time from late arrivals is not refunded.</li>
            <li>Station availability is shown in real time and is subject to change. We reserve the right to reassign stations in the event of technical issues.</li>
          </ul>
        </div>

        <div className="gz-legal-section">
          <h2>4. Cancellations &amp; Refunds</h2>
          <ul>
            <li>Cancellations made more than 30 minutes before the slot start time are eligible for a full refund or credit.</li>
            <li>Cancellations within 30 minutes of the slot are non-refundable.</li>
            <li>Refunds, if applicable, are processed within 5–7 business days to the original UPI payment source.</li>
            <li>No-shows forfeit the full booking amount.</li>
          </ul>
        </div>

        <div className="gz-legal-section">
          <h2>5. Code of Conduct</h2>
          <p>All customers at GameZone are expected to:</p>
          <ul>
            <li>Treat equipment and other customers with respect.</li>
            <li>Not damage, modify, or tamper with any gaming hardware or peripherals.</li>
            <li>Not consume food or drinks directly near the gaming equipment.</li>
            <li>Comply with instructions from GameZone staff at all times.</li>
            <li>Not engage in offensive, abusive, or threatening behaviour.</li>
          </ul>
          <p style={{ marginTop: 10 }}>
            GameZone reserves the right to terminate a session without refund if a customer
            violates this code of conduct.
          </p>
        </div>

        <div className="gz-legal-section">
          <h2>6. Intellectual Property</h2>
          <p>
            All content on this App — including logos, UI design, text, and code — is the
            property of GameZone. You may not reproduce, distribute, or create derivative works
            without express written permission.
          </p>
        </div>

        <div className="gz-legal-section">
          <h2>7. Limitation of Liability</h2>
          <p>
            GameZone provides the App and gaming services &ldquo;as is&rdquo;. To the fullest extent
            permitted by law, we are not liable for any indirect, incidental, or consequential
            damages arising from use of the App or gaming sessions, including but not limited to
            loss of data, personal injury, or equipment damage caused by customer misuse.
          </p>
        </div>

        <div className="gz-legal-section">
          <h2>8. Privacy</h2>
          <p>
            Your use of the App is also governed by our{' '}
            <Link to="/privacy">Privacy Policy</Link>, which is incorporated into these Terms
            by reference.
          </p>
        </div>

        <div className="gz-legal-section">
          <h2>9. Governing Law</h2>
          <p>
            These Terms are governed by the laws of India. Any disputes arising from the use of
            this App or GameZone services shall be subject to the exclusive jurisdiction of the
            courts in the city where the GameZone venue is located.
          </p>
        </div>

        <div className="gz-legal-section">
          <h2>10. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. The &ldquo;Last updated&rdquo; date will
            reflect changes. Continued use of the App after modifications constitutes your
            acceptance of the updated Terms.
          </p>
        </div>

        <div className="gz-legal-section">
          <h2>11. Contact</h2>
          <p>
            Questions about these Terms? Visit us at the GameZone venue or refer to our{' '}
            <Link to="/privacy">Privacy Policy</Link> for contact details.
          </p>
        </div>
      </div>
    </div>
  );
}
