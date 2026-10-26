"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getExternalStoreMessages, useAuiState } from "@assistant-ui/react";
import { Share2 } from "lucide-react";
import { Slideout } from "@pansgpt/ui/shell";
import type { ChatMessageView } from "@pansgpt/types";
import { useAuth } from "@/lib/auth-context";
import { useRecentChats } from "@/components/shell/dashboard-data";
import { useDashboard } from "@/components/shell/dashboard-data";
import { requestSession, type ChatSessionSummary } from "@/lib/chat-sessions";
import { ChatSessionMenu } from "./session-menu";

export function ChatHeader({
  sessionId,
  initialTitle,
  variant = "header",
}: {
  sessionId: string | null;
  initialTitle?: string;
  variant?: "header" | "sheet";
}): React.ReactElement {
  const { session, profile } = useAuth();
  const { chats } = useRecentChats();
  const { reload } = useDashboard();
  const running = useAuiState((state) => state.thread.isRunning);
  const messages = useAuiState((state) => state.thread.messages);
  const [saved, setSaved] = useState<ChatSessionSummary | null>(null);
  const [metadataError, setMetadataError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const shareTrigger = useRef<HTMLButtonElement>(null);
  const listed = chats.find((chat) => chat.id === sessionId);
  const publishedTitle = useRef("");
  const hasAnswer = messages.some((message) => message.role === "assistant");
  useEffect(() => {
    if (!sessionId) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let polls = 0;
    const load = () => {
      void requestSession(session?.access_token, sessionId, undefined, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return;
          if (!result || result.user_id !== profile?.id)
            throw new Error("Conversation ownership mismatch.");
          setSaved(result);
          setMetadataError(false);
          if (result.title_source === "pending" && hasAnswer && !running && polls++ < 6)
            timer = setTimeout(load, 2500);
          if (
            (result.title_source === "generated" ||
              (result.title_source === "pending" && result.title !== "New Chat")) &&
            publishedTitle.current !== `${result.id}:${result.title}`
          ) {
            publishedTitle.current = `${result.id}:${result.title}`;
            reload();
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) setMetadataError(true);
        });
    };
    load();
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [
    sessionId,
    session?.access_token,
    profile?.id,
    profile?.university_id,
    attempt,
    hasAnswer,
    running,
    reload,
  ]);
  const fetched = saved?.id === sessionId ? saved : null;
  const current =
    fetched &&
    (!listed || Date.parse(fetched.updated_at ?? "") >= Date.parse(listed.updated_at ?? ""))
      ? fetched
      : (listed ?? fetched);
  const title =
    current?.title_source === "pending" && current.title === "New Chat"
      ? "New chat"
      : current?.title || initialTitle || "New chat";
  const chat: ChatSessionSummary = {
    id: sessionId ?? "",
    title,
    is_pinned: current?.is_pinned ?? false,
    archived_at: current?.archived_at ?? null,
  };
  // Selected runtime path only. Never serialize repository branches, reasoning, tool internals or private URLs.
  const transcript = useMemo(() => {
    if (!sharing) return "";
    return (
      `# ${title}\n\n` +
      messages
        .map((message) => {
          const original = getExternalStoreMessages<ChatMessageView>(message)[0];
          const text = message.content
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join("\n");
          const files =
            original?.attachments?.map((file) => `Attachment: ${file.name}`).join("\n") || "";
          return `## ${message.role === "user" ? "You" : "PansGPT"}\n\n${text}${files ? `\n\n${files}` : ""}`;
        })
        .join("\n\n")
    );
  }, [sharing, title, messages]);
  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(transcript);
      setCopyStatus("Conversation copied.");
    } catch {
      setCopyStatus("Copy is unavailable. Select the text below and copy it manually.");
    }
  }
  function download(): void {
    const url = URL.createObjectURL(
      new Blob([transcript], { type: "text/markdown;charset=utf-8" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "pansgpt-conversation.md";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (variant === "sheet")
    return (
      <ChatSessionMenu
        chat={chat}
        compactTrigger
        disabled={!sessionId || running || metadataError}
        onChanged={setSaved}
      />
    );
  return (
    <header className="study-chat-thread-heading">
      <div className="study-chat-heading-copy">
        <h1 className="p-sr-only">{title}</h1>
        <ChatSessionMenu
          chat={chat}
          titleTrigger
          disabled={!sessionId || running || metadataError}
          onChanged={setSaved}
        />
        {metadataError && (
          <button
            className="study-chat-metadata-retry"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Reload chat options
          </button>
        )}
      </div>
      <button
        ref={shareTrigger}
        className="study-chat-share"
        disabled={running}
        onClick={() => {
          setCopyStatus(null);
          setSharing(true);
        }}
      >
        <Share2 size={16} aria-hidden="true" />
        Share
      </button>
      <Slideout
        open={sharing}
        onOpenChange={setSharing}
        title="Share conversation"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          shareTrigger.current?.focus();
        }}
        description="Share a copy of this branch. Review the messages before sharing."
      >
        <div className="study-chat-share-copy">
          <p>Includes messages and attachment names. Attached files are not included.</p>
          <label>
            Conversation preview
            <textarea readOnly value={transcript} rows={14} />
          </label>
          <div>
            <button
              onClick={() => {
                void copy();
              }}
            >
              Copy conversation
            </button>
            <button onClick={download}>Download copy</button>
          </div>
          {copyStatus && <p role="status">{copyStatus}</p>}
        </div>
      </Slideout>
    </header>
  );
}
