import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-ink-400">
        Loading Vigor Launchpad...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="h-screen flex items-center justify-center flex-col gap-2 text-center px-4">
        <p className="text-lg font-semibold text-ink-800 dark:text-white">Access restricted</p>
        <p className="text-ink-500">Your role ({user.role}) doesn't have permission to view this page.</p>
      </div>
    );
  }

  return children;
}
