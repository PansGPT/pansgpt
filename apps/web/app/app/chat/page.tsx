"use client";

import { env } from "@/env";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useSyncExternalStore,
  Suspense,
} from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { z } from "zod";
import { useChatDraft } from "@/components/shell/chat-draft";
import { WorkspaceLoading } from "@/components/shell/loading";
import { useAuth } from "@/lib/auth-context";
import { FirstChatDisclaimerModal } from "@/components/FirstChatDisclaimerModal";
import { ChatComposer } from "@/components/chat/composer";
import { ChatRecent } from "@/components/chat/recent";
import { useDashboard } from "@/components/shell/dashboard-data";
import "./chat.css";
import {
  ArrowRight,
  Plus,
  Loader2,
  Bot,
  User,
  ChevronDown,
  Sparkles,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import {
  SSEEventStreamReader,
  CitationItem,
  ToolExecutionState,
  ArtifactItem,
  SSEParsedEvent,
  externalSourceUrl, // [CHAT FIX 2]
} from "@/lib/sse-parser";
import { ToolExecutionBadge } from "@/components/tools/ToolExecutionBadge";
import { ArtifactRenderer } from "@/components/artifacts/ArtifactRenderer";

interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  citations?: CitationItem[];
  tools?: ToolExecutionState[];
  artifacts?: ArtifactItem[];
}

function ChatContent({
  initialSessionId = null,
  initialMessages = [],
}: {
  initialSessionId?: string | null;
  initialMessages?: MessageItem[];
}) {
  const { user, session, profile, loading: authLoading } = useAuth();

  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [messages, setMessages] = useState<MessageItem[]>(initialMessages);
  const { draft, setDraft, startNewChat } = useChatDraft();
  const router = useRouter();
  const { reload } = useDashboard();
  const root = useRef<HTMLDivElement>(null);
  const [period] = useState(() => {
    const hour = new Date().getHours();
    return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  });
  const [inputPrompt, setInputPrompt] = useState(draft);
  useEffect(() => () => setDraft(""), [setDraft]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Disclaimer modal state
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);

  // Streaming abort controller
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => () => abortControllerRef.current?.abort(), []);

  const userId = user?.id || profile?.id || "anonymous";

  const disclaimerAccepted = useSyncExternalStore(
    (notify) => {
      window.addEventListener("storage", notify);
      window.addEventListener("pansgpt-disclaimer", notify);
      return () => {
        window.removeEventListener("storage", notify);
        window.removeEventListener("pansgpt-disclaimer", notify);
      };
    },
    () => {
      try {
        return Boolean(localStorage.getItem(`pansgpt_disclaimer_accepted_${userId}`));
      } catch {
        return false;
      }
    },
    () => true
  );

  // Ensure a chat session exists
  const ensureSession = useCallback(
    async (signal: AbortSignal): Promise<string | null> => {
      if (sessionId) return sessionId;
      if (!session?.access_token) return null;

      try {
        const apiUrl = env.NEXT_PUBLIC_API_URL;
        const res = await fetch(`${apiUrl}/api/v1/ai/chat/sessions`, {
          method: "POST",
          signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`, // [DEPS FIX]
          },
          body: JSON.stringify({
            title: "Pharmacology Study Session",
          }),
        });

        if (res.ok) {
          const data = z.object({ id: z.string().uuid() }).parse(await res.json());
          setSessionId(data.id);
          reload();
          return data.id;
        }
      } catch (err) {
        if (!signal.aborted) console.error("Failed to create chat session", err);
      }
      return null;
    },
    [sessionId, session, reload]
  ); // [DEPS FIX]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
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

    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const currentSessionId = await ensureSession(controller.signal);
      if (controller.signal.aborted) return;
      if (!currentSessionId) {
        throw new Error("Unable to establish chat session with AI engine.");
      }

      const apiUrl = env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/api/v1/ai/chat/sessions/${currentSessionId}/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`, // [DEPS FIX]
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
      const sseParser = new SSEEventStreamReader();

      const applyEvents = (events: SSEParsedEvent[]) => {
        // [CHAT FIX 2]
        for (const evt of events) {
          const { event, data } = evt; // [CHAT FIX 2] Narrow validated payloads by event.

          if (event === "text_chunk" && data.token) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId ? { ...msg, content: msg.content + data.token } : msg
              )
            );
          } else if (event === "thinking_chunk" && data.token) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, thinking: (msg.thinking || "") + data.token }
                  : msg
              )
            );
          } else if (event === "citations") {
            setMessages((prev) =>
              prev.map((msg) => (msg.id === assistantMsgId ? { ...msg, citations: data } : msg))
            );
          } else if (event === "tool_start" && data.call_id) {
            const newTool: ToolExecutionState = {
              call_id: data.call_id,
              tool_name: data.tool_name || "tool",
              arguments: data.arguments || {},
              status: "running",
            };
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id !== assistantMsgId) return msg;
                const existing = msg.tools || [];
                const idx = existing.findIndex((t) => t.call_id === data.call_id);
                if (idx >= 0) {
                  const updated = [...existing];
                  updated[idx] = newTool;
                  return { ...msg, tools: updated };
                }
                return { ...msg, tools: [...existing, newTool] };
              })
            );
          } else if (event === "tool_end" && data.call_id) {
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id !== assistantMsgId) return msg;
                const existing = msg.tools || [];
                const updated = existing.map((t) =>
                  t.call_id === data.call_id
                    ? {
                        ...t,
                        status: (data.status === "error" ? "error" : "success") as
                          "success" | "error",
                        result: data.result,
                        duration_ms: data.duration_ms,
                      }
                    : t
                );
                return { ...msg, tools: updated };
              })
            );
          } else if (event === "artifact_ready" && data.skill_name) {
            const artifact: ArtifactItem = {
              skill_name: data.skill_name,
              title: data.title || "Generated Artifact",
              file_extension: data.file_extension,
              storage_key: data.storage_key,
              download_url: data.download_url,
              content: data.content,
            };
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id !== assistantMsgId) return msg;
                const existing = msg.artifacts || [];
                return { ...msg, artifacts: [...existing, artifact] };
              })
            );
          } else if (event === "done") {
            if (data.full_text) {
              const fullText = data.full_text; // [CHAT FIX 2]
              setMessages((prev) =>
                prev.map((msg) => (msg.id === assistantMsgId ? { ...msg, content: fullText } : msg))
              );
            }
          } else if (event === "error") {
            setStreamError(data.error || "Streaming error encountered.");
          }
        }
      };
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          applyEvents(sseParser.push(decoder.decode()));
          applyEvents(sseParser.flush()); // [CHAT FIX 2] Preserve every final event, including errors.
          break;
        }
        applyEvents(sseParser.push(decoder.decode(value, { stream: true })));
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
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-secondary)] ">
        <Loader2 className="h-8 w-8 animate-spin text-[color:var(--fg-brand-primary-600)]" />
      </div>
    );
  }

  const empty = messages.length === 0;
  const composer = (
    <ChatComposer
      prompt={inputPrompt}
      onChange={setInputPrompt}
      onSubmit={(event) => void handleSendMessage(event)}
      streaming={isStreaming}
      onStop={handleStopStream}
    />
  );
  const suggestions = [
    { title: "Explain a concept", prompt: "Explain this concept from my course notes: " },
    { title: "Create study notes", prompt: "Help me create study notes about: " },
    { title: "Generate quiz questions", prompt: "Create practice quiz questions about: " },
    { title: "Summarise a document", prompt: "Summarise this document: " },
  ];
  return (
    <div ref={root} className="study-chat" data-empty={empty}>
      {empty ? (
        <section className="study-chat-welcome" aria-labelledby="chat-welcome-title">
          <div className="study-chat-intro">
            <h1 id="chat-welcome-title">
              Good {period}, <span>{profile?.first_name || "there"}</span>
            </h1>
            <p>What would you like to learn or work on today?</p>
          </div>
          {composer}
          <div className="study-chat-suggestions" aria-label="Study suggestions">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.title}
                onClick={() => {
                  setInputPrompt(suggestion.prompt);
                  root.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus();
                }}
              >
                {suggestion.title}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      ) : (
        <>
          <header className="study-chat-thread-heading">
            <h1>Study chat</h1>
            <button
              onClick={() => {
                startNewChat();
                router.push("/app/chat");
              }}
            >
              <Plus size={17} aria-hidden="true" />
              New chat
            </button>
          </header>
          <div className="study-chat-conversation">
            <div className="study-chat-messages">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="study-chat-assistant-avatar">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div className="study-chat-bubble" data-role={msg.role}>
                    {/* Assistant Tool Execution Badges */}
                    {msg.role === "assistant" && msg.tools && msg.tools.length > 0 && (
                      <div className="mb-2.5 flex flex-wrap gap-1.5">
                        {msg.tools.map((t) => (
                          <ToolExecutionBadge key={t.call_id} tool={t} />
                        ))}
                      </div>
                    )}

                    {/* Assistant Collapsible Reasoning Block */}
                    {msg.role === "assistant" && msg.thinking && (
                      <details
                        open={!msg.content ? true : undefined}
                        className="study-chat-thinking"
                      >
                        <summary className="flex cursor-pointer select-none items-center justify-between font-semibold text-[color:var(--text-brand-secondary-700)]">
                          <div className="flex items-center gap-1.5">
                            <Sparkles
                              className={`h-3.5 w-3.5 ${
                                !msg.content
                                  ? "animate-pulse text-[color:var(--fg-brand-primary-600)]"
                                  : "text-[color:var(--fg-brand-primary-600)]"
                              }`}
                            />
                            <span>
                              {!msg.content
                                ? "Reasoning in progress..."
                                : "Thought Process & Clinical Reasoning"}
                            </span>
                          </div>
                          <ChevronDown className="h-3.5 w-3.5 text-[color:var(--text-quaternary-500)]" />
                        </summary>
                        <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-[color:var(--text-tertiary-600)] max-h-56 overflow-y-auto rounded-lg bg-[var(--bg-primary)]/70 p-2 border border-[var(--border-primary)]/50 ">
                          {msg.thinking}
                        </pre>
                      </details>
                    )}

                    {/* Message Content: render text in pre-wrap preserving whitespace & code */}
                    <div className="whitespace-pre-wrap font-sans text-sm break-words">
                      {msg.content ||
                        (isStreaming && msg.id === messages.at(-1)?.id ? (
                          <span className="flex items-center gap-1.5 text-[color:var(--text-quaternary-500)] italic">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {msg.tools && msg.tools.some((t) => t.status === "running")
                              ? "Executing pharmacological research tools..."
                              : "Generating response..."}
                          </span>
                        ) : msg.artifacts?.length || msg.tools?.length ? null : (
                          <span className="text-[color:var(--text-tertiary-600)]">
                            {streamError ? "No response was returned." : "Response stopped."}
                          </span>
                        ))}
                    </div>

                    {/* Generated Artifacts (Documents, Slides, Flashcards, Chemical Structures, Mnemonics) */}
                    {msg.role === "assistant" && msg.artifacts && msg.artifacts.length > 0 && (
                      <div className="my-2.5 space-y-2">
                        {msg.artifacts.map((art, idx) => (
                          <ArtifactRenderer key={idx} artifact={art} />
                        ))}
                      </div>
                    )}

                    {/* Verified Syllabus Grounding Citations */}
                    {msg.role === "assistant" && msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 border-t border-[var(--border-secondary)] pt-2 ">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-quaternary-500)]">
                          <BookOpen className="h-3 w-3" />
                          <span>Sources</span>{" "}
                          {/* [CHAT FIX 2] Web sources are labeled separately. */}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {msg.citations.map((c, i) =>
                            externalSourceUrl(c) ? (
                              <a
                                key={i}
                                href={externalSourceUrl(c)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-md bg-[var(--bg-tertiary)] px-2 py-0.5 text-[11px] underline "
                                title={c.snippet}
                              >
                                {c.title} — Outside the lecture materials
                              </a>
                            ) : (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 rounded-md bg-[var(--bg-tertiary)] px-2 py-0.5 text-[11px] text-[color:var(--text-secondary-700)] "
                                title={c.snippet}
                              >
                                <span className="font-semibold text-[color:var(--text-brand-secondary-700)]">
                                  {c.course_code || "REF"}
                                </span>
                                <span className="truncate max-w-[140px]">{c.title}</span>
                                {c.page_start && (
                                  <span className="opacity-60">(p. {c.page_start})</span>
                                )}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {msg.role === "user" && (
                    <div className="study-chat-user-avatar">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              {streamError && (
                <p className="study-chat-error" role="alert">
                  <AlertCircle size={17} aria-hidden="true" />
                  {streamError}
                </p>
              )}
              <p className="p-sr-only" role="status">
                {isStreaming ? "PansGPT is responding" : ""}
              </p>
              <div ref={messagesEndRef} />
            </div>
          </div>
        </>
      )}
      {empty ? (
        <ChatRecent />
      ) : (
        <footer className="study-chat-footer">
          {composer}
          <p>
            PansGPT supports your studies. Verify clinical facts and dosages with official
            monographs.
          </p>
        </footer>
      )}
      <FirstChatDisclaimerModal
        isOpen={isDisclaimerOpen || (userId !== "anonymous" && !disclaimerAccepted)}
        userId={userId}
        onAccept={() => {
          setIsDisclaimerOpen(false);
          window.dispatchEvent(new Event("pansgpt-disclaimer"));
        }}
      />
    </div>
  );
}

const historySchema = z.object({
  session: z.object({ id: z.string().uuid(), user_id: z.string().uuid() }),
  messages: z.array(
    z.object({
      id: z.string().uuid(),
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
      thinking_text: z.string().nullable().optional(),
      citations: z
        .array(
          z.object({
            title: z.string(),
            chunk_id: z.string().nullable().optional(),
            document_id: z.string().nullable().optional(),
            source_type: z.enum(["document", "web"]).optional(),
            url: z.string().nullable().optional(),
            course_code: z.string().nullable().optional(),
            page_start: z.number().int().positive().nullable().optional(),
            page_end: z.number().int().positive().nullable().optional(),
            snippet: z.string().optional(),
            confidence: z.string().optional(),
          })
        )
        .nullable()
        .optional(),
    })
  ),
});

function ChatHistory({ id }: { id: string }): React.ReactElement {
  const { session, profile } = useAuth();
  const [history, setHistory] = useState<MessageItem[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const token = session?.access_token;
  const owner = profile?.id;
  useEffect(() => {
    const controller = new AbortController();
    async function load(): Promise<void> {
      try {
        if (!token || !owner || !z.string().uuid().safeParse(id).success)
          throw new Error("Invalid conversation");
        const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1/ai/chat/sessions/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Conversation unavailable");
        const result = historySchema.parse(await response.json());
        if (result.session.id !== id || result.session.user_id !== owner)
          throw new Error("Conversation mismatch");
        if (!controller.signal.aborted)
          setHistory(
            result.messages.flatMap((item): MessageItem[] =>
              item.role === "system"
                ? []
                : [
                    {
                      id: item.id,
                      role: item.role,
                      content: item.content,
                      thinking: item.thinking_text ?? undefined,
                      citations: item.citations ?? undefined,
                    },
                  ]
            )
          );
      } catch {
        if (!controller.signal.aborted) setError(true);
      }
    }
    void load();
    return () => controller.abort();
  }, [id, owner, token, attempt]);
  if (error)
    return (
      <div className="shell-placeholder" role="alert">
        <h1>We couldn&apos;t open this chat</h1>
        <p>It may be unavailable or no longer accessible.</p>
        <button
          onClick={() => {
            setError(false);
            setAttempt((value) => value + 1);
          }}
        >
          Try again
        </button>
        <Link href="/app/chat">Start a new chat</Link>
      </div>
    );
  if (!history) return <WorkspaceLoading />;
  return <ChatContent initialSessionId={id} initialMessages={history} />;
}
function ChatRoute(): React.ReactElement {
  const params = useSearchParams();
  const id = params.get("session");
  const { revision } = useChatDraft();
  return id ? (
    <ChatHistory key={`${revision}:${id}`} id={id} />
  ) : (
    <ChatContent key={`new-chat:${revision}`} />
  );
}
export default function ChatPage() {
  return (
    <Suspense fallback={<WorkspaceLoading />}>
      <ChatRoute />
    </Suspense>
  );
}
