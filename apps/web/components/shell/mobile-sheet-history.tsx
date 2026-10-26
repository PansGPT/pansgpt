"use client";

import { useEffect, useState, type RefObject } from "react";
import { MessageCircle, Search } from "lucide-react";
import type { ChatSearchResult } from "@pansgpt/types";
import { useAuth } from "@/lib/auth-context";
import { searchConversations } from "@/lib/chat-sessions";
import { searchPreviewText } from "@/lib/search-preview";
import { useDashboard, useRecentChats } from "./dashboard-data";

export function MobileSheetHistory({
  active,
  searchVisible,
  inputRef,
  onChoose,
}: {
  active: boolean;
  searchVisible: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onChoose: (id: string) => void;
}): React.ReactElement {
  const chats = useRecentChats();
  const { reload } = useDashboard();
  const { session } = useAuth();
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState<{
    query: string;
    results: ChatSearchResult[];
    next: number | null;
    error?: string;
  }>();
  const term = query.trim();
  const searching = searchVisible && term.length >= 2;
  const current = page?.query === term ? page : undefined;
  useEffect(() => {
    if (!active || !searching) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      void searchConversations(session?.access_token, term, false, offset, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted)
            setPage((previous) => ({
              query: term,
              results:
                offset && previous?.query === term
                  ? Array.from(
                      new Map(
                        [...previous.results, ...result.results].map((item) => [
                          item.session_id,
                          item,
                        ])
                      ).values()
                    )
                  : result.results,
              next: result.next_offset,
            }));
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setPage({
              query: term,
              results: [],
              next: null,
              error: "Conversation search is unavailable. Please retry.",
            });
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [active, searching, term, offset, attempt, session?.access_token]);
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
      {searching ? (
        <>
          {(!current || loading) && <p role="status">Searching conversations…</p>}
          {current?.error ? (
            <div role="alert">
              <p>{current.error}</p>
              <button
                onClick={() => {
                  setOffset(0);
                  setAttempt((value) => value + 1);
                }}
              >
                Try again
              </button>
            </div>
          ) : (
            current?.results.map((chat) => (
              <button
                className="mobile-home-history-row"
                key={chat.session_id}
                onClick={() => onChoose(chat.session_id)}
              >
                <MessageCircle size={19} aria-hidden="true" />
                <span>
                  {chat.title}
                  <small>{searchPreviewText(chat.snippet)}</small>
                </span>
              </button>
            ))
          )}
          {current && !loading && !current.error && !current.results.length && (
            <p>No conversations found.</p>
          )}
          {current?.next != null && (
            <button disabled={loading} onClick={() => setOffset(current.next!)}>
              Load more
            </button>
          )}
        </>
      ) : (
        <>
          {searchVisible && term.length === 1 && <p>Type at least two characters to search.</p>}
          {chats.loading && <p role="status">Loading conversations…</p>}
          {chats.error ? (
            <div role="alert">
              <p>We couldn&apos;t load your conversations.</p>
              <button onClick={reload}>Try again</button>
            </div>
          ) : chats.chats.length ? (
            chats.chats.map((chat) => (
              <button
                className="mobile-home-history-row"
                key={chat.id}
                onClick={() => onChoose(chat.id)}
              >
                <MessageCircle size={19} aria-hidden="true" />
                <span>{chat.title}</span>
              </button>
            ))
          ) : (
            !chats.loading && <p>Your conversations will appear here.</p>
          )}
        </>
      )}
    </>
  );
}
