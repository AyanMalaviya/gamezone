import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage       from './pages/LandingPage';
import StationLayout     from './pages/StationLayout';
import PricingPage       from './pages/PricingPage';
import AuthPage          from './pages/AuthPage';
import ProfilePage       from './pages/ProfilePage';
import TransactionsPage  from './pages/TransactionsPage';
import AdminDashboard    from './pages/AdminDashboard';
import PrivacyPolicy     from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';
import ProtectedRoute    from './components/ProtectedRoute';
import ScrollToTop       from './components/ScrollToTop';
import UpiPaymentModal   from './components/UpiPaymentModal';

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/"              element={<LandingPage />} />
        <Route path="/stations"      element={<StationLayout />} />
        <Route path="/pricing"       element={<PricingPage />} />
        <Route path="/auth/:mode"    element={<AuthPage />} />
        <Route path="/privacy"       element={<PrivacyPolicy />} />
        <Route path="/terms"         element={<TermsAndConditions />} />
        <Route path="/admin"         element={<AdminDashboard />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/profile"      element={<ProfilePage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global UPI payment modal — lives outside routes so it persists */}
      <UpiPaymentModal />
    </>
  );
}
