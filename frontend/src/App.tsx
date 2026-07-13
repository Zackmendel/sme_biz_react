import { Routes, Route, Navigate, Link, Outlet, useLocation } from "react-router-dom";
import { AuthGuard } from "@/components/auth/auth-guard";
import { OnboardingGuard } from "@/components/auth/onboarding-guard";
import { SignInPage } from "@/pages/sign-in";
import { SignUpPage } from "@/pages/sign-up";
import { OnboardingPage } from "@/pages/onboarding";
import { ProductsPage } from "@/pages/products";
import { StaffPage } from "@/pages/staff";
import { LedgerPage } from "@/pages/ledger";
import { useAuth } from "@/components/auth/auth-context";
import { TrendingUp, Package, Users, LogOut, Home, ShoppingCart } from "lucide-react";

function Layout() {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: "Dashboard", path: "/", icon: Home },
    { label: "Ledger", path: "/ledger", icon: ShoppingCart },
    { label: "Products", path: "/products", icon: Package },
    { label: "Staff & Roles", path: "/staff", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header / Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-card/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/20">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold tracking-tight text-lg hidden sm:inline">SME Biz Analyst</span>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/15"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 border border-transparent"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User info and Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs font-semibold text-foreground/90 truncate max-w-[150px]">
                {profile?.email}
              </span>
              <span className="text-[10px] text-primary font-medium tracking-wide uppercase">
                {profile?.role}
              </span>
            </div>
            <button
              onClick={() => signOut()}
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border/80 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/sign-up" element={<SignUpPage />} />

      {/* Protected routes — AuthGuard redirects to sign-in or onboarding */}
      <Route element={<AuthGuard />}>
        <Route element={<Layout />}>
          {/* Dashboard Placeholder (Phase 4) — redirects to ledger for now */}
          <Route path="/" element={<Navigate to="/ledger" replace />} />
          <Route path="/ledger" element={<LedgerPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/staff" element={<StaffPage />} />
        </Route>
      </Route>

      {/* Onboarding page — wrapped in OnboardingGuard */}
      <Route element={<OnboardingGuard />}>
        <Route path="/onboarding" element={<OnboardingPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
