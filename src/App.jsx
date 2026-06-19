import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import UpiPaymentModal from './components/UpiPaymentModal';
import LandingPage from './pages/LandingPage';
import StationLayout from './pages/StationLayout';
import AuthPage from './pages/AuthPage';
import AdminDashboard from './pages/AdminDashboard';
import ProfilePage from './pages/ProfilePage';
import PricingPage from './pages/PricingPage';
import ProtectedRoute from './components/ProtectedRoute';
import AuthGuard from './components/AuthGuard';

export default function App() {
  return (
    <BrowserRouter>
      {/* Global UPI payment modal — rendered once at app root */}
      <UpiPaymentModal />
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/stations" element={<StationLayout />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/auth/:mode" element={
          <AuthGuard>
            <AuthPage />
          </AuthGuard>
        } />
        <Route path="/admin" element={
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
    </BrowserRouter>
  );
}
