import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthListener } from './hooks/useAuth';
import useAuthStore from './store/authStore';
import StationLayout from './pages/StationLayout';
import AuthPage from './pages/AuthPage';
import AdminDashboard from './pages/AdminDashboard';
import LandingPage from './pages/LandingPage';
import ProfilePage from './pages/ProfilePage';
import GoogleProfileGate from './components/GoogleProfileGate';

export const ADMIN_PATH = import.meta.env.VITE_ADMIN_SLUG || 'admin';

function ProtectedRoute({ children }) {
  const { user, role, loading } = useAuthStore();
  if (loading) return null;
  if (!user)            return <Navigate to="/auth/login" replace />;
  if (role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  useAuthListener();
  const { loading } = useAuthStore();

  if (loading) return (
    <div style={{
      minHeight:'100dvh', background:'#0d0d0f',
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <div style={{
        width:36, height:36, borderRadius:'50%',
        border:'3px solid rgba(124,58,237,.2)',
        borderTopColor:'#7c3aed',
        animation:'spin .7s linear infinite',
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <BrowserRouter>
      <GoogleProfileGate />
      <Routes>
        <Route path="/"            element={<LandingPage />} />
        <Route path="/stations"    element={<StationLayout />} />
        <Route path="/auth/:mode"  element={<AuthPage />} />
        <Route path="/profile"     element={<ProfilePage />} />
        <Route
          path={`/${ADMIN_PATH}`}
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
