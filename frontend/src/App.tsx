import { useState, useRef, useEffect } from "react";
import { Routes, Route, Navigate, Link, Outlet, useLocation } from "react-router-dom";
import { AuthGuard } from "@/components/auth/auth-guard";
import { OnboardingGuard } from "@/components/auth/onboarding-guard";
import { SignInPage } from "@/pages/sign-in";
import { SignUpPage } from "@/pages/sign-up";
import { OnboardingPage } from "@/pages/onboarding";
import { ProductsPage } from "@/pages/products";
import { StaffPage } from "@/pages/staff";
import { LedgerPage } from "@/pages/ledger";
import { DashboardPage } from "@/pages/dashboard";
import { DebtorsPage } from "@/pages/debtors";
import { DailyReportPage } from "@/pages/daily-report";
import { ChatDrawer } from "@/components/chat/chat-drawer";
import { useAuth } from "@/components/auth/auth-context";
import { useTheme } from "@/components/theme-provider";
import {
  TrendingUp,
  Package,
  Users,
  LogOut,
  Home,
  ShoppingCart,
  AlertCircle,
  ClipboardList,
  Sun,
  Moon,
  Monitor,
  ChevronDown,
} from "lucide-react";

// ── Theme toggle ──────────────────────────────────────────────────────────────

type ThemeOption = { value: "light" | "dark" | "system"; label: string; Icon: typeof Sun };

const THEME_OPTIONS: ThemeOption[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const ActiveIcon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Toggle theme"
        className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg border border-border/80 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors text-xs font-medium"
      >
        <ActiveIcon className="h-4 w-4" />
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-36 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
          {THEME_OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => { setTheme(value); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                theme === value
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-foreground hover:bg-secondary/60"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {theme === value && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

function Layout() {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: "Dashboard", path: "/", icon: Home },
    { label: "Ledger", path: "/ledger", icon: ShoppingCart },
    { label: "Products", path: "/products", icon: Package },
    { label: "Debtors", path: "/debtors", icon: AlertCircle },
    { label: "Daily Report", path: "/daily-report", icon: ClipboardList },
    { label: "Staff & Roles", path: "/staff", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-card/80 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/20">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold tracking-tight text-lg hidden sm:inline">
              SME Biz Analyst
            </span>
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all shrink-0 ${
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/15"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* User info */}
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs font-semibold text-foreground/90 truncate max-w-[150px]">
                {profile?.email}
              </span>
              <span className="text-[10px] text-primary font-medium tracking-wide uppercase">
                {profile?.role}
              </span>
            </div>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Sign out */}
            <button
              onClick={() => signOut()}
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border/80 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8">
        <Outlet />
      </main>
      <ChatDrawer />
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export function App() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/sign-up" element={<SignUpPage />} />

      <Route element={<AuthGuard />}>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/ledger" element={<LedgerPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/debtors" element={<DebtorsPage />} />
          <Route path="/daily-report" element={<DailyReportPage />} />
          <Route path="/staff" element={<StaffPage />} />
        </Route>
      </Route>

      <Route element={<OnboardingGuard />}>
        <Route path="/onboarding" element={<OnboardingPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
