"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { DialogPrimitive, Button, toast } from "@pansgpt/ui/shell";
import { listActiveSessions, requestSession, type ChatSessionSummary } from "@/lib/chat-sessions";

export function DeleteHistoryDialog({
  open,
  onOpenChange,
  token,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string | undefined;
  onDone?: () => void;
}): React.ReactElement {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  const loadSessions = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    try {
      const list = await listActiveSessions(token);
      if (!alive.current) return;
      setSessions(list);
      setSelectedIds(new Set(list.map((s) => s.id)));
      setLoading(false);
    } catch {
      if (!alive.current) return;
      setLoadError("Couldn't load your conversations. Please retry.");
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    alive.current = true;
    if (open && token) {
      const controller = new AbortController();
      void listActiveSessions(token, controller.signal)
        .then((list) => {
          if (!alive.current) return;
          setSessions(list);
          setSelectedIds(new Set(list.map((s) => s.id)));
          setLoading(false);
          setLoadError(null);
        })
        .catch(() => {
          if (!alive.current) return;
          setLoadError("Couldn't load your conversations. Please retry.");
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

  function handleToggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSelectAll() {
    if (selectedIds.size === sessions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sessions.map((s) => s.id)));
    }
  }

  async function handleConfirm(): Promise<void> {
    if (!token || selectedIds.size === 0 || busy) return;
    setBusy(true);
    setError(null);
    let deletedCount = 0;
    const errors: string[] = [];

    const toDelete = Array.from(selectedIds);
    for (const id of toDelete) {
      try {
        await requestSession(token, id, "delete");
        deletedCount++;
      } catch (err) {
        errors.push(err instanceof Error ? err.message : "Deletion failed");
      }
    }

    if (!alive.current) return;
    setBusy(false);

    if (deletedCount > 0) {
      toast.success(
        `${deletedCount} conversation${deletedCount === 1 ? "" : "s"} moved to deleted chats.`
      );
      onDone?.();
    }

    if (errors.length > 0) {
      setError(
        `Could not delete ${errors.length} conversation${errors.length === 1 ? "" : "s"}. Please retry.`
      );
    } else {
      onOpenChange(false);
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="settings-confirm-overlay" />
        <DialogPrimitive.Content
          className="settings-confirm-dialog"
          aria-describedby="delete-history-desc"
          style={{ maxWidth: 480, width: "92vw" }}
        >
          <div className="settings-confirm-icon-wrap" aria-hidden="true">
            <AlertTriangle size={24} className="settings-confirm-icon" />
          </div>
          <DialogPrimitive.Title className="settings-confirm-title">
            Delete conversation history?
          </DialogPrimitive.Title>
          <DialogPrimitive.Description
            id="delete-history-desc"
            className="settings-confirm-description"
          >
            Deleted conversations can be restored within 30 days from Settings › Privacy &amp; Data
            › Deleted chats. After 30 days, they are permanently removed.
          </DialogPrimitive.Description>

          {loading && (
            <div className="settings-spinner-row" aria-label="Loading conversations…">
              <span className="settings-spinner" aria-hidden="true" />
            </div>
          )}

          {loadError && (
            <div className="settings-error-notice" role="alert">
              {loadError}
              <button
                type="button"
                className="settings-retry-icon"
                aria-label="Retry loading conversations"
                onClick={() => void loadSessions()}
              >
                <RefreshCw size={14} />
              </button>
            </div>
          )}

          {!loading && !loadError && sessions.length === 0 && (
            <p className="settings-muted-note">No active conversations found.</p>
          )}

          {!loading && !loadError && sessions.length > 0 && (
            <div style={{ marginTop: 12, marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 13,
                  marginBottom: 8,
                }}
              >
                <span className="settings-muted-note">
                  {selectedIds.size} of {sessions.length} selected
                </span>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--brand-primary, #0284c7)",
                    cursor: "pointer",
                    fontSize: 13,
                    padding: 0,
                  }}
                >
                  {selectedIds.size === sessions.length ? "Deselect all" : "Select all"}
                </button>
              </div>

              <div
                style={{
                  maxHeight: 180,
                  overflowY: "auto",
                  border: "1px solid var(--border-secondary)",
                  borderRadius: 8,
                  padding: "4px 8px",
                }}
              >
                {sessions.map((s) => (
                  <label
                    key={s.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 4px",
                      fontSize: 13,
                      cursor: "pointer",
                      borderBottom: "1px solid var(--border-secondary, #eee)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.id)}
                      onChange={() => handleToggleOne(s.id)}
                      disabled={busy}
                    />
                    <span
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        flex: 1,
                      }}
                    >
                      {s.title || "Untitled chat"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="settings-error-notice" role="alert">
              {error}
            </p>
          )}

          <div className="settings-confirm-actions">
            <Button
              variant="secondary"
              leadingIcon={null}
              trailingIcon={null}
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <button
              type="button"
              disabled={busy || selectedIds.size === 0 || loading}
              onClick={() => void handleConfirm()}
              className="settings-button-danger"
            >
              {busy
                ? "Deleting…"
                : selectedIds.size > 0
                  ? `Delete ${selectedIds.size} chat${selectedIds.size === 1 ? "" : "s"}`
                  : "Delete selected"}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
