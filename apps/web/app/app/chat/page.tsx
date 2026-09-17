"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { FirstChatDisclaimerModal } from "@/components/FirstChatDisclaimerModal";
import { UserInitialsAvatar } from "@/components/UserInitialsAvatar";
import {
  ArrowLeft,
  Send,
  Loader2,
  Bot,
  User,
  ChevronDown,
  Sparkles,
  AlertCircle,
  Square,
} from "lucide-react";

interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  citations?: Array<{
    title: string;
    course_code?: string;
    page_start?: number;
    snippet?: string;
  }>;
}

export default function ChatPage() {
  const router = useRouter();
  const { user, session, profile, loading: authLoading } = useAuth();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Disclaimer modal state
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);

  // Streaming abort controller
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const userId = user?.id || profile?.id || "anonymous";

  // Check disclaimer acceptance on mount
  useEffect(() => {
    if (userId !== "anonymous") {
      try {
        const accepted = localStorage.getItem(`pansgpt_disclaimer_accepted_${userId}`);
        if (!accepted) {
          setIsDisclaimerOpen(true);
        }
      } catch {
        // localStorage fallback
      }
    }
  }, [userId]);

  // Ensure a chat session exists
  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (sessionId) return sessionId;
    if (!session?.access_token) return null;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/v1/ai/chat/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          "X-User-Id": userId,
          "X-University-Id": profile?.university_id || "",
        },
        body: JSON.stringify({
          title: "Pharmacology Study Session",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSessionId(data.id);
        return data.id;
      }
    } catch (err) {
      console.error("Failed to create chat session", err);
    }
    return null;
  }, [sessionId, session, userId, profile]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const prompt = inputPrompt.trim();
    if (!prompt || isStreaming) return;

    // Check disclaimer agreement
    const accepted = localStorage.getItem(`pansgpt_disclaimer_accepted_${userId}`);
    if (!accepted) {
      setIsDisclaimerOpen(true);
      return;
    }

    setStreamError(null);
    setInputPrompt("");

    // Append user message immediately
    const userMsgId = "user-" + Date.now();
    const assistantMsgId = "assistant-" + Date.now();

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: prompt },
      { id: assistantMsgId, role: "assistant", content: "", thinking: "" },
    ]);

    setIsStreaming(true);

    try {
      const currentSessionId = await ensureSession();
      if (!currentSessionId) {
        throw new Error("Unable to establish chat session with AI engine.");
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await fetch(`${apiUrl}/api/v1/ai/chat/sessions/${currentSessionId}/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
          "X-User-Id": userId,
          "X-University-Id": profile?.university_id || "",
        },
        body: JSON.stringify({
          message: prompt,
          enable_rag: true,
          enable_tools: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server error: HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          if (!block.trim()) continue;

          let currentEventType = "message";
          let dataStr = "";

          for (const line of block.split("\n")) {
            if (line.startsWith("event:")) {
              currentEventType = line.replace("event:", "").trim();
            } else if (line.startsWith("data:")) {
              dataStr = line.replace("data:", "").trim();
            }
          }

          if (!dataStr) continue;

          try {
            const parsed = JSON.parse(dataStr);

            if (currentEventType === "text_chunk" && parsed.token) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId ? { ...msg, content: msg.content + parsed.token } : msg
                )
              );
            } else if (currentEventType === "thinking_chunk" && parsed.token) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? { ...msg, thinking: (msg.thinking || "") + parsed.token }
                    : msg
                )
              );
            } else if (currentEventType === "done") {
              if (parsed.full_text) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId ? { ...msg, content: parsed.full_text } : msg
                  )
                );
              }
            } else if (currentEventType === "error") {
              setStreamError(parsed.error || "Streaming error encountered.");
            }
          } catch {
            // Ignore malformed JSON chunks
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // Normal user cancellation
      } else {
        const msg = err instanceof Error ? err.message : "Error streaming response.";
        setStreamError(msg);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const fullName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    user?.email?.split("@")[0] ||
    "Student";

  return (
    <div className="flex h-screen flex-col bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <Link
            href="/app"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Library
          </Link>
          <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800" />
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-bold">Clinical Study Copilot</span>
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              SSE Stream
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-500 dark:text-neutral-400 hidden sm:inline">
            {fullName}
          </span>
          <UserInitialsAvatar name={fullName} email={user?.email} size="sm" />
        </div>
      </header>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <Bot className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  How can PansGPT help your pharmacy studies today?
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
                  Ask questions about pharmaceutical chemistry, pharmacokinetics, adverse effects,
                  or clinical case formulations.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl mx-auto pt-4">
                {[
                  "Explain the mechanism of action of ACE inhibitors vs ARBs",
                  "Summarize the biopharmaceutics classification system (BCS)",
                  "What are the major contraindications for Warfarin?",
                  "Generate a revision summary for autonomic pharmacology",
                ].map((sample, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInputPrompt(sample);
                    }}
                    className="rounded-xl border border-neutral-200 bg-white p-3 text-left text-xs text-neutral-700 hover:border-emerald-500 hover:bg-emerald-50/50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/20 transition-all"
                  >
                    &ldquo;{sample}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-emerald-600 text-white"
                      : "bg-white border border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                  }`}
                >
                  {/* Assistant Collapsible Reasoning Block */}
                  {msg.role === "assistant" && msg.thinking && (
                    <details className="mb-3 rounded-xl border border-neutral-200 bg-neutral-50/80 p-2.5 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-300">
                      <summary className="flex cursor-pointer select-none items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                        <ChevronDown className="h-3.5 w-3.5" />
                        Clinical Reasoning & Retrieval Context
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] text-neutral-600 dark:text-neutral-400 max-h-48 overflow-y-auto">
                        {msg.thinking}
                      </pre>
                    </details>
                  )}

                  {/* Message Content: render text in pre-wrap preserving whitespace & code */}
                  <div className="whitespace-pre-wrap font-sans text-sm break-words">
                    {msg.content || (
                      <span className="flex items-center gap-1.5 text-neutral-400 italic">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Generating response...
                      </span>
                    )}
                  </div>
                </div>

                {msg.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {streamError && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{streamError}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Composer */}
      <div className="border-t border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <form onSubmit={handleSendMessage} className="mx-auto flex max-w-3xl items-end gap-2">
          <div className="relative flex-1">
            <textarea
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask a pharmacy question or request a drug monograph breakdown..."
              rows={2}
              disabled={isStreaming}
              className="w-full resize-none rounded-2xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 focus:border-emerald-500 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:bg-neutral-800"
            />
          </div>

          {isStreaming ? (
            <button
              type="button"
              onClick={handleStopStream}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-md hover:bg-rose-500 transition-colors"
              title="Stop Generating"
            >
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputPrompt.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 disabled:opacity-50 transition-colors"
              title="Send Message"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </form>
        <p className="mt-2 text-center text-[10px] text-neutral-400">
          PansGPT is an AI educational companion. Always verify clinical facts and dosages with
          official monographs.
        </p>
      </div>

      {/* Mandatory Disclaimer Modal */}
      <FirstChatDisclaimerModal
        isOpen={isDisclaimerOpen}
        userId={userId}
        onAccept={() => setIsDisclaimerOpen(false)}
      />
    </div>
  );
}
