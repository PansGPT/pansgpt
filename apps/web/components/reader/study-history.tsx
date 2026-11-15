"use client";

import { fetchWithRecovery } from "@/lib/chat-recovery";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Search } from "lucide-react";
import { z } from "zod";
import type { ChatSessionMetadata, ReaderConversationsResponse } from "@pansgpt/types";
import { chatSessionSchema } from "@/lib/chat-sessions";
import { useAuth } from "@/lib/auth-context";
import { env } from "@/env";
import { MobileChatHistoryList } from "@/components/shell/mobile-chat-history-list";
import { ConversationHistoryRow } from "@/components/shell/conversation-history-row";
import { flushSync } from "react-dom";

const schema: z.ZodType<ReaderConversationsResponse> = z.object({
  sessions: z.array(chatSessionSchema),
  next_offset: z.number().int().nonnegative().nullable(),
});

export function StudyHistory({
  documentId,
  selectedId,
  revision,
  onChoose,
  mobile = false,
  searchVisible = false,
  inputRef,
}: {
  documentId: string;
  selectedId: string | null;
  revision: number;
  onChoose: (id: string) => void;
  mobile?: boolean;
  searchVisible?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
}): React.ReactElement {
  const { session, profile } = useAuth();
  const [items, setItems] = useState<ChatSessionMetadata[]>([]);
  const [offset, setOffset] = useState(0);
  const [next, setNext] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [desktopSearch, setDesktopSearch] = useState(false);
  const desktopInput = useRef<HTMLInputElement | null>(null);
  const term = (searchVisible || desktopSearch) && query.trim().length >= 2 ? query.trim() : "";
  const token = session?.access_token,
    owner = profile?.id;
  useEffect(() => {
    if (!token || !owner) return;
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => {
        void (async () => {
          try {
            setLoading(true);
            setError(false);
            const response = await fetchWithRecovery(
              `${env.NEXT_PUBLIC_API_URL}/api/v1/library/catalog/${documentId}/conversations?offset=${offset}&limit=30${term ? `&q=${encodeURIComponent(term)}` : ""}`,
              {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
                signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]),
              }
            );
            if (!response.ok) throw new Error("History unavailable");
            const data = schema.parse(await response.json());
            if (
              data.sessions.some(
                (item) => item.user_id !== owner || item.document_id !== documentId
              ) ||
              (data.next_offset !== null && data.next_offset <= offset)
            )
              throw new Error("History scope mismatch");
            if (!controller.signal.aborted) {
              setItems((previous) =>
                offset
                  ? Array.from(
                      new Map(
                        [...previous, ...data.sessions].map((item) => [item.id, item])
                      ).values()
                    )
                  : data.sessions
              );
              setNext(data.next_offset);
            }
          } catch {
            if (!controller.signal.aborted) setError(true);
          } finally {
            if (!controller.signal.aborted) setLoading(false);
          }
        })();
      },
      term ? 250 : 0
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [documentId, owner, token, offset, attempt, revision, term]);
  if (mobile)
    return (
      <>
        {searchVisible && (
          <label className="mobile-home-history-search">
            <Search size={18} aria-hidden="true" />
            <input
              ref={inputRef}
              aria-label="Search chat history"
              placeholder="Search conversations"
              value={query}
              maxLength={200}
              onChange={(event) => {
                setQuery(event.target.value);
                setOffset(0);
              }}
            />
          </label>
        )}
        {searchVisible && query.trim().length === 1 && (
          <p>Type at least two characters to search.</p>
        )}
        {loading && <p role="status">Loading conversations…</p>}
        {error ? (
          <div role="alert">
            <p>We couldn&apos;t load your conversations.</p>
            <button onClick={() => setAttempt((value) => value + 1)}>Try again</button>
          </div>
        ) : (
          <MobileChatHistoryList
            chats={items}
            onChoose={onChoose}
            onChanged={() => {
              setOffset(0);
              setAttempt((value) => value + 1);
            }}
          />
        )}
        {!error && !loading && !items.length && (
          <p>{term ? "No conversations found." : "Your conversations will appear here."}</p>
        )}
        {next !== null && !loading && !error && (
          <button onClick={() => setOffset(next)}>Load more</button>
        )}
      </>
    );
  const pinned = items.filter((item) => item.is_pinned);
  const recent = items.filter((item) => !item.is_pinned);
  const row = (item: ChatSessionMetadata) => (
    <ConversationHistoryRow
      key={item.id}
      chat={item}
      current={item.id === selectedId}
      onChoose={() => onChoose(item.id)}
      onChanged={() => {
        setOffset(0);
        setAttempt((value) => value + 1);
      }}
    />
  );
  return (
    <section
      className="reader-history shell-sidebar-group shell-chat-history"
      aria-label="Study chat history"
    >
      <div className="shell-recent-heading">
        <h2>Recent chats</h2>
        <button
          type="button"
          aria-label="Search study chat history"
          onClick={() => {
            flushSync(() => setDesktopSearch((value) => !value));
            desktopInput.current?.focus();
          }}
        >
          <Search size={16} aria-hidden="true" />
        </button>
      </div>
      {desktopSearch && (
        <label className="mobile-home-history-search">
          <Search size={16} aria-hidden="true" />
          <input
            ref={desktopInput}
            aria-label="Search study conversations"
            placeholder="Search conversations"
            value={query}
            maxLength={200}
            onChange={(event) => {
              setQuery(event.target.value);
              setOffset(0);
            }}
          />
        </label>
      )}
      <div
        className="shell-chat-list"
        role="region"
        aria-label="Document chat history"
        tabIndex={0}
      >
        {!!pinned.length && (
          <section className="shell-pinned-chats" aria-label="Pinned study chats">
            <h2>Pinned</h2>
            {pinned.map(row)}
          </section>
        )}
        {loading ? (
          <p className="shell-sidebar-hint" role="status">
            Loading chats…
          </p>
        ) : error ? (
          <div role="alert">
            <p className="shell-sidebar-hint">Chat history is unavailable.</p>
            <button
              className="shell-history-more"
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Retry history
            </button>
          </div>
        ) : !items.length ? (
          <p className="shell-sidebar-hint">
            {term
              ? "No conversations found."
              : "Your conversations about this document will appear here."}
          </p>
        ) : (
          recent.map(row)
        )}
        {next !== null && !loading && !error && (
          <button className="shell-history-more" type="button" onClick={() => setOffset(next)}>
            Load more conversations
          </button>
        )}
      </div>
    </section>
  );
}
