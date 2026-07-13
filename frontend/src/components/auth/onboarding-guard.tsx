import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./auth-context";
import { Loader2 } from "lucide-react";

/**
 * Route guard for /onboarding route:
 * - Redirects unauthenticated users to /sign-in
 * - Redirects users with a business_id to / (dashboard)
 * - Renders onboarding component for authenticated users without a business
 */
export function OnboardingGuard() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/sign-in" replace />;
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Already onboarded -> go to dashboard
  if (profile.business_id) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
