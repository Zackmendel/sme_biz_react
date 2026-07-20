import type { ReactNode } from "react";

interface FormFieldProps {
  /** Matches the `id` of the inner control for accessibility. */
  id?: string;
  label: string;
  /** Small hint text rendered below the control (e.g. permission notes). */
  hint?: string;
  children: ReactNode;
}

/**
 * Consistent label + control wrapper.
 * Keeps the `space-y-1` / label-style pattern in one place.
 */
export function FormField({ id, label, hint, children }: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="text-xs font-medium text-muted-foreground"
      >
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>
      )}
    </div>
  );
}
