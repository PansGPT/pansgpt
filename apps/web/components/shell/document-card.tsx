"use client";
import type { MouseEventHandler, ReactNode } from "react";
import { ChevronRight, FileText } from "lucide-react";
import { DocumentThumbnail } from "./document-thumbnail";

/** The approved Home document card, reused by the Library grid. */
export function DocumentCard({
  documentId,
  revision,
  title,
  date,
  detail,
  onClick,
  selected,
  className = "",
  label,
}: {
  documentId?: string;
  revision?: string;
  title: string;
  date: string;
  detail?: ReactNode;
  onClick: MouseEventHandler<HTMLButtonElement>;
  selected?: boolean;
  className?: string;
  label?: string;
}): React.ReactElement {
  return (
    <button
      type="button"
      className={`dashboard-recent-card ${className}`}
      onClick={onClick}
      aria-label={label}
      aria-pressed={selected}
    >
      <div className="dashboard-recent-cover">
        <DocumentThumbnail documentId={documentId} revision={revision} />
      </div>
      <div className="dashboard-recent-body">
        <span className="dashboard-file-icon">
          <FileText size={19} aria-hidden="true" />
        </span>
        <div className="dashboard-recent-copy">
          <h3>{title}</h3>
          {detail && <span className="dashboard-recent-detail">{detail}</span>}
        </div>
        <div className="dashboard-card-meta">
          <span>
            {new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        </div>
        <ChevronRight className="dashboard-recent-chevron" size={18} aria-hidden="true" />
      </div>
    </button>
  );
}
