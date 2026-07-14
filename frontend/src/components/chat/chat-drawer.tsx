import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { supabase } from "@/lib/supabase";
import { env } from "@/lib/env";
import {
  fetchChatThreads,
  createChatThread,
  fetchChatHistory,
  type ChatThread,
  type ChatMessage,
} from "@/lib/api";
import {
  MessageSquare,
  X,
  Send,
  Loader2,
  Plus,
  Sparkles,
  Database,
} from "lucide-react";

export function ChatDrawer() {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [creatingThread, setCreatingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load threads when opening drawer
  useEffect(() => {
    if (isOpen && profile?.business_id) {
      loadThreads();
    }
  }, [isOpen, profile?.business_id]);

  // Load history when thread changes
  useEffect(() => {
    if (selectedThreadId) {
      loadHistory(selectedThreadId);
    } else {
      setMessages([]);
    }
  }, [selectedThreadId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const loadThreads = useCallback(async () => {
    try {
      setLoadingThreads(true);
      setError(null);
      const list = await fetchChatThreads();
      setThreads(list);
      const firstThread = list[0];
      if (firstThread && !selectedThreadId) {
        setSelectedThreadId(firstThread.id);
      }
    } catch (err: any) {
      console.error("Failed to load threads", err);
      setError(err.message || "Failed to load chat threads.");
    } finally {
      setLoadingThreads(false);
    }
  }, [selectedThreadId]);

  const handleCreateThread = useCallback(async () => {
    try {
      setCreatingThread(true);
      setError(null);
      const thread = await createChatThread(
        `Chat ${new Date().toLocaleDateString()}`
      );
      setThreads((prev) => [thread, ...prev]);
      setSelectedThreadId(thread.id);
    } catch (err: any) {
      console.error("Failed to create thread", err);
      setError(err.message || "Failed to create thread.");
    } finally {
      setCreatingThread(false);
    }
  }, []);

  const loadHistory = useCallback(async (threadId: string) => {
    try {
      setLoadingHistory(true);
      setError(null);
      const history = await fetchChatHistory(threadId);
      setMessages(history);
    } catch (err: any) {
      setError(err.message || "Failed to load conversation history.");
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !profile?.business_id) return;

    let threadId = selectedThreadId;
    setError(null);
    setSending(true);

    const userText = inputText;
    setInputText("");

    try {
      // 1. If no thread exists, create one first
      if (!threadId) {
        const thread = await createChatThread();
        setThreads((prev) => [thread, ...prev]);
        threadId = thread.id;
        setSelectedThreadId(thread.id);
      }

      // 2. Optimistically add user message to state
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: userText,
        citations: [],
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // 3. Prepare body for stream request
      const messageHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      messageHistory.push({ role: "user", content: userText });

      // Get current Supabase session token
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      // 4. Initiate stream request to FastAPI
      const response = await fetch(`${env.API_URL}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          threadId,
          messages: messageHistory,
        }),
      });

      if (!response.ok) {
        let detail = response.statusText;
        try {
          const errorBody = await response.json();
          if (errorBody.detail) detail = errorBody.detail;
        } catch {
          // not JSON
        }
        throw new Error(detail);
      }

      // Add temporary assistant placeholder message
      const assistantMsgId = crypto.randomUUID();
      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        citations: [],
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No readable stream body returned");

      let accumulatedContent = "";
      let accumulatedCitations: ChatMessage["citations"] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.trim()) continue;

          const prefix = line[0];
          const payloadStr = line.slice(2); // Skip prefix e.g. "0:"

          try {
            const payload = JSON.parse(payloadStr);

            if (prefix === "0") {
              // Text delta
              accumulatedContent += payload;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? { ...msg, content: accumulatedContent }
                    : msg
                )
              );
            } else if (prefix === "2") {
              // Citations list
              accumulatedCitations = payload;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? { ...msg, citations: accumulatedCitations }
                    : msg
                )
              );
            } else if (prefix === "3") {
              // Error
              setError(payload);
            }
          } catch {
            // Ignore malformed stream lines
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while sending message.");
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer hover:shadow-primary/25 border border-primary/20"
        title="Ask Assistant"
      >
        <MessageSquare className="h-6 w-6" />
      </button>

      {/* Drawer Overlay — z-[60] so panel at z-[70] sits above it */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] bg-background/40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out Drawer Panel — z-[70] above the overlay */}
      <div
        className={`fixed top-0 right-0 z-[70] h-screen w-full sm:w-[480px] bg-card border-l border-border/80 shadow-2xl flex flex-col transition-all duration-300 transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="h-16 border-b border-border/60 px-4 flex items-center justify-between bg-card/85 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground text-sm">
                Grounded AI Assistant
              </h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Read-Only Financial Intelligence
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 rounded-lg border border-border/85 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Threads Sub-Bar */}
        <div className="h-12 border-b border-border/40 px-3 bg-secondary/15 flex items-center justify-between gap-2">
          <select
            value={selectedThreadId || ""}
            onChange={(e) => setSelectedThreadId(e.target.value || null)}
            className="flex-1 max-w-[200px] h-8 rounded-md border border-input bg-card px-2 text-xs text-foreground focus:outline-none cursor-pointer"
          >
            <option value="">— Select Thread —</option>
            {threads.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleCreateThread}
            disabled={creatingThread}
            className="inline-flex items-center gap-1 px-3 h-8 rounded-md bg-primary text-primary-foreground font-semibold text-xs transition-colors hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
          >
            {creatingThread ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            {creatingThread ? "Creating..." : "New Thread"}
          </button>
        </div>

        {/* Message History Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-secondary/5">
          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive flex gap-2">
              <X className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loadingThreads ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">
                Loading threads...
              </p>
            </div>
          ) : loadingHistory ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">
                Loading chat history...
              </p>
            </div>
          ) : !selectedThreadId ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6 space-y-4">
              <Sparkles className="h-8 w-8 text-primary/45" />
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Start a grounded turn
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 max-w-[250px] mx-auto">
                  Create a new thread to ask about your ledger sales, purchases,
                  net totals, and active debts.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreateThread}
                disabled={creatingThread}
                className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-primary text-primary-foreground font-medium text-xs shadow hover:bg-primary/95 disabled:opacity-50 cursor-pointer"
              >
                {creatingThread ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {creatingThread ? "Creating..." : "Create New Thread"}
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-xs text-muted-foreground">
              <MessageSquare className="h-6 w-6 text-muted-foreground/30 mb-2" />
              <p>No messages in this thread yet.</p>
              <p className="mt-1 text-[10px]">
                Send a query below to prompt the assistant.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[85%] ${
                  msg.role === "user"
                    ? "ml-auto items-end"
                    : "mr-auto items-start"
                }`}
              >
                {/* Bubble */}
                <div
                  className={`rounded-2xl px-4 py-2.5 text-xs shadow-sm whitespace-pre-wrap leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-card border border-border/80 text-foreground rounded-bl-none"
                  }`}
                >
                  {msg.content ||
                    (msg.role === "assistant" && sending ? (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Thinking...
                      </span>
                    ) : null)}
                </div>

                {/* Citations list for assistant messages */}
                {msg.role === "assistant" &&
                  msg.citations &&
                  msg.citations.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 justify-start">
                      {msg.citations.map((c, idx) => (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border/60 bg-card text-[9px] text-primary/80 font-medium cursor-help"
                          title={`${c.summary} (${c.date})`}
                        >
                          <Database className="h-2.5 w-2.5" />
                          <span>
                            {c.table.replace("_", " ")}:{" "}
                            {c.row_id.slice(0, 6)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            ))
          )}

          {/* End scroll target */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-border/60 bg-card sticky bottom-0">
          <form
            onSubmit={handleSendMessage}
            className="flex gap-2 items-center"
          >
            <input
              type="text"
              required
              disabled={sending || !selectedThreadId}
              placeholder={
                !selectedThreadId
                  ? "Select or create thread first"
                  : "Ask about your transactions, sales, debts..."
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 h-10 rounded-lg border border-input bg-secondary/30 px-3 text-xs text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sending || !inputText.trim() || !selectedThreadId}
              className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow transition-all hover:bg-primary/95 disabled:opacity-50 cursor-pointer"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
