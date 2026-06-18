import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router-dom";

// Wraps admin-only routes. Redirects to / if not logged in.
export default function AuthGuard({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-gray-400 text-sm">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}
