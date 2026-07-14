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

export interface ChatThread {
  id: string;
  title: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: Array<{
    table: string;
    row_id: string;
    date: string;
    summary: string;
  }>;
  created_at: string;
}

export async function fetchChatThreads(): Promise<ChatThread[]> {
  return http<ChatThread[]>("/chat/threads");
}

export async function createChatThread(title?: string): Promise<ChatThread> {
  return http<ChatThread>("/chat/threads", {
    method: "POST",
    body: { title },
  });
}

export async function fetchChatHistory(threadId: string): Promise<ChatMessage[]> {
  return http<ChatMessage[]>(`/chat/threads/${threadId}/history`);
}
