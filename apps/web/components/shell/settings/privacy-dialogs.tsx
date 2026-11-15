"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AlertCircle, Archive, LoaderCircle, RotateCw, Trash2, Undo2 } from "lucide-react";
import { DialogPrimitive, Button, toast } from "@pansgpt/ui/shell";
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
import type { FeedbackTicket, OwnedAttachment } from "@pansgpt/types";

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
          body: "Google AI Studio operates under an approved retention exception where prompts and responses may be retained and reviewed by Google to improve services. Groq operates under local Zero Data Retention where configured. Other external providers without verified ZDR are blocked.",
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
          body: "We do not sell your personal data, and we do not provide full student conversations or patient details to search engines or public training models.",
        },
      ],
    },
    policy: {
      title: "Privacy policy summary",
      description: "Key points from the PansGPT privacy policy.",
      sections: [
        {
          heading: "Data collection",
          body: "We collect only the account information needed for authentication (email, name, academic level) and your study materials (notes, saved chats, and quiz attempts).",
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
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="settings-confirm-overlay" />
        <DialogPrimitive.Content
          className="settings-confirm-dialog"
          aria-describedby="privacy-info-desc"
          style={{ maxWidth: 520, width: "92vw" }}
        >
          <DialogPrimitive.Title className="settings-confirm-title">
            {item.title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description
            id="privacy-info-desc"
            className="settings-confirm-description"
          >
            {item.description}
          </DialogPrimitive.Description>

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

          <div className="settings-confirm-actions" style={{ marginTop: 20 }}>
            <Button
              variant="secondary"
              leadingIcon={null}
              trailingIcon={null}
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
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

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listOwnedUploads(token, 0, new AbortController().signal);
      if (!alive.current) return;
      setUploads(res.attachments);
      setLoading(false);
    } catch {
      if (!alive.current) return;
      setError("Couldn't load your uploaded files. Please retry.");
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    alive.current = true;
    if (open && token) {
      const controller = new AbortController();
      void listOwnedUploads(token, 0, controller.signal)
        .then((res) => {
          if (!alive.current) return;
          setUploads(res.attachments);
          setLoading(false);
          setError(null);
        })
        .catch(() => {
          if (!alive.current) return;
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
  }, [open, token]);

  async function handleRemove(att: OwnedAttachment) {
    if (!token || !att.session_id || removingId) return;
    setRemovingId(att.id);
    try {
      await removeChatAttachment(token, att.session_id, att.id);
      if (!alive.current) return;
      setUploads((prev) => prev.filter((a) => a.id !== att.id));
      toast.success("File removed.");
    } catch (err) {
      if (!alive.current) return;
      toast.error(err instanceof Error ? err.message : "Couldn't remove that file.");
    } finally {
      if (alive.current) setRemovingId(null);
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="settings-confirm-overlay" />
        <DialogPrimitive.Content
          className="settings-confirm-dialog"
          aria-describedby="uploaded-files-desc"
          style={{ maxWidth: 520, width: "92vw" }}
        >
          <DialogPrimitive.Title className="settings-confirm-title">
            Uploaded files
          </DialogPrimitive.Title>
          <DialogPrimitive.Description
            id="uploaded-files-desc"
            className="settings-confirm-description"
          >
            Files you have uploaded in chat. Files attached to sent messages cannot be deleted to
            preserve conversation integrity.
          </DialogPrimitive.Description>

          {loading && <LoadingSpinner label="Loading uploaded files…" />}

          {error && <InlineError message={error} onRetry={() => void load()} />}

          {!loading && !error && uploads.length === 0 && (
            <p className="settings-muted-note" style={{ margin: "16px 0" }}>
              You have not uploaded any files yet.
            </p>
          )}

          {!loading && !error && uploads.length > 0 && (
            <div
              style={{
                marginTop: 14,
                maxHeight: 260,
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
                    <div
                      className="settings-muted-note"
                      style={{ margin: "2px 0 0", fontSize: 11 }}
                    >
                      {formatBytes(att.size)} • {new Date(att.created_at).toLocaleDateString()}
                      {att.in_use && " • In use in chat"}
                    </div>
                  </div>

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

          <div className="settings-confirm-actions" style={{ marginTop: 18 }}>
            <Button
              variant="secondary"
              leadingIcon={null}
              trailingIcon={null}
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
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

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listFeedbackHistory(token, 0, new AbortController().signal);
      if (!alive.current) return;
      setTickets(res.tickets);
      setLoading(false);
    } catch {
      if (!alive.current) return;
      setError("Couldn't load your feedback history. Please retry.");
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    alive.current = true;
    if (open && token) {
      const controller = new AbortController();
      void listFeedbackHistory(token, 0, controller.signal)
        .then((res) => {
          if (!alive.current) return;
          setTickets(res.tickets);
          setLoading(false);
          setError(null);
        })
        .catch(() => {
          if (!alive.current) return;
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
  }, [open, token]);

  const statusColors: Record<FeedbackTicket["status"], { bg: string; color: string }> = {
    open: { bg: "#eff6ff", color: "#1d4ed8" },
    in_progress: { bg: "#fef3c7", color: "#b45309" },
    resolved: { bg: "#f0fdf4", color: "#15803d" },
    closed: { bg: "#f3f4f6", color: "#4b5563" },
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="settings-confirm-overlay" />
        <DialogPrimitive.Content
          className="settings-confirm-dialog"
          aria-describedby="feedback-history-desc"
          style={{ maxWidth: 520, width: "92vw" }}
        >
          <DialogPrimitive.Title className="settings-confirm-title">
            Your feedback history
          </DialogPrimitive.Title>
          <DialogPrimitive.Description
            id="feedback-history-desc"
            className="settings-confirm-description"
          >
            Review tickets and suggestions you have submitted. Internal staff triage notes are not
            displayed.
          </DialogPrimitive.Description>

          {loading && <LoadingSpinner label="Loading feedback history…" />}

          {error && <InlineError message={error} onRetry={() => void load()} />}

          {!loading && !error && tickets.length === 0 && (
            <p className="settings-muted-note" style={{ margin: "16px 0" }}>
              You haven&apos;t submitted any feedback yet.
            </p>
          )}

          {!loading && !error && tickets.length > 0 && (
            <div
              style={{
                marginTop: 14,
                maxHeight: 280,
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
                      <span style={{ fontWeight: 600, textTransform: "capitalize" }}>
                        {t.category}
                      </span>
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

                    <div
                      className="settings-muted-note"
                      style={{ fontSize: 11, margin: "4px 0 0" }}
                    >
                      Submitted {new Date(t.created_at).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="settings-confirm-actions" style={{ marginTop: 18 }}>
            <Button
              variant="secondary"
              leadingIcon={null}
              trailingIcon={null}
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ─── 4. Archived Chats Dialog ────────────────────────────────────────────────

export function ArchivedChatsDialog({
  open,
  onOpenChange,
  token,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string | undefined;
}) {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unarchivingId, setUnarchivingId] = useState<string | null>(null);
  const alive = useRef(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listArchivedSessions(token, new AbortController().signal);
      if (!alive.current) return;
      setSessions(list);
      setLoading(false);
    } catch {
      if (!alive.current) return;
      setError("Couldn't load archived conversations. Please retry.");
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    alive.current = true;
    if (open && token) {
      const controller = new AbortController();
      void listArchivedSessions(token, controller.signal)
        .then((list) => {
          if (!alive.current) return;
          setSessions(list);
          setLoading(false);
          setError(null);
        })
        .catch(() => {
          if (!alive.current) return;
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
  }, [open, token]);

  async function handleUnarchive(id: string) {
    if (!token || unarchivingId) return;
    setUnarchivingId(id);
    try {
      await requestSession(token, id, { archived: false });
      if (!alive.current) return;
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success("Conversation unarchived.");
    } catch (err) {
      if (!alive.current) return;
      toast.error(err instanceof Error ? err.message : "Couldn't unarchive this chat.");
    } finally {
      if (alive.current) setUnarchivingId(null);
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="settings-confirm-overlay" />
        <DialogPrimitive.Content
          className="settings-confirm-dialog"
          aria-describedby="archived-chats-desc"
          style={{ maxWidth: 500, width: "92vw" }}
        >
          <div className="settings-confirm-icon-wrap" aria-hidden="true">
            <Archive size={24} className="settings-confirm-icon" />
          </div>
          <DialogPrimitive.Title className="settings-confirm-title">
            Archived conversations
          </DialogPrimitive.Title>
          <DialogPrimitive.Description
            id="archived-chats-desc"
            className="settings-confirm-description"
          >
            These conversations are stored away from your active chat list. You can restore them to
            your active chats at any time.
          </DialogPrimitive.Description>

          {loading && <LoadingSpinner label="Loading archived chats…" />}

          {error && <InlineError message={error} onRetry={() => void load()} />}

          {!loading && !error && sessions.length === 0 && (
            <p className="settings-muted-note" style={{ margin: "16px 0" }}>
              No archived conversations.
            </p>
          )}

          {!loading && !error && sessions.length > 0 && (
            <div
              style={{
                marginTop: 14,
                maxHeight: 260,
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
                      <div
                        className="settings-muted-note"
                        style={{ margin: "2px 0 0", fontSize: 11 }}
                      >
                        Document study session
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={unarchivingId === s.id}
                    onClick={() => void handleUnarchive(s.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--brand-primary, #0284c7)",
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

          <div className="settings-confirm-actions" style={{ marginTop: 18 }}>
            <Button
              variant="secondary"
              leadingIcon={null}
              trailingIcon={null}
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
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
  const [sessions, setSessions] = useState<
    { id: string; title: string; deleted_at: string; document_id?: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const alive = useRef(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listDeletedSessions(token, 0, new AbortController().signal);
      if (!alive.current) return;
      setSessions(res.sessions);
      setLoading(false);
    } catch {
      if (!alive.current) return;
      setError("Couldn't load deleted conversations. Please retry.");
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    alive.current = true;
    if (open && token) {
      const controller = new AbortController();
      void listDeletedSessions(token, 0, controller.signal)
        .then((res) => {
          if (!alive.current) return;
          setSessions(res.sessions);
          setLoading(false);
          setError(null);
        })
        .catch(() => {
          if (!alive.current) return;
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
  }, [open, token]);

  async function handleRestore(id: string) {
    if (!token || restoringId) return;
    setRestoringId(id);
    try {
      await restoreSession(token, id, new AbortController().signal);
      if (!alive.current) return;
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success("Conversation restored.");
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
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="settings-confirm-overlay" />
        <DialogPrimitive.Content
          className="settings-confirm-dialog"
          aria-describedby="deleted-chats-desc"
          style={{ maxWidth: 500, width: "92vw" }}
        >
          <div className="settings-confirm-icon-wrap" aria-hidden="true">
            <Trash2 size={24} className="settings-confirm-icon" />
          </div>
          <DialogPrimitive.Title className="settings-confirm-title">
            Deleted conversations
          </DialogPrimitive.Title>
          <DialogPrimitive.Description
            id="deleted-chats-desc"
            className="settings-confirm-description"
          >
            Conversations can be restored within 30 days of deletion. After 30 days, they are
            permanently removed.
          </DialogPrimitive.Description>

          {loading && <LoadingSpinner label="Loading deleted chats…" />}

          {error && <InlineError message={error} onRetry={() => void load()} />}

          {!loading && !error && sessions.length === 0 && (
            <p className="settings-muted-note" style={{ margin: "16px 0" }}>
              No deleted conversations in the 30-day recovery window.
            </p>
          )}

          {!loading && !error && sessions.length > 0 && (
            <div
              style={{
                marginTop: 14,
                maxHeight: 260,
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
                      <div
                        className="settings-muted-note"
                        style={{ margin: "2px 0 0", fontSize: 11 }}
                      >
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
                        color: "var(--brand-primary, #0284c7)",
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

          <div className="settings-confirm-actions" style={{ marginTop: 18 }}>
            <Button
              variant="secondary"
              leadingIcon={null}
              trailingIcon={null}
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
