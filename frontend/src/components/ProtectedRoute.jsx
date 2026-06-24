import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../context/PermissionsContext";

export default function ProtectedRoute({ children, page }) {
  const { user, loading } = useAuth();
  const { canAccessPage } = usePermissions();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-ink-400">
        Loading Vigor Launchpad...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (page && !canAccessPage(page)) {
    return (
      <div className="h-screen flex items-center justify-center flex-col gap-2 text-center px-4">
        <p className="text-lg font-semibold text-ink-800 dark:text-white">Access restricted</p>
        <p className="text-ink-500">You do not have permission to view the {page} page.</p>
      </div>
    );
  }

  return children;
}
