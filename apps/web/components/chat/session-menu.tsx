"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArchiveRestore,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  Slideout,
} from "@pansgpt/ui/shell";
import type { ChatSessionUpdateRequest } from "@pansgpt/types";
import { useAuth } from "@/lib/auth-context";
import { useDashboard } from "@/components/shell/dashboard-data";
import {
  listArchivedSessions,
  listDeletedSessions,
  restoreSession,
  requestSession,
  type ChatSessionSummary,
} from "@/lib/chat-sessions";
import { ConversationDialog } from "./dialog";
import { ArchiveIcon } from "./archive-icon";
import { offerConversationUndo } from "./undo-notice";

export function ChatSessionMenu({
  chat,
  titleTrigger = false,
  disabled = false,
  onChanged,
}: {
  chat: ChatSessionSummary;
  titleTrigger?: boolean;
  disabled?: boolean;
  onChanged?: (chat: ChatSessionSummary | null) => void;
}): React.ReactElement {
  const { session, profile } = useAuth();
  const { reload } = useDashboard();
  const trigger = useRef<HTMLButtonElement>(null);
  const request = useRef<AbortController | null>(null);
  const transferring = useRef(false);
  const frame = useRef<number | null>(null);
  const [panel, setPanel] = useState<"rename" | "delete" | null>(null);
  const [name, setName] = useState(chat.title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(
    () => () => {
      request.current?.abort();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [profile?.id, profile?.university_id]
  );
  function openPanel(next: "rename" | "delete"): void {
    transferring.current = true;
    setName(chat.title);
    setError(null);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      setPanel(next);
    });
  }
  async function apply(change: ChatSessionUpdateRequest | "delete"): Promise<void> {
    if (busy) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError(null);
    try {
      const saved = await requestSession(session?.access_token, chat.id, change, controller.signal);
      if (controller.signal.aborted) return;
      if (saved && saved.user_id !== profile?.id)
        throw new Error("Conversation ownership mismatch.");
      onChanged?.(saved);
      setPanel(null);
      if (change === "delete" || change.archived === true) {
        offerConversationUndo({
          id: chat.id,
          title: chat.title,
          operation: change === "delete" ? "delete" : "archive",
          owner: `${profile?.id}:${profile?.university_id}`,
          wasCurrent: new URLSearchParams(window.location.search).get("session") === chat.id,
        });
        window.dispatchEvent(new CustomEvent("pansgpt-chat-removed", { detail: { id: chat.id } }));
      }
      reload();
    } catch (failure: unknown) {
      if (!controller.signal.aborted)
        setError(
          failure instanceof Error ? failure.message : "This change was not saved. Please retry."
        );
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <>
      <Dropdown
        onOpenChange={(open) => {
          if (open) transferring.current = false;
        }}
      >
        <DropdownTrigger asChild>
          <button
            ref={trigger}
            type="button"
            className={titleTrigger ? "study-chat-title-menu" : "shell-chat-menu"}
            title={
              disabled && !titleTrigger
                ? "Sample conversation. Start your own chat to use these controls."
                : undefined
            }
            disabled={disabled || busy}
            aria-label={titleTrigger ? "Conversation options" : `Options for ${chat.title}`}
          >
            {titleTrigger ? (
              <>
                <span>{chat.title || "New chat"}</span>
                <ChevronDown size={16} aria-hidden="true" />
              </>
            ) : (
              <MoreHorizontal size={17} aria-hidden="true" />
            )}
          </button>
        </DropdownTrigger>
        <DropdownContent
          aria-label="Conversation actions"
          className="study-chat-session-menu"
          align={titleTrigger ? "start" : "end"}
          onCloseAutoFocus={(event) => {
            if (transferring.current) event.preventDefault();
          }}
        >
          <DropdownItem
            disabled={busy}
            icon={chat.is_pinned ? <PinOff size={16} /> : <Pin size={16} />}
            onSelect={() => {
              void apply({ is_pinned: !chat.is_pinned });
            }}
          >
            {chat.is_pinned ? "Unpin" : "Pin"}
          </DropdownItem>
          <DropdownItem
            disabled={busy}
            icon={<Pencil size={16} />}
            onSelect={() => openPanel("rename")}
          >
            Rename
          </DropdownItem>
          <DropdownItem
            disabled={busy}
            icon={chat.archived_at ? <ArchiveRestore size={16} /> : <ArchiveIcon />}
            onSelect={() => {
              void apply({ archived: !chat.archived_at });
            }}
          >
            {chat.archived_at ? "Restore" : "Archive"}
          </DropdownItem>
          <div role="separator" className="study-chat-menu-separator" />
          <DropdownItem
            disabled={busy}
            icon={<Trash2 size={16} />}
            className="study-chat-destructive"
            onSelect={() => openPanel("delete")}
          >
            Delete
          </DropdownItem>
        </DropdownContent>
      </Dropdown>
      {!panel && error && (
        <span role="alert" className="shell-session-error">
          {error}
        </span>
      )}
      <ConversationDialog
        open={panel !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setPanel(null);
        }}
        title={panel === "rename" ? "Rename chat" : "Delete chat"}
        description={chat.title}
        blocked={busy}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (trigger.current?.isConnected) trigger.current.focus();
          else document.querySelector<HTMLElement>("main")?.focus();
        }}
      >
        <form
          className="study-chat-session-form"
          onSubmit={(event) => {
            event.preventDefault();
            void apply(panel === "rename" ? { title: name.trim() } : "delete");
          }}
        >
          {panel === "rename" ? (
            <label>
              Chat name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                required
                disabled={busy}
                onFocus={(event) => event.currentTarget.select()}
              />
            </label>
          ) : (
            <p>
              This conversation will be removed from your history and search results. You can
              restore it for 30 days: archive icon beside Recent chats → Deleted → Restore.
            </p>
          )}
          {error && <p role="alert">{error}</p>}
          <div>
            <button type="button" disabled={busy} onClick={() => setPanel(null)}>
              Cancel
            </button>
            <button
              className={panel === "delete" ? "study-chat-destructive" : undefined}
              disabled={busy || (panel === "rename" && !name.trim())}
              type="submit"
            >
              {busy ? "Saving…" : panel === "rename" ? "Save name" : "Delete conversation"}
            </button>
          </div>
        </form>
      </ConversationDialog>
    </>
  );
}

export function ArchivedChats({ onNavigate }: { onNavigate?: () => void }): React.ReactElement {
  const opener = useRef<HTMLButtonElement>(null);
  const [rowOwner, setRowOwner] = useState<string | null>(null);
  const { session, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [rows, setRows] = useState<ChatSessionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"archived" | "trash">("archived");
  const [offset, setOffset] = useState(0);
  const [next, setNext] = useState<number | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const mutation = useRef<AbortController | null>(null);
  const { reload } = useDashboard();
  const owner = `${profile?.id}:${profile?.university_id}:${mode}`;
  useEffect(() => () => mutation.current?.abort(), [profile?.id, profile?.university_id]);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const load =
      mode === "trash"
        ? listDeletedSessions(session?.access_token, offset, controller.signal).then((result) => ({
            rows: result.sessions,
            next: result.next_offset,
          }))
        : listArchivedSessions(session?.access_token, controller.signal).then((result) => ({
            rows: result,
            next: null,
          }));
    void load
      .then((result) => {
        if (!controller.signal.aborted) {
          setRows((previous) => (offset ? [...(previous ?? []), ...result.rows] : result.rows));
          setNext(result.next);
          setRowOwner(owner);
          setError(null);
        }
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error ? failure.message : "Archived chats could not be loaded."
          );
      });
    return () => controller.abort();
  }, [open, attempt, session?.access_token, owner, mode, offset]);
  return (
    <>
      <button
        type="button"
        ref={opener}
        aria-label="Show archived chats"
        title="Archived and deleted chats"
        onClick={() => {
          setRows(null);
          setError(null);
          setOffset(0);
          setOpen(true);
        }}
      >
        <ArchiveIcon />
      </button>
      <Slideout
        open={open}
        onOpenChange={setOpen}
        title={mode === "trash" ? "Deleted chats" : "Archived chats"}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          opener.current?.focus();
        }}
        description={
          mode === "trash"
            ? "Deleted conversations can be restored for 30 days, then are permanently removed."
            : "Restore a conversation or open it to continue studying."
        }
      >
        <div className="study-chat-library-tabs" role="tablist" aria-label="Conversation library">
          {(["archived", "trash"] as const).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={mode === tab}
              onClick={() => {
                setMode(tab);
                setOffset(0);
                setRows(null);
                setError(null);
              }}
            >
              {tab === "trash" ? "Deleted" : "Archived"}
            </button>
          ))}
        </div>
        <div className="study-chat-archived-list">
          {error ? (
            <>
              <p role="alert">{error}</p>
              <button onClick={() => setAttempt((value) => value + 1)}>Try again</button>
            </>
          ) : rows === null || rowOwner !== owner ? (
            <p role="status">
              {mode === "trash" ? "Loading deleted chats…" : "Loading archived chats…"}
            </p>
          ) : !rows.length ? (
            <p>{mode === "trash" ? "No deleted conversations." : "No archived conversations."}</p>
          ) : (
            rows.map((chat) => (
              <div key={chat.id}>
                {mode === "trash" ? (
                  <span>{chat.title}</span>
                ) : (
                  <Link
                    href={`/app/chat?session=${chat.id}`}
                    onClick={() => {
                      setOpen(false);
                      onNavigate?.();
                    }}
                  >
                    {chat.title}
                  </Link>
                )}
                {mode === "trash" ? (
                  <button
                    disabled={restoring !== null}
                    aria-label={`Restore ${chat.title}`}
                    onClick={() => {
                      const controller = new AbortController();
                      mutation.current = controller;
                      setRestoring(chat.id);
                      setError(null);
                      void restoreSession(session?.access_token, chat.id, controller.signal)
                        .then(() => {
                          if (controller.signal.aborted) return;
                          setOffset(0);
                          setAttempt((n) => n + 1);
                          reload();
                        })
                        .catch((failure: unknown) => {
                          if (!controller.signal.aborted)
                            setError(
                              failure instanceof Error ? failure.message : "Restore failed."
                            );
                        })
                        .finally(() => {
                          if (!controller.signal.aborted) setRestoring(null);
                        });
                    }}
                  >
                    {restoring === chat.id ? "Restoring…" : "Restore"}
                  </button>
                ) : (
                  <ChatSessionMenu chat={chat} onChanged={() => setAttempt((value) => value + 1)} />
                )}
              </div>
            ))
          )}
        </div>
        {mode === "trash" && next !== null && (
          <button onClick={() => setOffset(next)}>Load more deleted chats</button>
        )}
      </Slideout>
    </>
  );
}
