import { AlertCircle } from "lucide-react";

interface ErrorBannerProps {
  message: string;
  className?: string;
}

/**
 * Consistent destructive alert strip used throughout the ledger page.
 * Render nothing when `message` is falsy — callers can pass `error ?? ""`.
 */
export function ErrorBanner({ message, className = "" }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive ${className}`}
    >
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
