import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

// ---------------------------------------------------------------------------
// Shared base class builder
// ---------------------------------------------------------------------------

function inputBase(inputSize: "sm" | "md" = "md", extra = "") {
  const h = inputSize === "sm" ? "h-9 text-xs" : "h-10 text-sm";
  return `flex ${h} w-full rounded-md border border-input bg-secondary/30 px-3 focus:outline-none focus:ring-1 focus:ring-ring transition-colors ${extra}`.trim();
}

// ---------------------------------------------------------------------------
// FormInput
// ---------------------------------------------------------------------------

interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Visual size variant. "sm" → h-9 / text-xs, "md" → h-10 / text-sm (default). */
  inputSize?: "sm" | "md";
}

/**
 * Styled text / number / date input.
 * Accepts all standard HTML input attributes — no extra wrapping needed.
 */
export function FormInput({ inputSize = "md", className = "", ...props }: FormInputProps) {
  return (
    <input
      className={`${inputBase(inputSize)} disabled:opacity-75 disabled:cursor-not-allowed ${className}`}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// FormSelect
// ---------------------------------------------------------------------------

interface FormSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  /** Visual size variant. "sm" → h-9 / text-xs, "md" → h-10 / text-sm (default). */
  inputSize?: "sm" | "md";
  children: ReactNode;
}

/**
 * Styled select dropdown using the same base class as FormInput.
 */
export function FormSelect({ inputSize = "md", className = "", children, ...props }: FormSelectProps) {
  return (
    <select className={`${inputBase(inputSize)} ${className}`} {...props}>
      {children}
    </select>
  );
}
