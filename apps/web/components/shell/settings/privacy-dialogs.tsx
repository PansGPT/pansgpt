"use client";
import { SettingsDetailView } from "./settings-detail-view";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
} from "react";
import { AlertCircle, Archive, LoaderCircle, RotateCw, Trash2, Undo2 } from "lucide-react";
import { Button, toast } from "@pansgpt/ui/shell";
import {
  listArchivedSessions,
  listDeletedSessions,
  removeChatAttachment,
  requestSession,
  restoreSession,
  type ChatSessionSummary,
} from "@/lib/chat-sessions";
import { listFeedbackHistory, listOwnedUploads } from "@/lib/settings";
import { formatBytes } from "@/lib/storage-management";
import type { DeletedChatSession, FeedbackTicket, OwnedAttachment } from "@pansgpt/types";
import { readOwnedUpload } from "@/lib/owned-upload";
import { OwnedImageView } from "./owned-image-view";
import Link from "next/link";
import { Download, Eye } from "lucide-react";

// ─── Reusable Error Row ────────────────────────────────────────────────────────

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="settings-inline-error" role="alert">
      <AlertCircle size={16} aria-hidden="true" />
      <span>{message}</span>
      <button type="button" className="settings-notice-retry" onClick={onRetry} aria-label="Retry">
        <RotateCw size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

function useMoreItems<T extends { id: string }>(
  fetchPage: (
    offset: number,
    signal: AbortSignal
  ) => Promise<{ items: T[]; next_offset: number | null }>,
  append: Dispatch<SetStateAction<T[]>>,
  fail: Dispatch<SetStateAction<string | null>>
) {
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  async function more() {
    if (nextOffset === null || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    try {
      const page = await fetchPage(nextOffset, controller.signal);
      if (controller.signal.aborted) return;
      append((old) => [
        ...old,
        ...page.items.filter((item) => !old.some((existing) => existing.id === item.id)),
      ]);
      setNextOffset(page.next_offset);
      fail(null);
    } catch {
      if (!controller.signal.aborted) fail("Couldn't load more. Please try again.");
    } finally {
      active.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return {
    setNextOffset,
    button:
      nextOffset !== null ? (
        <Button
          variant="secondary"
          leadingIcon={null}
          trailingIcon={null}
          disabled={busy}
          onClick={() => void more()}
        >
          {busy ? "Loading…" : "Load more"}
        </Button>
      ) : null,
  };
}

function LoadingSpinner({ label }: { label: string }) {
  return (
    <div
      style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}
      role="status"
      aria-label={label}
    >
      <LoaderCircle size={20} className="animate-spin" aria-hidden="true" />
    </div>
  );
}

// ─── 1. Privacy Info Dialog ──────────────────────────────────────────────────

export type PrivacyInfoType = "protection" | "use" | "policy";

export function PrivacyInfoDialog({
  type,
  open,
  onOpenChange,
}: {
  type: PrivacyInfoType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!type) return null;

  const content: Record<
    PrivacyInfoType,
    { title: string; description: string; sections: { heading: string; body: string }[] }
  > = {
    protection: {
      title: "How we protect your data",
      description: "Our security controls and provider boundaries.",
      sections: [
        {
          heading: "Backend AI routing",
          body: "All AI inferences, prompt generation, and document embeddings route strictly through our backend servers. Your browser or mobile app never connects directly to AI providers.",
        },
        {
          heading: "University multi-tenant isolation",
          body: "Your study records, course materials, and chat histories are isolated by your university ID and protected by database Row-Level Security (RLS).",
        },
        {
          heading: "Provider retention policy",
          body: "Google AI Studio operates under an approved retention exception where prompts and responses may be retained and reviewed by Google to improve services. Tavily public web search has a separate approved retention exception for public search queries. Uploaded files, full conversations and patient details are not approved search inputs. Other providers require their configured privacy eligibility checks; local Groq attestation does not certify a hosted deployment.",
        },
        {
          heading: "Encrypted file storage",
          body: "Private documents, slides, and chat attachments are stored in private Cloudflare R2 object storage with authentication and university scoping verified on every download.",
        },
      ],
    },
    use: {
      title: "How we use your data",
      description: "How your activity powers your study experience.",
      sections: [
        {
          heading: "Study chats & explanations",
          body: "Your prompts and active document excerpts are used to generate conversational pharmacy explanations, calculations, and practice questions.",
        },
        {
          heading: "Curriculum grounding",
          body: "Syllabi and course outlines provided by your university may supplement course-specific questions to ensure answers align with your curriculum.",
        },
        {
          heading: "30-day deletion recovery",
          body: "When you delete a conversation, it is moved to deleted chats and retained for 30 days so you can restore it if needed. After 30 days, it is permanently removed.",
        },
        {
          heading: "What we never do",
          body: "Public search queries must exclude private uploads, full conversations and patient details. Approved AI requests can include your question, selected conversation history and relevant material; the provider terms described above apply.",
        },
      ],
    },
    policy: {
      title: "Privacy policy summary",
      description: "Key points from the PansGPT privacy policy.",
      sections: [
        {
          heading: "Data collection",
          body: "PansGPT stores account details, device-session information, study records, uploads and submitted feedback to provide its features. Local PDF copies and previews are stored separately in your browser.",
        },
        {
          heading: "Data ownership",
          body: "You own your study notes and personal uploads. You can delete conversations or request account removal through our support channel.",
        },
        {
          heading: "Full policy",
          body: "For the complete terms and details on data processing, contact your university administrator or visit the full privacy documentation.",
        },
      ],
    },
  };

  const item = content[type];

  return (
    <SettingsDetailView
      open={open}
      onOpenChange={onOpenChange}
      title={item.title}
      description={<>{item.description}</>}
      maxWidth={520}
    >
      <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
        {item.sections.map((s) => (
          <div key={s.heading} style={{ fontSize: 13, lineHeight: 1.5 }}>
            <strong
              style={{
                display: "block",
                color: "var(--text-primary-900, inherit)",
                marginBottom: 2,
              }}
            >
              {s.heading}
            </strong>
            <span className="settings-muted-note" style={{ margin: 0 }}>
              {s.body}
            </span>
          </div>
        ))}
      </div>
    </SettingsDetailView>
  );
}

// ─── 2. Uploaded Files Dialog ────────────────────────────────────────────────

export function UploadedFilesDialog({
  open,
  onOpenChange,
  token,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string | undefined;
}) {
  const [uploads, setUploads] = useState<OwnedAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const alive = useRef(true);
  const [preview, setPreview] = useState<OwnedAttachment | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const downloadRequest = useRef<AbortController | null>(null);
  const urls = useRef(new Set<string>());
  useEffect(
    () => () => {
      downloadRequest.current?.abort();
      for (const url of urls.current) URL.revokeObjectURL(url);
      urls.current.clear();
    },
    []
  );
  async function downloadFile(file: OwnedAttachment): Promise<void> {
    if (downloadRequest.current || !file.session_id) return;
    const controller = new AbortController();
    downloadRequest.current = controller;
    setDownloadingId(file.id);
    try {
      const blob = await readOwnedUpload(
        token,
        { session_id: file.session_id, attachment_id: file.id },
        false,
        controller.signal
      );
      if (!alive.current || controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      urls.current.add(url);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.name;
      anchor.hidden = true;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        urls.current.delete(url);
      }, 1000);
    } catch {
      if (alive.current && !controller.signal.aborted)
        toast.error("Couldn't download this file. Please try again.");
    } finally {
      downloadRequest.current = null;
      if (alive.current) setDownloadingId(null);
    }
  }
  const { setNextOffset, button: loadMoreButton } = useMoreItems(
    async (offset, signal) => {
      const result = await listOwnedUploads(token, offset, signal);
      return { items: result.attachments, next_offset: result.next_offset };
    },
    setUploads,
    setError
  );

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listOwnedUploads(token, 0, new AbortController().signal);
      if (!alive.current) return;
      setUploads(res.attachments);
      setNextOffset(res.next_offset);
      setLoading(false);
    } catch {
      if (!alive.current) return;
      setError("Couldn't load your uploaded files. Please retry.");
      setLoading(false);
    }
  }, [token, setNextOffset]);

  useEffect(() => {
    alive.current = true;
    if (open && token) {
      const controller = new AbortController();
      void listOwnedUploads(token, 0, controller.signal)
        .then((res) => {
          if (!alive.current || controller.signal.aborted) return;
          setUploads(res.attachments);
          setNextOffset(res.next_offset);
          setLoading(false);
          setError(null);
        })
        .catch(() => {
          if (!alive.current || controller.signal.aborted) return;
          setError("Couldn't load your uploaded files. Please retry.");
          setLoading(false);
        });
      return () => {
        alive.current = false;
        controller.abort();
      };
    }
    return () => {
      alive.current = false;
    };
  }, [open, token, setNextOffset]);

  async function handleRemove(att: OwnedAttachment) {
    if (!token || !att.session_id || removingId) return;
    setRemovingId(att.id);
    try {
      await removeChatAttachment(token, att.session_id, att.id);
      if (!alive.current) return;
      setUploads((prev) => prev.filter((a) => a.id !== att.id));
      setNextOffset((old) => (old === null ? null : Math.max(0, old - 1)));
      toast.success("File removed.");
    } catch (err) {
      if (!alive.current) return;
      toast.error(err instanceof Error ? err.message : "Couldn't remove that file.");
    } finally {
      if (alive.current) setRemovingId(null);
    }
  }

  if (preview)
    return (
      <OwnedImageView
        file={preview}
        token={token}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      />
    );
  return (
    <SettingsDetailView
      open={open}
      onOpenChange={onOpenChange}
      title="Uploaded files"
      description={
        <>
          Files you have uploaded in chat. Files attached to sent messages cannot be deleted to
          preserve conversation integrity.
        </>
      }
      maxWidth={520}
    >
      {loading && <LoadingSpinner label="Loading uploaded files…" />}

      {error && <InlineError message={error} onRetry={() => void load()} />}

      {!loading && !error && uploads.length === 0 && (
        <p className="settings-muted-note" style={{ margin: "16px 0" }}>
          You have not uploaded any files yet.
        </p>
      )}

      {!loading && uploads.length > 0 && (
        <div
          style={{
            marginTop: 14,
            maxHeight: "var(--settings-detail-list-height, 260px)",
            overflowY: "auto",
            border: "1px solid var(--border-secondary)",
            borderRadius: 8,
          }}
        >
          {uploads.map((att) => (
            <div
              key={att.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "10px 12px",
                borderBottom: "1px solid var(--border-secondary)",
                fontSize: 13,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {att.name}
                </div>
                <div className="settings-muted-note" style={{ margin: "2px 0 0", fontSize: 11 }}>
                  {formatBytes(att.size)} • {new Date(att.created_at).toLocaleDateString()}
                </div>
              </div>

              {att.session_id && (
                <div className="settings-upload-actions">
                  {["image/png", "image/jpeg"].includes(att.content_type) && (
                    <button
                      type="button"
                      className="settings-upload-action"
                      aria-label={`Preview ${att.name}`}
                      disabled={downloadingId !== null}
                      onClick={() => setPreview(att)}
                    >
                      <Eye size={16} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="settings-upload-action"
                    aria-label={`Download ${att.name}`}
                    disabled={downloadingId !== null}
                    onClick={() => void downloadFile(att)}
                  >
                    {downloadingId === att.id ? (
                      <LoaderCircle className="animate-spin" size={16} />
                    ) : (
                      <Download size={16} />
                    )}
                  </button>
                </div>
              )}
              {att.in_use ? (
                <span
                  className="settings-muted-note"
                  style={{
                    fontSize: 11,
                    padding: "4px 8px",
                    background: "var(--bg-secondary)",
                    borderRadius: 6,
                  }}
                >
                  In use
                </span>
              ) : (
                <button
                  type="button"
                  disabled={removingId === att.id}
                  onClick={() => void handleRemove(att)}
                  className="settings-pdf-remove"
                  aria-label={`Remove ${att.name}`}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-error-primary-600, #dc2626)",
                    padding: 4,
                  }}
                >
                  {removingId === att.id ? (
                    <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 size={15} aria-hidden="true" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {loadMoreButton}
    </SettingsDetailView>
  );
}

// ─── 3. Feedback History Dialog ──────────────────────────────────────────────

export function FeedbackHistoryDialog({
  open,
  onOpenChange,
  token,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string | undefined;
}) {
  const [tickets, setTickets] = useState<FeedbackTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  const { setNextOffset, button: loadMoreButton } = useMoreItems(
    async (offset, signal) => {
      const result = await listFeedbackHistory(token, offset, signal);
      return { items: result.tickets, next_offset: result.next_offset };
    },
    setTickets,
    setError
  );

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listFeedbackHistory(token, 0, new AbortController().signal);
      if (!alive.current) return;
      setTickets(res.tickets);
      setNextOffset(res.next_offset);
      setLoading(false);
    } catch {
      if (!alive.current) return;
      setError("Couldn't load your feedback history. Please retry.");
      setLoading(false);
    }
  }, [token, setNextOffset]);

  useEffect(() => {
    alive.current = true;
    if (open && token) {
      const controller = new AbortController();
      void listFeedbackHistory(token, 0, controller.signal)
        .then((res) => {
          if (!alive.current || controller.signal.aborted) return;
          setTickets(res.tickets);
          setNextOffset(res.next_offset);
          setLoading(false);
          setError(null);
        })
        .catch(() => {
          if (!alive.current || controller.signal.aborted) return;
          setError("Couldn't load your feedback history. Please retry.");
          setLoading(false);
        });
      return () => {
        alive.current = false;
        controller.abort();
      };
    }
    return () => {
      alive.current = false;
    };
  }, [open, token, setNextOffset]);

  const statusColors: Record<FeedbackTicket["status"], { bg: string; color: string }> = {
    open: { bg: "#eff6ff", color: "#1d4ed8" },
    in_progress: { bg: "#fef3c7", color: "#b45309" },
    resolved: { bg: "#f0fdf4", color: "#15803d" },
    closed: { bg: "#f3f4f6", color: "#4b5563" },
  };

  return (
    <SettingsDetailView
      open={open}
      onOpenChange={onOpenChange}
      title="Your feedback history"
      description={
        <>
          Review tickets and suggestions you have submitted. Internal staff triage notes are not
          displayed.
        </>
      }
      maxWidth={520}
    >
      {loading && <LoadingSpinner label="Loading feedback history…" />}

      {error && <InlineError message={error} onRetry={() => void load()} />}

      {!loading && !error && tickets.length === 0 && (
        <p className="settings-muted-note" style={{ margin: "16px 0" }}>
          You haven&apos;t submitted any feedback yet.
        </p>
      )}

      {!loading && tickets.length > 0 && (
        <div
          style={{
            marginTop: 14,
            maxHeight: "var(--settings-detail-list-height, 280px)",
            overflowY: "auto",
            display: "grid",
            gap: 10,
          }}
        >
          {tickets.map((t) => {
            const badge = statusColors[t.status] ?? statusColors.open;
            return (
              <div
                key={t.id}
                style={{
                  padding: "10px 12px",
                  border: "1px solid var(--border-secondary)",
                  borderRadius: 8,
                  fontSize: 13,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{t.category}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      padding: "2px 8px",
                      borderRadius: 9999,
                      backgroundColor: badge.bg,
                      color: badge.color,
                    }}
                  >
                    {t.status.replace("_", " ")}
                  </span>
                </div>

                {t.first_message && (
                  <p
                    style={{
                      margin: "6px 0",
                      color: "var(--text-secondary-700, #374151)",
                      fontSize: 12,
                      lineHeight: 1.4,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {t.first_message}
                  </p>
                )}

                <div className="settings-muted-note" style={{ fontSize: 11, margin: "4px 0 0" }}>
                  Submitted {new Date(t.created_at).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {loadMoreButton}
    </SettingsDetailView>
  );
}

// ─── 4. Archived Chats Dialog ────────────────────────────────────────────────

export function ArchivedChatsDialog({
  open,
  onOpenChange,
  token,
  onNavigate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string | undefined;
  onNavigate?: () => void;
}) {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unarchivingId, setUnarchivingId] = useState<string | null>(null);
  const alive = useRef(true);
  const { setNextOffset, button: loadMoreButton } = useMoreItems(
    async (offset, signal) => {
      const items = await listArchivedSessions(token, signal, offset);
      return { items, next_offset: items.length === 100 ? offset + 100 : null };
    },
    setSessions,
    setError
  );

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listArchivedSessions(token, new AbortController().signal);
      if (!alive.current) return;
      setSessions(list);
      setNextOffset(list.length === 100 ? 100 : null);
      setLoading(false);
    } catch {
      if (!alive.current) return;
      setError("Couldn't load archived conversations. Please retry.");
      setLoading(false);
    }
  }, [token, setNextOffset]);

  useEffect(() => {
    alive.current = true;
    if (open && token) {
      const controller = new AbortController();
      void listArchivedSessions(token, controller.signal)
        .then((list) => {
          if (!alive.current || controller.signal.aborted) return;
          setSessions(list);
          setNextOffset(list.length === 100 ? 100 : null);
          setLoading(false);
          setError(null);
        })
        .catch(() => {
          if (!alive.current || controller.signal.aborted) return;
          setError("Couldn't load archived conversations. Please retry.");
          setLoading(false);
        });
      return () => {
        alive.current = false;
        controller.abort();
      };
    }
    return () => {
      alive.current = false;
    };
  }, [open, token, setNextOffset]);

  async function handleUnarchive(id: string) {
    if (!token || unarchivingId) return;
    setUnarchivingId(id);
    try {
      await requestSession(token, id, { archived: false });
      if (!alive.current) return;
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setNextOffset((old) => (old === null ? null : Math.max(0, old - 1)));
      toast.success("Conversation unarchived.");
      window.dispatchEvent(
        new CustomEvent("pansgpt-chat-updated", { detail: { id, patch: { archived_at: null } } })
      );
    } catch (err) {
      if (!alive.current) return;
      toast.error(err instanceof Error ? err.message : "Couldn't unarchive this chat.");
    } finally {
      if (alive.current) setUnarchivingId(null);
    }
  }

  return (
    <SettingsDetailView
      open={open}
      onOpenChange={onOpenChange}
      title="Archived conversations"
      icon={<Archive size={24} className="settings-confirm-icon" />}
      description={
        <>
          These conversations are stored away from your active chat list. You can restore them to
          your active chats at any time.
        </>
      }
      maxWidth={500}
    >
      {loading && <LoadingSpinner label="Loading archived chats…" />}

      {error && <InlineError message={error} onRetry={() => void load()} />}

      {!loading && !error && sessions.length === 0 && (
        <p className="settings-muted-note" style={{ margin: "16px 0" }}>
          No archived conversations.
        </p>
      )}

      {!loading && sessions.length > 0 && (
        <div
          style={{
            marginTop: 14,
            maxHeight: "var(--settings-detail-list-height, 260px)",
            overflowY: "auto",
            border: "1px solid var(--border-secondary)",
            borderRadius: 8,
          }}
        >
          {sessions.map((s) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "10px 12px",
                borderBottom: "1px solid var(--border-secondary)",
                fontSize: 13,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {s.title || "Untitled chat"}
                </div>
                {s.document_id && (
                  <div className="settings-muted-note" style={{ margin: "2px 0 0", fontSize: 11 }}>
                    Document study session
                  </div>
                )}
              </div>

              <Link
                className="settings-conversation-open"
                href={
                  s.document_id
                    ? `/app/library/${encodeURIComponent(s.document_id)}/read?session=${encodeURIComponent(s.id)}`
                    : `/app/chat?session=${encodeURIComponent(s.id)}`
                }
                onClick={() => {
                  onOpenChange(false);
                  onNavigate?.();
                }}
              >
                Open
              </Link>
              <button
                type="button"
                disabled={unarchivingId === s.id}
                onClick={() => void handleUnarchive(s.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--fg-brand-primary-600)",
                  fontSize: 13,
                  cursor: "pointer",
                  padding: "4px 8px",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {unarchivingId === s.id ? (
                  <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Undo2 size={14} aria-hidden="true" />
                )}
                <span>Unarchive</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {loadMoreButton}
    </SettingsDetailView>
  );
}

// ─── 5. Deleted Chats Dialog ─────────────────────────────────────────────────

export function DeletedChatsDialog({
  open,
  onOpenChange,
  token,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string | undefined;
}) {
  const [sessions, setSessions] = useState<DeletedChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const alive = useRef(true);
  const { setNextOffset, button: loadMoreButton } = useMoreItems(
    async (offset, signal) => {
      const result = await listDeletedSessions(token, offset, signal);
      return { items: result.sessions, next_offset: result.next_offset };
    },
    setSessions,
    setError
  );

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listDeletedSessions(token, 0, new AbortController().signal);
      if (!alive.current) return;
      setSessions(res.sessions);
      setNextOffset(res.next_offset);
      setLoading(false);
    } catch {
      if (!alive.current) return;
      setError("Couldn't load deleted conversations. Please retry.");
      setLoading(false);
    }
  }, [token, setNextOffset]);

  useEffect(() => {
    alive.current = true;
    if (open && token) {
      const controller = new AbortController();
      void listDeletedSessions(token, 0, controller.signal)
        .then((res) => {
          if (!alive.current || controller.signal.aborted) return;
          setSessions(res.sessions);
          setNextOffset(res.next_offset);
          setLoading(false);
          setError(null);
        })
        .catch(() => {
          if (!alive.current || controller.signal.aborted) return;
          setError("Couldn't load deleted conversations. Please retry.");
          setLoading(false);
        });
      return () => {
        alive.current = false;
        controller.abort();
      };
    }
    return () => {
      alive.current = false;
    };
  }, [open, token, setNextOffset]);

  async function handleRestore(id: string) {
    if (!token || restoringId) return;
    setRestoringId(id);
    try {
      await restoreSession(token, id, new AbortController().signal);
      if (!alive.current) return;
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success("Conversation restored.");
      setNextOffset((old) => (old === null ? null : Math.max(0, old - 1)));
      window.dispatchEvent(
        new CustomEvent("pansgpt-chat-updated", { detail: { id, patch: { deleted_at: null } } })
      );
    } catch (err) {
      if (!alive.current) return;
      toast.error(err instanceof Error ? err.message : "Couldn't restore this chat.");
    } finally {
      if (alive.current) setRestoringId(null);
    }
  }

  function getDaysRemaining(deletedAtStr: string): number {
    const deletedTime = new Date(deletedAtStr).getTime();
    const elapsedMs = now - deletedTime;
    const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - elapsedDays);
  }

  return (
    <SettingsDetailView
      open={open}
      onOpenChange={onOpenChange}
      title="Deleted conversations"
      icon={<Trash2 size={24} className="settings-confirm-icon" />}
      description={
        <>
          Conversations can be restored within 30 days of deletion. After 30 days, they are
          permanently removed.
        </>
      }
      maxWidth={500}
    >
      {loading && <LoadingSpinner label="Loading deleted chats…" />}

      {error && <InlineError message={error} onRetry={() => void load()} />}

      {!loading && !error && sessions.length === 0 && (
        <p className="settings-muted-note" style={{ margin: "16px 0" }}>
          No deleted conversations in the 30-day recovery window.
        </p>
      )}

      {!loading && sessions.length > 0 && (
        <div
          style={{
            marginTop: 14,
            maxHeight: "var(--settings-detail-list-height, 260px)",
            overflowY: "auto",
            border: "1px solid var(--border-secondary)",
            borderRadius: 8,
          }}
        >
          {sessions.map((s) => {
            const daysLeft = getDaysRemaining(s.deleted_at);
            return (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 12px",
                  borderBottom: "1px solid var(--border-secondary)",
                  fontSize: 13,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {s.title || "Untitled chat"}
                  </div>
                  <div className="settings-muted-note" style={{ margin: "2px 0 0", fontSize: 11 }}>
                    {daysLeft === 0
                      ? "Expires today"
                      : `Expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}
                    {s.document_id && " • Document study session"}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={restoringId === s.id}
                  onClick={() => void handleRestore(s.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--fg-brand-primary-600)",
                    fontSize: 13,
                    cursor: "pointer",
                    padding: "4px 8px",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {restoringId === s.id ? (
                    <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Undo2 size={14} aria-hidden="true" />
                  )}
                  <span>Restore</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {loadMoreButton}
    </SettingsDetailView>
  );
}
