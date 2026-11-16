"use client";
import { SettingsDetailView, useMobileSettings } from "../settings-detail-view";

import { FileDown, ImageIcon, LoaderCircle, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearOwnerThumbnailCache,
  formatBytes,
  listOwnerPdfEntries,
  measureOwnerStorage,
  removeAllOwnerPdfs,
  removeOwnerPdfEntry,
  type SavedPdfEntry,
  type StorageMeasurement,
} from "@/lib/storage-management";
import { SettingsSection } from "../settings-section";
import { SettingsRow, SettingsActionButton } from "../settings-row";
import { useAuth } from "@/lib/auth-context";
import { toast, DialogPrimitive, Button } from "@pansgpt/ui/shell";
import { DeleteHistoryDialog } from "../delete-history-dialog";
import { observeLocalCacheChanges } from "@/lib/local-cache-coordination";
import { env } from "@/env";
import { libraryDocumentSchema } from "@/lib/library-catalog";

// ─── Storage Overview ─────────────────────────────────────────────────────────

type MeasureState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; data: StorageMeasurement };

function useMeasuredStorage() {
  const { session, profile } = useAuth();
  const owner =
    session?.user && profile?.id === session.user.id && profile?.university_id
      ? {
          userId: session.user.id,
          universityId: profile.university_id,
        }
      : null;

  const [state, setState] = useState<MeasureState>({ status: "loading" });
  const alive = useRef(true);
  const measurementId = useRef(0);

  const measure = useCallback(async () => {
    const id = ++measurementId.current;
    if (!owner) {
      setState({
        status: "done",
        data: {
          availability: "unavailable",
          pdfBytes: 0,
          pdfDocumentCount: 0,
          pdfEntryCount: 0,
          thumbnailBytes: 0,
          thumbnailCount: 0,
          totalBytes: 0,
        },
      });
      return;
    }
    setState({ status: "loading" });
    try {
      const data = await measureOwnerStorage(owner);
      if (!alive.current || id !== measurementId.current) return;
      setState({ status: "done", data });
    } catch {
      if (!alive.current || id !== measurementId.current) return;
      setState({ status: "error", message: "Couldn't measure local storage. Please retry." });
    }
  }, [owner?.userId, owner?.universityId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    alive.current = true;
    if (!owner) {
      return () => {
        alive.current = false;
      };
    }
    const id = ++measurementId.current;
    void measureOwnerStorage(owner)
      .then((data) => {
        if (!alive.current || id !== measurementId.current) return;
        setState({ status: "done", data });
      })
      .catch(() => {
        if (!alive.current || id !== measurementId.current) return;
        setState({ status: "error", message: "Couldn't measure local storage. Please retry." });
      });
    return () => {
      alive.current = false;
    };
  }, [owner?.userId, owner?.universityId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => observeLocalCacheChanges(() => void measure()), [measure]);

  return { state, refresh: measure, owner };
}

// ─── Manage / Remove PDFs dialog ─────────────────────────────────────────────

type ListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; entries: SavedPdfEntry[] };

function PdfManageDialog({
  owner,
  token,
  open,
  onOpenChange,
  onDone,
}: {
  owner: { userId: string; universityId: string };
  token: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [listState, setListState] = useState<ListState>({ status: "loading" });
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const alive = useRef(true);
  const listVersion = useRef(0);
  const [titles, setTitles] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!token || listState.status !== "done") return;
    const controller = new AbortController();
    void Promise.allSettled(
      listState.entries.map(async (entry) => {
        const response = await fetch(
          `${env.NEXT_PUBLIC_API_URL}/api/v1/library/catalog/${encodeURIComponent(entry.documentId)}/reader`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
            cache: "no-store",
          }
        );
        if (!response.ok) return;
        const payload = (await response.json()) as { document?: unknown };
        const document = libraryDocumentSchema.safeParse(payload.document);
        if (!controller.signal.aborted && document.success && document.data.id === entry.documentId)
          setTitles((old) => ({ ...old, [entry.documentId]: document.data.title }));
      })
    );
    return () => controller.abort();
  }, [listState, token]);

  const load = useCallback(async () => {
    const version = ++listVersion.current;
    setListState({ status: "loading" });
    try {
      const entries = await listOwnerPdfEntries(owner);
      if (!alive.current || version !== listVersion.current) return;
      setListState({ status: "done", entries });
    } catch (err) {
      if (!alive.current || version !== listVersion.current) return;
      setListState({
        status: "error",
        message: err instanceof Error ? err.message : "Couldn't load saved files. Please retry.",
      });
    }
  }, [owner.userId, owner.universityId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    alive.current = true;
    const version = ++listVersion.current;
    if (open) {
      void listOwnerPdfEntries(owner)
        .then((entries) => {
          if (!alive.current || version !== listVersion.current) return;
          setListState({ status: "done", entries });
        })
        .catch((err: unknown) => {
          if (!alive.current || version !== listVersion.current) return;
          setListState({
            status: "error",
            message:
              err instanceof Error ? err.message : "Couldn't load saved files. Please retry.",
          });
        });
    }
    return () => {
      alive.current = false;
    };
  }, [open, owner.userId, owner.universityId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => observeLocalCacheChanges(() => void load()), [load]);

  async function handleRemoveOne(documentId: string) {
    if (removing.has(documentId)) return;
    setRemoving((prev) => new Set([...prev, documentId]));
    try {
      await removeOwnerPdfEntry(owner, documentId);
      if (!alive.current) return;
      setListState((prev) =>
        prev.status === "done"
          ? { status: "done", entries: prev.entries.filter((e) => e.documentId !== documentId) }
          : prev
      );
      onDone();
    } catch (err) {
      if (!alive.current) return;
      toast.error(err instanceof Error ? err.message : "Couldn't remove that file. Please retry.");
    } finally {
      if (alive.current)
        setRemoving((prev) => {
          const s = new Set(prev);
          s.delete(documentId);
          return s;
        });
    }
  }

  return (
    <SettingsDetailView
      open={open}
      onOpenChange={onOpenChange}
      title="Saved documents"
      description={
        <>These are PDF copies saved in this browser. Removing them keeps your library intact.</>
      }
      maxWidth={480}
    >
      {listState.status === "loading" && (
        <div className="settings-spinner-row" aria-label="Loading saved files…">
          <LoaderCircle size={20} className="animate-spin" aria-hidden="true" />
        </div>
      )}

      {listState.status === "error" && (
        <div className="settings-error-notice" role="alert">
          {listState.message}
          <button
            type="button"
            className="settings-retry-icon"
            aria-label="Retry"
            onClick={() => void load()}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      )}

      {listState.status === "done" && listState.entries.length === 0 && (
        <p className="settings-muted-note">No saved documents on this device.</p>
      )}

      {listState.status === "done" && listState.entries.length > 0 && (
        <ul className="settings-pdf-list" role="list">
          {listState.entries.map((entry) => (
            <li key={entry.documentId} className="settings-pdf-row">
              <span className="settings-pdf-info">
                <span className="settings-pdf-name">
                  {titles[entry.documentId] ?? `Saved document (${entry.documentId.slice(0, 8)})`}
                </span>
                <span className="settings-pdf-meta">
                  {formatBytes(entry.bytes)} ·{" "}
                  {entry.storedAt
                    ? new Date(entry.storedAt).toLocaleDateString()
                    : "Date unavailable"}
                </span>
              </span>
              <button
                type="button"
                className="settings-pdf-remove"
                disabled={removing.has(entry.documentId)}
                onClick={() => void handleRemoveOne(entry.documentId)}
                aria-label={`Remove saved copy`}
              >
                {removing.has(entry.documentId) ? (
                  <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 size={14} />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </SettingsDetailView>
  );
}

// ─── Remove all downloads confirmation ───────────────────────────────────────

function RemoveDownloadsDialog({
  owner,
  open,
  count,
  onOpenChange,
  onDone,
}: {
  owner: { userId: string; universityId: string };
  open: boolean;
  count: number;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  async function handleConfirm() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const removed = await removeAllOwnerPdfs(owner);
      if (!alive.current) return;
      onOpenChange(false);
      onDone();
      toast.success(`${removed} saved ${removed === 1 ? "file" : "files"} removed.`);
    } catch (err) {
      if (alive.current)
        setError(err instanceof Error ? err.message : "Removal failed. Please retry.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="settings-confirm-overlay" />
        <DialogPrimitive.Content
          className="settings-confirm-dialog"
          aria-describedby="remove-dl-desc"
        >
          <DialogPrimitive.Title className="settings-confirm-title">
            Remove all downloaded files?
          </DialogPrimitive.Title>
          <DialogPrimitive.Description id="remove-dl-desc" className="settings-confirm-description">
            This removes {count > 0 ? `${count} ` : ""}local {count === 1 ? "copy" : "copies"} from
            this device. Your library documents, highlights, and study records are not affected.
          </DialogPrimitive.Description>
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
              disabled={busy}
              onClick={() => void handleConfirm()}
              className="settings-button-danger"
            >
              {busy ? "Removing…" : "Remove all"}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ─── Main storage section ─────────────────────────────────────────────────────

export function DataStorageSection(): React.ReactElement {
  const { session, profile } = useAuth();
  return (
    <DataStorageContent key={`${session?.user.id}:${profile?.id}:${profile?.university_id}`} />
  );
}
function DataStorageContent(): React.ReactElement {
  const mobile = useMobileSettings();
  const { session } = useAuth();
  const { state, refresh, owner } = useMeasuredStorage();
  const [manageOpen, setManageOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [deleteHistoryOpen, setDeleteHistoryOpen] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const toastId = useRef<string | number | undefined>(undefined);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (toastId.current !== undefined) toast.dismiss(toastId.current);
    };
  }, []);

  const pdfCount = state.status === "done" ? state.data.pdfDocumentCount : 0;
  const pdfBytes = state.status === "done" ? state.data.pdfBytes : 0;
  const thumbBytes = state.status === "done" ? state.data.thumbnailBytes : 0;
  const totalBytes = state.status === "done" ? state.data.totalBytes : 0;
  const availability = state.status === "done" ? state.data.availability : null;
  const isAvailable = availability === "available";
  const pdfFraction = totalBytes > 0 ? Math.round((pdfBytes / totalBytes) * 100) : 0;

  async function handleClearCache() {
    if (!owner || clearingCache) return;
    setClearingCache(true);
    try {
      const removed = await clearOwnerThumbnailCache(owner);
      if (!alive.current) return;
      void refresh();
      if (toastId.current !== undefined) toast.dismiss(toastId.current);
      toastId.current = toast.success(
        removed > 0
          ? `Cache cleared (${removed} preview${removed === 1 ? "" : "s"} removed).`
          : "Cache is already empty."
      );
    } catch (err) {
      if (!alive.current) return;
      if (toastId.current !== undefined) toast.dismiss(toastId.current);
      toastId.current = toast.error(
        err instanceof Error ? err.message : "Cache could not be cleared. Please retry."
      );
    } finally {
      if (alive.current) setClearingCache(false);
    }
  }

  const storageLabel =
    state.status === "loading"
      ? "Measuring…"
      : state.status === "error"
        ? "—"
        : availability === "unavailable"
          ? "Not available"
          : availability === "private-browsing"
            ? "Not available in private browsing"
            : formatBytes(totalBytes);

  const docLabel = state.status === "done" && isAvailable ? formatBytes(pdfBytes) : "—";
  const previewLabel = state.status === "done" && isAvailable ? formatBytes(thumbBytes) : "—";
  const countLabel =
    state.status === "done" && isAvailable ? `${pdfCount} file${pdfCount !== 1 ? "s" : ""}` : "—";

  const metricsAriaLabel =
    isAvailable && state.status === "done"
      ? `Storage breakdown: ${formatBytes(pdfBytes)} downloaded documents, ${formatBytes(thumbBytes)} cached previews`
      : "Storage breakdown for downloaded documents and cached previews";
  const detail = deleteHistoryOpen ? (
    <DeleteHistoryDialog open onOpenChange={setDeleteHistoryOpen} token={session?.access_token} />
  ) : owner && manageOpen ? (
    <PdfManageDialog
      owner={owner}
      token={session?.access_token}
      open
      onOpenChange={setManageOpen}
      onDone={refresh}
    />
  ) : null;
  if (mobile && detail) return detail;

  return (
    <div className="settings-section-container">
      <SettingsSection
        title="Storage on this device"
        description="See what is stored locally and make room when you need it."
        mobileDescription={null}
      >
        <div
          className="settings-storage-overview"
          data-settings-label="Storage overview"
          tabIndex={-1}
        >
          <div className="settings-storage-total">
            <div>
              <span>Space used</span>
              <strong>{storageLabel}</strong>
            </div>
            {state.status === "loading" && (
              <LoaderCircle size={16} className="animate-spin" aria-label="Measuring…" />
            )}
            {state.status === "error" && (
              <button
                type="button"
                className="settings-retry-icon"
                aria-label="Retry storage measurement"
                onClick={() => void refresh()}
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>
          <div className="settings-storage-meter" role="img" aria-label={metricsAriaLabel}>
            <span
              className="settings-storage-documents"
              style={{ width: isAvailable && totalBytes > 0 ? `${pdfFraction}%` : "0%" }}
            />
            <span
              className="settings-storage-previews"
              style={{ width: isAvailable && totalBytes > 0 ? `${100 - pdfFraction}%` : "0%" }}
            />
          </div>
          <div className="settings-storage-legend">
            <span>
              <i data-kind="documents" />
              Downloaded documents <strong>{docLabel}</strong>
            </span>
            <span>
              <i data-kind="previews" />
              Cached previews <strong>{previewLabel}</strong>
            </span>
          </div>
          {!isAvailable && state.status === "done" && (
            <p className="settings-muted-note" style={{ marginTop: "0.5rem" }}>
              {availability === "private-browsing"
                ? "Local storage is not available in private browsing mode."
                : "Local storage is not available on this device."}
            </p>
          )}
        </div>
        <SettingsRow
          title="Downloaded documents"
          description="PDF copies saved in this browser."
          mobileTitle="Downloads"
          mobileDescription="PDF copies saved in this browser."
        >
          <span className="settings-inline-action-group">
            <span className="settings-storage-count">{countLabel}</span>
            <SettingsActionButton
              icon={<FileDown size={15} />}
              disabled={!isAvailable || pdfCount === 0}
              onClick={() => setManageOpen(true)}
            >
              Manage
            </SettingsActionButton>
          </span>
        </SettingsRow>
        <SettingsRow
          title="Remove downloads"
          description="Remove local copies without deleting documents from your library."
          mobileDescription="Keeps files in your library."
        >
          <SettingsActionButton
            disabled={!isAvailable || pdfCount === 0}
            onClick={() => setRemoveOpen(true)}
          >
            Remove downloads
          </SettingsActionButton>
        </SettingsRow>
        <SettingsRow
          title="Cached files & previews"
          description="Clear temporary files without removing your downloads."
          mobileTitle="Clear cache"
          mobileDescription="Keeps your downloads."
        >
          <SettingsActionButton
            icon={<ImageIcon size={15} />}
            disabled={!isAvailable || clearingCache}
            onClick={() => void handleClearCache()}
          >
            {clearingCache ? "Clearing…" : "Clear cache"}
          </SettingsActionButton>
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Study data">
        <SettingsRow
          title="Export study data"
          description="Keep a copy of your conversations and study notes."
          mobileDescription="Download your chats and notes."
        >
          {/* Export is a separate increment. Backend contract, format, size limits,
              authorization and cleanup are not implemented. See handoff doc. */}
          <SettingsActionButton disabled>Export data</SettingsActionButton>
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Conversation history" className="settings-danger-section">
        <SettingsRow
          title="Delete conversation history"
          description="Review your conversations before deleting them."
          mobileTitle="Delete chats"
          mobileDescription="Review before deleting."
          destructive
        >
          <SettingsActionButton destructive onClick={() => setDeleteHistoryOpen(true)}>
            Delete history
          </SettingsActionButton>
        </SettingsRow>
      </SettingsSection>

      {detail}

      {owner && (
        <>
          {removeOpen && (
            <RemoveDownloadsDialog
              owner={owner}
              open={removeOpen}
              count={pdfCount}
              onOpenChange={setRemoveOpen}
              onDone={refresh}
            />
          )}
        </>
      )}
    </div>
  );
}
