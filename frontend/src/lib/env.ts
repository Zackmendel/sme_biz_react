/**
 * Single source of truth for all VITE_* environment variables.
 * Fails fast at module load time if required vars are missing.
 * Never read import.meta.env directly in components — import from here.
 */

function requireEnv(key: string): string {
  const value = import.meta.env[key] as string | undefined;
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
        `Check your .env file against .env.example.`
    );
  }
  return value;
}

export const env = {
  SUPABASE_URL: requireEnv("VITE_SUPABASE_URL"),
  SUPABASE_ANON_KEY: requireEnv("VITE_SUPABASE_ANON_KEY"),
  API_URL: requireEnv("VITE_API_URL"),
} as const;
