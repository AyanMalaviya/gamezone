import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import UpiPaymentModal from './components/UpiPaymentModal';
import LandingPage from './pages/LandingPage';
import StationLayout from './pages/StationLayout';
import AuthPage from './pages/AuthPage';
import AdminDashboard from './pages/AdminDashboard';
import ProfilePage from './pages/ProfilePage';
import PricingPage from './pages/PricingPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';
import ProtectedRoute from './components/ProtectedRoute';
import AuthGuard from './components/AuthGuard';
import { useAuthListener } from './hooks/useAuth';

/* Named export consumed by Navbar.jsx */
export const ADMIN_PATH = 'admin';

export default function App() {
  useAuthListener();

  return (
    <BrowserRouter>
      <UpiPaymentModal />
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/stations" element={<StationLayout />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/auth/:mode" element={
              <AuthGuard>
                <AuthPage />
              </AuthGuard>
            } />
            <Route path={`/${ADMIN_PATH}`} element={
              <ProtectedRoute adminOnly>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
