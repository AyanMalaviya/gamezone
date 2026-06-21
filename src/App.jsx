import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage        from './pages/LandingPage';
import StationLayout      from './pages/StationLayout';
import PricingPage        from './pages/PricingPage';
import AuthPage           from './pages/AuthPage';
import ProfilePage        from './pages/ProfilePage';
import TransactionsPage   from './pages/TransactionsPage';
import AdminDashboard     from './pages/AdminDashboard';
import PrivacyPolicy      from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';
import ProtectedRoute     from './components/ProtectedRoute';
import ScrollToTop        from './components/ScrollToTop';
import UpiPaymentModal    from './components/UpiPaymentModal';
import InstallPrompt      from './components/InstallPrompt';
import { useAuthListener } from './hooks/useAuth';

export default function App() {
  // Mount the global Firebase auth listener once.
  // This keeps authStore (user, role, phone, loading) in sync with Firebase.
  // Without this, Google sign-in completes in Firebase but the store never
  // updates, so AuthPage's redirect useEffect never fires.
  useAuthListener();

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

      {/* Global modals & PWA UI — outside routes so they persist across navigation */}
      <UpiPaymentModal />
      <InstallPrompt />
    </>
  );
}
