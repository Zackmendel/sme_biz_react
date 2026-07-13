import { http } from "./http";

/**
 * Typed FastAPI client.
 * Only AI chat and reporting-related calls go through here.
 * CRUD for sales, purchases, products, debtors goes through supabase-data.ts.
 */

interface HealthResponse {
  status: string;
}

export async function healthCheck(): Promise<HealthResponse> {
  return http<HealthResponse>("/health");
}
