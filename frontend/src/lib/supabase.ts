import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

/**
 * Singleton Supabase client for auth and direct CRUD.
 * RLS enforces tenant isolation at the database level.
 */
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
