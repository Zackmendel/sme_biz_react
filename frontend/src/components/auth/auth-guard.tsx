import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./auth-context";
import { Loader2 } from "lucide-react";

/**
 * Route guard that protects child routes:
 * - Shows a loading spinner during initial session hydration
 * - Redirects unauthenticated users to /sign-in
 * - Redirects authenticated users without a business_id to /onboarding
 * - Renders children for authenticated + onboarded users
 */
export function AuthGuard() {
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

  // Profile may not exist yet if the trigger hasn't fired or is in-flight
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Onboarding gate: user exists but has no business
  if (!profile.business_id) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
