import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthListener } from './hooks/useAuth';
import useAuthStore from './store/authStore';
import LandingPage from './pages/LandingPage';
import StationLayout from './pages/StationLayout';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 25000, retry: 2 } },
});

const adminSlug = import.meta.env.VITE_ADMIN_SLUG || 'admin';

const router = createBrowserRouter([
  { path: '/',          element: <LandingPage /> },
  { path: '/stations',  element: <StationLayout /> },
  {
    path: `/${adminSlug}`,
    element: <ProtectedRoute />,
    children: [{ index: true, element: <AdminDashboard /> }],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

function AppInner() {
  useAuthListener();
  const { loading } = useAuthStore();
  if (loading) return (
    <div style={{ minHeight:'100dvh', background:'#0d0d0f', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{
        width:36, height:36, borderRadius:'50%',
        border:'3px solid rgba(124,58,237,0.2)',
        borderTopColor:'#7c3aed',
        animation:'spin 0.7s linear infinite',
      }} />
    </div>
  );
  return <RouterProvider router={router} />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  );
}
