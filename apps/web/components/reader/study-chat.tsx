"use client";

import { VoiceRecoveryAction } from "@/components/chat/connection-notice";

import { fetchWithRecovery } from "@/lib/chat-recovery";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal, flushSync } from "react-dom";
import { AssistantRuntimeProvider, ThreadPrimitive, useAuiState } from "@assistant-ui/react";
import { ArrowDown, History, SquarePen } from "lucide-react";
import type { ChatMessageView, CitationItem, LibraryDocument } from "@pansgpt/types";
import { useAuth } from "@/lib/auth-context";
import { useChatRuntime } from "@/components/chat/use-chat-runtime";
import { ChatActionsContext } from "@/components/chat/actions-context";
import { ChatMessages } from "@/components/chat/virtual-messages";
import { ChatComposerSlotProvider } from "@/components/chat/composer";
import { FirstChatDisclaimerModal } from "@/components/FirstChatDisclaimerModal";
import { parseChatHistory } from "@/lib/chat-history";
import { env } from "@/env";
import { z } from "zod";
import { ChatComposer } from "@/components/chat/composer";
import { StudyHistory } from "./study-history";
import { MobileChatSheet } from "@/components/shell/mobile-chat-sheet";
import { MobileChatHeader } from "@/components/shell/mobile-chat-header";
import { ChatHeader } from "@/components/chat/header";
import type { ChatActionMode } from "@pansgpt/types";
import "@/app/app/chat/chat.css";

export interface ReaderDraft {
  id: number;
  text: string;
  append?: boolean;
  submit?: boolean;
  file?: File;
}

function StudyThread({
  error,
  actionMode,
  onActionModeChange,
}: {
  error: string | null;
  actionMode: ChatActionMode | null;
  onActionModeChange: (mode: ChatActionMode | null) => void;
}): React.ReactElement {
  const { profile } = useAuth();
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  const empty = useAuiState((state) => state.thread.isEmpty);
  const [period] = useState(() => {
    const hour = new Date().getHours();
    return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  });
  const composer = (
    <ChatComposer
      notice={error}
      noticeActions={<VoiceRecoveryAction />}
      documentBound
      inputLabel="Ask about this document"
      actionMode={actionMode}
      onActionModeChange={onActionModeChange}
    />
  );
  return (
    <ChatComposerSlotProvider>
      <ThreadPrimitive.Root className="study-chat reader-chat-thread" data-empty={empty}>
        {empty ? (
          <section className="study-chat-welcome reader-chat-welcome">
            <div className="study-chat-intro">
              <h1>
                Good {period}, <span>{profile?.first_name || "there"}</span>
              </h1>
            </div>
            {composer}
          </section>
        ) : (
          <ThreadPrimitive.Viewport
            ref={setViewport}
            className="study-chat-conversation reader-chat-messages"
            turnAnchor="top"
          >
            <div className="study-chat-thread-content">
              <div className="study-chat-messages">
                <ChatMessages viewport={viewport} />
              </div>
              <ThreadPrimitive.ViewportFooter className="study-chat-footer">
                <ThreadPrimitive.ScrollToBottom
                  className="study-chat-scroll-bottom"
                  aria-label="Scroll to latest message"
                >
                  <ArrowDown size={16} />
                </ThreadPrimitive.ScrollToBottom>
                {composer}
              </ThreadPrimitive.ViewportFooter>
            </div>
          </ThreadPrimitive.Viewport>
        )}
      </ThreadPrimitive.Root>
    </ChatComposerSlotProvider>
  );
}

function StudyConversation({
  active,
  document,
  sessionId,
  messages,
  draft,
  onCitation,
  onChanged,
  renderThread,
  onCurrentSession,
}: {
  active: boolean;
  document: LibraryDocument;
  sessionId: string | null;
  messages: ChatMessageView[];
  draft: ReaderDraft | null;
  onCitation: (citation: CitationItem) => void;
  onChanged: () => void;
  renderThread: (thread: ReactNode, controls?: ReactNode) => ReactNode;
  onCurrentSession: (id: string) => void;
}): React.ReactElement {
  const { session, profile } = useAuth();
  const ownerId = profile!.id;
  const [acknowledged, setAcknowledged] = useState(false);
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
        return !!localStorage.getItem(`pansgpt_disclaimer_accepted_${ownerId}`);
      } catch {
        return false;
      }
    },
    () => false
  );
  const ready = document.status === "active" && document.embedding_status === "completed";
  const {
    runtime,
    error,
    feedbackPending,
    currentSessionId,
    actionMode,
    setSelectedActionMode,
    online,
    retryMessage,
    sendReaderFile,
    retryVoice,
    canRetryVoice,
  } = useChatRuntime({
    active,
    token: session?.access_token,
    ownerId,
    canSend: ready && (accepted || acknowledged),
    initialSessionId: sessionId,
    initialMessages: messages,
    fixedDocumentId: document.id,
    onSessionChanged: onChanged,
  });
  useEffect(() => {
    if (currentSessionId) onCurrentSession(currentSessionId);
  }, [currentSessionId, onCurrentSession]);
  const applied = useRef<number | null>(null);
  const running = useSyncExternalStore(
    useCallback((notify) => runtime.thread.subscribe(notify), [runtime]),
    () => runtime.thread.getState().isRunning,
    () => false
  );
  const [draftError, setDraftError] = useState<{ id: number; message: string } | null>(null);
  useEffect(() => {
    if (!draft || applied.current === draft.id) return;
    if (draft.submit) {
      if (!active || !ready || !(accepted || acknowledged) || running) return;
      applied.current = draft.id;
      if (draft.file) void sendReaderFile(draft.text, draft.file);
      else runtime.thread.append({ role: "user", content: [{ type: "text", text: draft.text }] });
      return;
    }
    if (draft.file && (!ready || !(accepted || acknowledged))) return;
    applied.current = draft.id;
    if (draft.file && runtime.thread.composer.getState().attachments.length >= 4) {
      queueMicrotask(() =>
        setDraftError({ id: draft.id, message: "Attach up to four files at a time." })
      );
      return;
    }
    const previous = runtime.thread.composer.getState().text;
    // Preserve an unfinished question when a PDF selection is added.
    if (draft.text)
      runtime.thread.composer.setText(
        previous.trim() ? `${previous}\n\n${draft.text}` : draft.text
      );
    if (draft.file)
      void runtime.thread.composer.addAttachment(draft.file).catch(() =>
        setDraftError({
          id: draft.id,
          message: "The snippet couldn’t be added. Return to the PDF and try again.",
        })
      );
  }, [draft, runtime, ready, accepted, acknowledged, active, running, sendReaderFile]);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ChatActionsContext.Provider
        value={{
          sessionId: currentSessionId,
          feedbackPending,
          onCitation,
          hideSources: true,
          online,
          retryMessage,
          retryVoice,
          canRetryVoice,
        }}
      >
        {renderThread(
          <>
            {!ready && (
              <p className="reader-chat-notice" role="status">
                {document.status !== "active"
                  ? "Study chat is available when this document is active."
                  : "This document is still being indexed. You can keep reading while study chat is prepared."}
              </p>
            )}
            <StudyThread
              error={draftError?.id === draft?.id ? (draftError?.message ?? error) : error}
              actionMode={actionMode}
              onActionModeChange={setSelectedActionMode}
            />
          </>,
          <ChatHeader sessionId={currentSessionId} variant="sheet" />
        )}
        <FirstChatDisclaimerModal
          isOpen={active && ready && !accepted && !acknowledged}
          userId={ownerId}
          onAccept={() => {
            setAcknowledged(true);
            window.dispatchEvent(new Event("pansgpt-disclaimer"));
          }}
        />
      </ChatActionsContext.Provider>
    </AssistantRuntimeProvider>
  );
}

function StudyChatSession({
  active,
  document,
  sessionId,
  draft,
  onCitation,
  onChanged,
  renderThread,
  onCurrentSession,
}: {
  active: boolean;
  document: LibraryDocument;
  sessionId: string | null;
  draft: ReaderDraft | null;
  onCitation: (citation: CitationItem) => void;
  onChanged: () => void;
  renderThread: (thread: ReactNode, controls?: ReactNode) => ReactNode;
  onCurrentSession: (id: string) => void;
}): React.ReactElement {
  const { session, profile } = useAuth();
  const [state, setState] = useState<{ messages: ChatMessageView[] } | null>(
    sessionId ? null : { messages: [] }
  );
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const token = session?.access_token,
    owner = profile?.id;
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  useEffect(() => {
    if (!sessionId || !owner || !token) return;
    const controller = new AbortController();
    void (async () => {
      try {
        setError(false);
        const response = await fetchWithRecovery(
          `${env.NEXT_PUBLIC_API_URL}/api/v1/ai/chat/sessions/${sessionId}?include_branches=true`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
            signal: controller.signal,
          }
        );
        if (!response.ok) throw new Error("Conversation unavailable");
        const data: unknown = await response.json();
        const identity = z
          .object({ session: z.object({ document_id: z.literal(document.id) }) })
          .parse(data);
        if (identity.session.document_id !== document.id)
          throw new Error("Document scope mismatch");
        const messages = parseChatHistory(data, sessionId, owner);
        if (!controller.signal.aborted) setState({ messages });
      } catch {
        if (!controller.signal.aborted) setError(true);
      }
    })();
    return () => controller.abort();
  }, [document.id, sessionId, token, owner, attempt]);
  if (error)
    return (
      <>
        {renderThread(
          <div className="reader-empty" role="alert">
            <h2>Your study chat couldn’t load.</h2>
            <p>Your PDF is still available.</p>
            <button type="button" onClick={retry}>
              Retry study chat
            </button>
          </div>
        )}
      </>
    );
  if (!state || !profile)
    return (
      <>
        {renderThread(
          <div className="reader-empty" role="status">
            Loading your study chat…
          </div>
        )}
      </>
    );
  return (
    <StudyConversation
      active={active}
      document={document}
      sessionId={sessionId}
      messages={state.messages}
      draft={draft}
      onCitation={onCitation}
      onChanged={onChanged}
      renderThread={renderThread}
      onCurrentSession={onCurrentSession}
    />
  );
}

export function StudyChat({
  active,
  document,
  sessionId,
  draft,
  onCitation,
  onChanged,
  tab,
  onTabChange,
  onClearDraft,
  onBackToReader,
  returnFocus,
}: {
  active: boolean;
  document: LibraryDocument;
  sessionId: string | null;
  draft: ReaderDraft | null;
  onCitation: (citation: CitationItem) => void;
  onChanged: () => void;
  tab: "chat" | "history";
  onTabChange: (tab: "chat" | "history") => void;
  onClearDraft: () => void;
  onBackToReader: () => void;
  returnFocus: RefObject<HTMLElement | null>;
}): React.ReactElement {
  const [conversation, setConversation] = useState({ id: sessionId, revision: 0 });
  const [selectedId, setSelectedId] = useState(sessionId);
  const [historyRevision, setHistoryRevision] = useState(0);
  const [historySearch, setHistorySearch] = useState(false);
  const historyInput = useRef<HTMLInputElement | null>(null);
  const mobile = useSyncExternalStore(
    useCallback((notify) => {
      const query = window.matchMedia("(max-width: 860px)");
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    }, []),
    () => window.matchMedia("(max-width: 860px)").matches,
    () => false
  );
  const [desktopTarget, setDesktopTarget] = useState<HTMLDivElement | null>(null);
  const [mobileTarget, setMobileTarget] = useState<HTMLDivElement | null>(null);
  const [menuTarget, setMenuTarget] = useState<HTMLDivElement | null>(null);
  const renderThread = useCallback(
    (thread: ReactNode, controls?: ReactNode) => {
      const target = mobile ? mobileTarget : desktopTarget;
      return (
        <>
          {target ? createPortal(thread, target) : null}
          {mobile && menuTarget && controls ? createPortal(controls, menuTarget) : null}
        </>
      );
    },
    [mobile, mobileTarget, desktopTarget, menuTarget]
  );
  const changeOpen = useCallback(
    (open: boolean) => {
      if (!open) onBackToReader();
    },
    [onBackToReader]
  );
  const changeHistory = useCallback(
    (open: boolean) => onTabChange(open ? "history" : "chat"),
    [onTabChange]
  );
  const changed = useCallback(() => {
    setHistoryRevision((value) => value + 1);
    onChanged();
  }, [onChanged]);
  useEffect(() => {
    const removed = (event: Event) => {
      if (!(event instanceof CustomEvent) || event.detail?.id !== selectedId) return;
      onClearDraft();
      setSelectedId(null);
      setConversation((value) => ({ id: null, revision: value.revision + 1 }));
      onTabChange("chat");
    };
    window.addEventListener("pansgpt-chat-removed", removed);
    return () => window.removeEventListener("pansgpt-chat-removed", removed);
  }, [selectedId, onClearDraft, onTabChange]);
  function choose(id: string | null): void {
    if (id && id === selectedId) {
      onTabChange("chat");
      return;
    }
    onClearDraft();
    setConversation((value) => ({ id, revision: value.revision + 1 }));
    setSelectedId(id);
    onTabChange("chat");
  }
  return (
    <>
      <header className="reader-study-header">
        <button
          type="button"
          className="reader-icon reader-history-toggle"
          aria-label="Study chat history"
          title="History"
          aria-pressed={tab === "history"}
          aria-controls="reader-history"
          onClick={() => onTabChange(tab === "history" ? "chat" : "history")}
        >
          <History size={19} />
        </button>
        <button
          type="button"
          className="reader-icon reader-new-chat"
          aria-label="New study chat"
          title="New chat"
          onClick={() => choose(null)}
        >
          <SquarePen size={19} />
        </button>
      </header>
      <div
        id="reader-conversation"
        className="reader-chat-content"
        role="region"
        aria-label="Study conversation"
        hidden={tab !== "chat"}
        ref={setDesktopTarget}
      />
      <div
        id="reader-history"
        className="reader-history-panel"
        role="region"
        aria-label="Study history"
        hidden={tab !== "history"}
      >
        {!mobile && tab === "history" && (
          <StudyHistory
            documentId={document.id}
            selectedId={selectedId}
            revision={historyRevision}
            onChoose={choose}
          />
        )}
      </div>
      <MobileChatSheet
        open={mobile && active}
        onOpenChange={changeOpen}
        historyOpen={tab === "history"}
        onHistoryChange={changeHistory}
        returnFocus={returnFocus}
        title="Document study chat"
        description="Ask about the open PDF and your supporting materials. Close or swipe down to return to reading; your draft is kept."
        className="reader-study-sheet"
        closeLabel="Back to reader"
      >
        <MobileChatHeader
          historyOpen={tab === "history"}
          onToggleHistory={() => changeHistory(tab !== "history")}
          onSearch={() => {
            flushSync(() => setHistorySearch(true));
            historyInput.current?.focus();
          }}
          onNew={() => choose(null)}
          historyId="reader-mobile-history"
          showNew={!!selectedId || !!draft?.file}
          controls={<div ref={setMenuTarget} />}
        />
        <div className="mobile-home-chat-views" data-history={tab === "history"}>
          <div className="mobile-home-chat-track">
            <section
              id="reader-mobile-history"
              className="mobile-home-chat-history"
              aria-label="Study history"
              inert={tab !== "history"}
            >
              {mobile && active && tab === "history" && (
                <StudyHistory
                  documentId={document.id}
                  selectedId={selectedId}
                  revision={historyRevision}
                  onChoose={choose}
                  mobile
                  searchVisible={historySearch}
                  inputRef={historyInput}
                />
              )}
            </section>
            <div
              className="mobile-home-chat-pane"
              ref={setMobileTarget}
              inert={tab === "history"}
            />
          </div>
        </div>
      </MobileChatSheet>
      <StudyChatSession
        key={`${conversation.id || "new"}:${conversation.revision}`}
        active={active}
        document={document}
        sessionId={conversation.id}
        draft={draft}
        onCitation={onCitation}
        onChanged={changed}
        renderThread={renderThread}
        onCurrentSession={setSelectedId}
      />
    </>
  );
}
