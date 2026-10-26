"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowUpRight, BookOpen, X } from "lucide-react";
import { Button, Slideout } from "@pansgpt/ui/shell";
import type { LibraryDocument } from "@pansgpt/types";
import { useAuth } from "@/lib/auth-context";
import { env } from "@/env";
import {
  fileSize,
  materialDate,
  libraryError,
  pdfLinkSchema,
  openedSchema,
} from "@/lib/library-catalog";
import { DocumentThumbnail } from "@/components/shell/document-thumbnail";

function subscribeViewport(notify: () => void): () => void {
  const media = window.matchMedia("(max-width: 860px)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}
const mobileViewport = (): boolean => window.matchMedia("(max-width: 860px)").matches;

function DetailsBody({
  document,
  onOpened,
}: {
  document: LibraryDocument;
  onOpened: () => void;
}): React.ReactElement {
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallback, setFallback] = useState<string | null>(null);
  const [recentError, setRecentError] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const popup = useRef<Window | null>(null);
  const expiry = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      pending.current?.abort();
      popup.current?.close();
      if (expiry.current) clearTimeout(expiry.current);
    },
    []
  );
  async function recordOpening(): Promise<void> {
    if (!session?.access_token) return;
    const controller = new AbortController();
    pending.current = controller;
    const timer = setTimeout(
      () => controller.abort(new DOMException("History timed out", "TimeoutError")),
      15000
    );
    try {
      const response = await fetch(
        `${env.NEXT_PUBLIC_API_URL}/api/v1/library/catalog/${document.id}/opened`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          signal: controller.signal,
          cache: "no-store",
        }
      );
      if (!response.ok) throw new Error("Recent update failed");
      const result = openedSchema.parse(await response.json());
      if (result.document_id !== document.id) throw new Error("Document mismatch");
      if (!controller.signal.aborted) {
        setRecentError(false);
        onOpened();
      }
    } catch {
      if (!controller.signal.aborted || controller.signal.reason?.name === "TimeoutError")
        setRecentError(true);
    } finally {
      clearTimeout(timer);
    }
  }
  async function openPdf(): Promise<void> {
    if (!session?.access_token || busy) return;
    setBusy(true);
    setError(null);
    setFallback(null);
    if (expiry.current) clearTimeout(expiry.current);
    // Open during the user's click so asynchronous signing does not trigger popup blocking.
    const tab = window.open("", "_blank");
    if (tab) {
      tab.opener = null;
      tab.document.title = "Opening document";
      tab.document.body.textContent = "Opening your document…";
      const meta = tab.document.createElement("meta");
      meta.name = "referrer";
      meta.content = "no-referrer";
      tab.document.head.append(meta);
    }
    popup.current = tab;
    const controller = new AbortController();
    pending.current = controller;
    const timeout = setTimeout(
      () => controller.abort(new DOMException("Timed out", "TimeoutError")),
      15000
    );
    try {
      const response = await fetch(
        `${env.NEXT_PUBLIC_API_URL}/api/v1/library/catalog/${encodeURIComponent(document.id)}/pdf-url`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
          signal: controller.signal,
          cache: "no-store",
        }
      );
      if (!response.ok)
        throw await libraryError(response, "We couldn't open this PDF. Please try again.");
      const data = pdfLinkSchema.parse(await response.json());
      if (data.document_id !== document.id)
        throw new Error("The document link could not be verified.");
      if (controller.signal.aborted) return;
      if (tab && !tab.closed) {
        tab.location.replace(data.presigned_url);
        popup.current = null;
        await recordOpening();
      } else {
        setFallback(data.presigned_url);
        expiry.current = setTimeout(() => setFallback(null), data.expires_in_seconds * 1000);
      }
      popup.current = null;
    } catch (cause: unknown) {
      tab?.close();
      if (!controller.signal.aborted || controller.signal.reason?.name === "TimeoutError")
        setError(
          cause instanceof Error && cause.name !== "ZodError" && cause.name !== "TimeoutError"
            ? cause.message
            : "We couldn't open this PDF. Please try again."
        );
    } finally {
      clearTimeout(timeout);
      if (!controller.signal.aborted || controller.signal.reason?.name === "TimeoutError")
        setBusy(false);
    }
  }
  return (
    <div className="library-details-body">
      <DocumentThumbnail documentId={document.id} revision={document.updated_at} />
      <span className="library-course-label">{document.course_code}</span>
      <h3>{document.title}</h3>
      {document.topic && document.topic !== document.title && (
        <p className="library-topic">{document.topic}</p>
      )}
      <dl>
        <div>
          <dt>Course</dt>
          <dd>{document.course_title}</dd>
        </div>
        {document.lecturer_name && (
          <div>
            <dt>Lecturer</dt>
            <dd>{document.lecturer_name}</dd>
          </div>
        )}
        <div>
          <dt>Pages</dt>
          <dd>{document.page_count || "Not available yet"}</dd>
        </div>
        <div>
          <dt>File size</dt>
          <dd>{fileSize(document.file_size_bytes)}</dd>
        </div>
        {document.academic_session && (
          <div>
            <dt>Session</dt>
            <dd>{document.academic_session}</dd>
          </div>
        )}
        {document.semester && (
          <div>
            <dt>Semester</dt>
            <dd>{document.semester === "first" ? "First semester" : "Second semester"}</dd>
          </div>
        )}
        {!!document.target_levels.length && (
          <div>
            <dt>Levels</dt>
            <dd>{document.target_levels.join(", ")}</dd>
          </div>
        )}
        <div>
          <dt>Added</dt>
          <dd>{materialDate(document.created_at)}</dd>
        </div>
        {document.last_opened_at && (
          <div>
            <dt>Last opened</dt>
            <dd>{materialDate(document.last_opened_at)}</dd>
          </div>
        )}
        {document.status !== "active" && (
          <div>
            <dt>Status</dt>
            <dd>{document.status.replaceAll("_", " ")}</dd>
          </div>
        )}
      </dl>
      {document.last_page_read !== null && (
        <p className="library-reading-state">
          <BookOpen size={15} /> Saved position: page {document.last_page_read}
          {document.page_count > 0 ? ` of ${document.page_count}` : ""}
        </p>
      )}
      <div className="library-document-actions">
        <Button
          leadingIcon={<ArrowUpRight size={16} />}
          trailingIcon={null}
          disabled={busy}
          onClick={() => void openPdf()}
        >
          {busy ? "Opening PDF…" : "Open PDF"}
        </Button>
        {error && (
          <p className="library-inline-error" role="alert">
            {error}
          </p>
        )}
        {fallback && (
          <p role="status">
            Your browser blocked the new tab.{" "}
            <a
              href={fallback}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => void recordOpening()}
            >
              Open your PDF
            </a>
          </p>
        )}
        {recentError && (
          <p className="library-inline-error" role="status">
            Your PDF opened, but Recent Documents couldn’t be updated.{" "}
            <button type="button" onClick={() => void recordOpening()}>
              Retry history update
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

export function DocumentDetails({
  document,
  onClose,
  returnFocus,
  onOpened,
}: {
  document: LibraryDocument | null;
  onClose: () => void;
  returnFocus: () => void;
  onOpened: () => void;
}): React.ReactElement | null {
  const mobile = useSyncExternalStore(subscribeViewport, mobileViewport, () => false);
  if (!document) return null;
  if (mobile)
    return (
      <Slideout
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        title="Document details"
        description={document.title}
        className="library-details-dialog"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus();
        }}
      >
        <DetailsBody key={document.id} document={document} onOpened={onOpened} />
      </Slideout>
    );
  return (
    <aside className="library-details" aria-label="Document details">
      <header>
        <h2>Document details</h2>
        <button
          type="button"
          className="library-icon-button"
          aria-label="Close document details"
          onClick={() => {
            onClose();
            returnFocus();
          }}
        >
          <X size={18} />
        </button>
      </header>
      <DetailsBody key={document.id} document={document} onOpened={onOpened} />
    </aside>
  );
}
