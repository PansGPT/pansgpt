"use client";
import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Eye, FileText, X } from "lucide-react";
import { Button, Slideout } from "@pansgpt/ui/shell";
import type { LibraryDocument } from "@pansgpt/types";
import { fileSize, materialDate } from "@/lib/library-catalog";
import { ReadingProgress } from "./reading-progress";
import { DocumentThumbnail } from "@/components/shell/document-thumbnail";

function subscribeViewport(notify: () => void): () => void {
  const media = [window.matchMedia("(max-width: 860px)"), window.matchMedia("(min-width: 1280px)")];
  media.forEach((query) => query.addEventListener("change", notify));
  return () => media.forEach((query) => query.removeEventListener("change", notify));
}
const detailsViewport = (): "mobile" | "wide" | "compact" =>
  window.matchMedia("(max-width: 860px)").matches
    ? "mobile"
    : window.matchMedia("(min-width: 1280px)").matches
      ? "wide"
      : "compact";

function DetailsBody({ document }: { document: LibraryDocument }): React.ReactElement {
  const router = useRouter();
  return (
    <div className="library-details-body">
      <div className="library-file-scroll">
        <div className="library-file-preview">
          <DocumentThumbnail documentId={document.id} revision={document.updated_at} />
        </div>
        <h3>{document.topic || document.title}</h3>
        {document.topic && document.topic !== document.title && (
          <p className="library-topic">{document.title}</p>
        )}
        <dl>
          <div>
            <dt>Course code</dt>
            <dd>{document.course_code}</dd>
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
        <ReadingProgress lastPage={document.last_page_read} totalPages={document.page_count} />
      </div>
      <div className="library-document-actions">
        <Button
          leadingIcon={<Eye size={17} />}
          trailingIcon={null}
          onClick={() => router.push(`/app/library/${document.id}/read`)}
        >
          Open PDF
        </Button>
      </div>
    </div>
  );
}

export function DocumentDetails({
  document,
  onClose,
  returnFocus,
}: {
  document: LibraryDocument | null;
  onClose: () => void;
  returnFocus: () => void;
  onOpened?: () => void;
}): React.ReactElement | null {
  const viewport = useSyncExternalStore(subscribeViewport, detailsViewport, () => "compact");
  if (!document)
    return viewport === "wide" ? (
      <aside className="library-details library-details-empty" aria-label="File information">
        <header>
          <h2>File information</h2>
        </header>
        <div>
          <FileText size={24} />
          <h3>File information</h3>
          <p>Select a document to see its details and reading progress.</p>
        </div>
      </aside>
    ) : null;
  if (viewport === "mobile")
    return (
      <Slideout
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        title="File information"
        description={document.title}
        className="library-details-dialog"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus();
        }}
      >
        <DetailsBody key={document.id} document={document} />
      </Slideout>
    );
  return (
    <aside className="library-details" aria-label="File information">
      <header>
        <h2>File information</h2>
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
      <DetailsBody key={document.id} document={document} />
    </aside>
  );
}
