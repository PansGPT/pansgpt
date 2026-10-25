"use client";

import { useEffect, useRef, useState, useSyncExternalStore, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { AssistantRuntimeProvider, ThreadPrimitive, useAuiState } from "@assistant-ui/react";
import type { ChatMessageView } from "@pansgpt/types";
import { ArrowDown, AlertCircle } from "lucide-react";
import { z } from "zod";
import { env } from "@/env";
import { useAuth } from "@/lib/auth-context";
import { useChatDraft } from "@/components/shell/chat-draft";
import { useDashboard } from "@/components/shell/dashboard-data";
import { WorkspaceLoading } from "@/components/shell/loading";
import { FirstChatDisclaimerModal } from "@/components/FirstChatDisclaimerModal";
import { ChatRecent } from "@/components/chat/recent";
import { ChatTools } from "@/components/chat/tools";
import { ChatHeader } from "@/components/chat/header";
import { ChatComposer } from "@/components/chat/composer";
import { ChatMessages } from "@/components/chat/virtual-messages";
import { parseChatHistory } from "@/lib/chat-history";
import { ChatActionsContext } from "@/components/chat/actions-context";
import { useChatRuntime } from "@/components/chat/use-chat-runtime";
import {
  PresentationWorkspace,
  usePresentationWorkspace,
} from "@/components/artifacts/PresentationWorkspace";
import "./chat.css";

const desktopQuery = "(min-width: 861px)";
function subscribeDesktop(notify: () => void): () => void {
  const query = window.matchMedia(desktopQuery);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}

function ChatThread({
  name,
  initialDraft,
  error,
  sessionId,
  initialTitle,
}: {
  name: string;
  initialDraft: string;
  error: string | null;
  sessionId: string | null;
  initialTitle?: string;
}): React.ReactElement {
  const desktop = useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(desktopQuery).matches,
    () => true
  );
  const empty = useAuiState((state) => state.thread.isEmpty);
  const running = useAuiState((state) => state.thread.isRunning);
  const root = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  const [period] = useState(() => {
    const hour = new Date().getHours();
    return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  });
  return (
    <ThreadPrimitive.Root ref={root} className="study-chat" data-empty={empty}>
      {empty ? (
        <section className="study-chat-welcome" aria-labelledby="chat-welcome-title">
          <div className="study-chat-intro">
            <h1 id="chat-welcome-title">
              Good {period}, <span>{name}</span>
            </h1>
          </div>
          <ChatComposer initialDraft={initialDraft} />
          {desktop && <ChatTools />}
          {error && (
            <p className="study-chat-error" role="alert">
              <AlertCircle size={17} aria-hidden="true" />
              {error}
            </p>
          )}
        </section>
      ) : (
        <>
          <ChatHeader sessionId={sessionId} initialTitle={initialTitle} />
          <ThreadPrimitive.Viewport
            ref={setViewport}
            className="study-chat-conversation"
            turnAnchor="top"
            data-slot="aui_thread-viewport"
          >
            <div className="study-chat-thread-content">
              <div className="study-chat-messages" data-slot="aui_message-group">
                <ChatMessages viewport={viewport} />
                <span className="p-sr-only" role="status">
                  {running ? "PansGPT is responding" : ""}
                </span>
              </div>
              <ThreadPrimitive.ViewportFooter className="study-chat-footer aui-thread-viewport-footer">
                <ThreadPrimitive.ScrollToBottom
                  className="study-chat-scroll-bottom"
                  aria-label="Scroll to latest message"
                  title="Scroll to latest message"
                >
                  <ArrowDown size={16} aria-hidden="true" />
                </ThreadPrimitive.ScrollToBottom>
                {error && (
                  <p className="study-chat-error" role="alert">
                    <AlertCircle size={17} aria-hidden="true" />
                    {error}
                  </p>
                )}
                <ChatComposer />
                <p>
                  PansGPT supports your studies. Verify clinical facts and dosages with official
                  monographs.
                </p>
              </ThreadPrimitive.ViewportFooter>
            </div>
          </ThreadPrimitive.Viewport>
        </>
      )}
      {empty && !desktop && <ChatRecent />}
    </ThreadPrimitive.Root>
  );
}

function ChatContent({
  initialSessionId = null,
  initialMessages = [],
  initialTitle,
}: {
  initialSessionId?: string | null;
  initialMessages?: ChatMessageView[];
  initialTitle?: string;
}): React.ReactElement {
  const { user, session, profile, loading } = useAuth();
  const { draft, setDraft, startNewChat } = useChatDraft();
  const presentations = usePresentationWorkspace();
  const router = useRouter();
  const [initialDraft] = useState(draft);
  const { reload } = useDashboard();
  const [acknowledgedHere, setAcknowledgedHere] = useState(false);
  const userId = user?.id || profile?.id || "anonymous";
  const accepted = useSyncExternalStore(
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
        return !!localStorage.getItem(`pansgpt_disclaimer_accepted_${userId}`);
      } catch {
        return false;
      }
    },
    () => true
  );
  useEffect(() => () => setDraft(""), [setDraft]);
  const { runtime, error, submitFeedback, currentSessionId } = useChatRuntime({
    token: session?.access_token,
    ownerId: userId,
    canSend: accepted || acknowledgedHere,
    initialSessionId,
    initialMessages,
    onSessionChanged: reload,
    onArtifactReady: presentations?.received,
  });
  useEffect(() => {
    function removed(event: Event): void {
      if (
        event instanceof CustomEvent &&
        typeof event.detail === "object" &&
        event.detail?.id === currentSessionId
      ) {
        startNewChat();
        router.replace("/app/chat");
      }
    }
    window.addEventListener("pansgpt-chat-removed", removed);
    return () => window.removeEventListener("pansgpt-chat-removed", removed);
  }, [currentSessionId, startNewChat, router]);
  if (loading) return <WorkspaceLoading />;
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ChatActionsContext.Provider value={{ submitFeedback, sessionId: currentSessionId }}>
        <ChatThread
          name={profile?.first_name || "there"}
          initialDraft={initialDraft}
          error={error}
          sessionId={currentSessionId}
          initialTitle={initialTitle}
        />
        <FirstChatDisclaimerModal
          isOpen={userId !== "anonymous" && !accepted && !acknowledgedHere}
          userId={userId}
          onAccept={() => {
            setAcknowledgedHere(true);
            window.dispatchEvent(new Event("pansgpt-disclaimer"));
          }}
        />
      </ChatActionsContext.Provider>
    </AssistantRuntimeProvider>
  );
}

function ChatHistory({ id }: { id: string }): React.ReactElement {
  const { session, profile } = useAuth();
  const [title, setTitle] = useState<string>();
  const [history, setHistory] = useState<ChatMessageView[] | null>(null);
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
        const response = await fetch(
          `${env.NEXT_PUBLIC_API_URL}/api/v1/ai/chat/sessions/${id}?include_branches=true`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }
        );
        if (!response.ok) throw new Error("Conversation unavailable");
        const data: unknown = await response.json();
        const messages = parseChatHistory(data, id, owner);
        const metadata = z
          .object({ session: z.object({ title: z.string().optional() }) })
          .parse(data);
        if (!controller.signal.aborted) setTitle(metadata.session.title);
        if (!controller.signal.aborted) setHistory(messages);
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
  return <ChatContent initialSessionId={id} initialMessages={history} initialTitle={title} />;
}
function ChatRoute(): React.ReactElement {
  const params = useSearchParams();
  const id = params.get("session");
  const { revision } = useChatDraft();
  const { profile } = useAuth();
  const identity = `${profile?.id}:${profile?.university_id}`;
  return id ? (
    <ChatHistory key={`${identity}:${revision}:${id}`} id={id} />
  ) : (
    <ChatContent key={`${identity}:new-chat:${revision}`} />
  );
}
export default function ChatPage() {
  return (
    <Suspense fallback={<WorkspaceLoading />}>
      <PresentationRoute />
    </Suspense>
  );
}

function PresentationRoute(): React.ReactElement {
  const { profile } = useAuth();
  const params = useSearchParams();
  const { revision } = useChatDraft();
  return (
    <PresentationWorkspace
      key={`${profile?.id}:${profile?.university_id}:${params.get("session") || "new"}:${revision}`}
    >
      <ChatRoute />
    </PresentationWorkspace>
  );
}
