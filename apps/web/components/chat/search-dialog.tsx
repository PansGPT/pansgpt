"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import type { ChatSearchResult } from "@pansgpt/types";
import { useAuth } from "@/lib/auth-context";
import { searchConversations } from "@/lib/chat-sessions";
import { searchPreviewText } from "@/lib/search-preview";
import { useRecentChats } from "@/components/shell/dashboard-data";
import { ConversationDialog } from "./dialog";

function Highlight({ text, query }: { text: string; query: string }): React.ReactElement {
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  return index < 0 ? (
    <>{text}</>
  ) : (
    <>
      {text.slice(0, index)}
      <mark>{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}
export function ConversationSearch({
  open,
  onOpenChange,
  onCloseAutoFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus: (event: Event) => void;
}): React.ReactElement {
  const { session, profile } = useAuth();
  const recent = useRecentChats();
  const [query, setQuery] = useState("");
  const [archived, setArchived] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [offset, setOffset] = useState(0);
  const owner = `${profile?.id}:${profile?.university_id}`;
  const key = `${owner}:${query.trim()}:${archived}:${attempt}`;
  const [page, setPage] = useState<{
    key: string;
    results: ChatSearchResult[];
    next: number | null;
    error?: string;
  }>();
  const [loading, setLoading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const choosing = useRef(false);
  useEffect(() => {
    if (!open || query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      void searchConversations(
        session?.access_token,
        query.trim(),
        archived,
        offset,
        controller.signal
      )
        .then((result) => {
          if (!controller.signal.aborted)
            setPage((previous) => ({
              key,
              results:
                offset && previous?.key === key
                  ? Array.from(
                      new Map(
                        [...previous.results, ...result.results].map(
                          (item) => [item.session_id, item] as const
                        )
                      ).values()
                    )
                  : result.results,
              next: result.next_offset,
            }));
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted)
            setPage({
              key,
              results: [],
              next: null,
              error: error instanceof Error ? error.message : "Search failed. Please retry.",
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
  }, [open, key, query, archived, offset, session?.access_token]);
  const current = page?.key === key ? page : undefined;
  const results = current?.results ?? [];
  const searching = query.trim().length >= 2;
  const recentChats = [...recent.chats]
    .filter((chat) => !chat.archived_at)
    .sort((a, b) => (b.last_message_at || "").localeCompare(a.last_message_at || ""))
    .slice(0, 8);
  function choose(): void {
    choosing.current = true;
    onOpenChange(false);
  }
  return (
    <ConversationDialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setQuery("");
          setOffset(0);
        }
        onOpenChange(next);
      }}
      title="Search conversations"
      description="Find a conversation by its title or something you discussed."
      className="study-chat-search-dialog"
      minimalHeader
      onCloseAutoFocus={(event) => {
        if (choosing.current) {
          event.preventDefault();
          choosing.current = false;
        } else onCloseAutoFocus(event);
      }}
    >
      <div
        className="study-chat-search"
        onKeyDown={(event) => {
          if (
            event.key !== "ArrowDown" &&
            event.key !== "ArrowUp" &&
            !(event.key === "Enter" && event.target === input.current)
          )
            return;
          const links = Array.from(
            list.current?.querySelectorAll<HTMLAnchorElement>("a[data-search-result]") ?? []
          );
          if (!links.length) return;
          event.preventDefault();
          if (event.key === "Enter") {
            links[0]?.click();
            return;
          }
          const index = links.indexOf(document.activeElement as HTMLAnchorElement);
          links[
            index < 0
              ? event.key === "ArrowDown"
                ? 0
                : links.length - 1
              : (index + (event.key === "ArrowDown" ? 1 : -1) + links.length) % links.length
          ]?.focus();
        }}
      >
        <label className="study-chat-search-input">
          <input
            ref={input}
            aria-label="Search conversations"
            placeholder="Search…"
            value={query}
            maxLength={200}
            onChange={(event) => {
              setQuery(event.target.value);
              setOffset(0);
            }}
          />
        </label>
        {!!query && (
          <button
            className="study-chat-search-clear"
            onClick={() => {
              setQuery("");
              setOffset(0);
              input.current?.focus();
            }}
          >
            Clear
          </button>
        )}
        {searching ? (
          <div className="study-chat-search-filters" role="group" aria-label="Search scope">
            {[
              { label: "All", includesArchived: true, hint: "All chats, including archived" },
              { label: "Chats", includesArchived: false, hint: "Active chats only" },
            ].map(({ label, includesArchived, hint }) => (
              <button
                key={label}
                aria-pressed={archived === includesArchived}
                title={hint}
                onClick={() => {
                  setArchived(includesArchived);
                  setOffset(0);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <h3 className="study-chat-search-heading">Recent chats</h3>
        )}
        <div ref={list} className="study-chat-search-results" aria-busy={searching && loading}>
          {!searching ? (
            query.trim() ? (
              <p>Type at least two characters to search your history.</p>
            ) : recent.loading ? (
              <p role="status">Loading recent chats…</p>
            ) : recent.error ? (
              <p role="status">Recent chats are unavailable. You can still search your history.</p>
            ) : !recentChats.length ? (
              <p>No recent conversations yet.</p>
            ) : (
              recentChats.map((chat) => (
                <Link
                  data-search-result
                  className="study-chat-search-recent"
                  key={chat.id}
                  href={`/app/chat?session=${chat.id}`}
                  onClick={choose}
                >
                  <MessageCircle size={18} aria-hidden="true" />
                  <span>
                    <strong>{searchPreviewText(chat.title || "New chat")}</strong>
                  </span>
                </Link>
              ))
            )
          ) : current?.error ? (
            <div role="alert">
              <p>{current.error}</p>
              <button
                onClick={() => {
                  setOffset(0);
                  setAttempt((n) => n + 1);
                }}
              >
                Try again
              </button>
            </div>
          ) : !current || (loading && !results.length) ? (
            <p role="status">Searching conversations…</p>
          ) : !results.length ? (
            <p role="status">No matching conversations.</p>
          ) : (
            results.map((result) => (
              <Link
                data-search-result
                key={result.session_id}
                href={`/app/chat?session=${result.session_id}${result.message_id ? `&message=${result.message_id}` : ""}`}
                onClick={choose}
              >
                <MessageCircle size={18} aria-hidden="true" />
                <span>
                  <strong>
                    <Highlight text={searchPreviewText(result.title)} query={query.trim()} />
                  </strong>
                  <small>
                    <Highlight text={searchPreviewText(result.snippet)} query={query.trim()} />
                  </small>
                  {result.is_archived && <em>Archived</em>}
                </span>
                {result.last_message_at && !Number.isNaN(Date.parse(result.last_message_at)) && (
                  <time dateTime={result.last_message_at}>
                    {new Date(result.last_message_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                )}
              </Link>
            ))
          )}
        </div>
        {searching && current?.next != null && (
          <button disabled={loading} onClick={() => setOffset(current.next!)}>
            {loading ? "Loading…" : "Load more results"}
          </button>
        )}
      </div>
    </ConversationDialog>
  );
}
