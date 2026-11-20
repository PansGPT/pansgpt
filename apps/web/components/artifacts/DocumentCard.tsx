"use client";

import { FileText, Presentation, NotebookPen, PanelRightOpen } from "lucide-react";
import type { ArtifactItem } from "@pansgpt/types";
import { presentationMetadataSchema } from "@/lib/presentation-preview";
import { usePresentationWorkspace } from "./PresentationWorkspace";
import { ArtifactDownloadButton } from "./ArtifactDownloadButton";
import "./DocumentCard.css";

export function DocumentCard({ artifact }: { artifact: ArtifactItem }): React.ReactElement {
  const workspace = usePresentationWorkspace();
  const ext = (artifact.file_extension || "file").toLowerCase();
  const Icon = ext === "pptx" ? Presentation : ext === "md" ? NotebookPen : FileText;
  const kinds: Record<string, string> = {
    pptx: "Presentation",
    docx: "Word document",
    pdf: "Revision sheet",
    md: "Study notes",
  };
  const kind = kinds[ext] || "Study file";
  const metadata = presentationMetadataSchema.safeParse(artifact.content);
  const count = metadata.success ? metadata.data.slides_count : undefined;
  const previewable =
    ext === "pptx" && !!workspace && !!(artifact.storage_key || artifact.download_url);
  const info = (
    <>
      <span className="study-artifact-icon">
        <Icon size={20} aria-hidden="true" />
      </span>
      <span className="study-artifact-label">
        <strong>{artifact.title}</strong>
        <span className="study-artifact-extension">
          {count ? `${count} slides · ` : ""}
          {kind} · {ext}
        </span>
      </span>
    </>
  );
  return (
    <div className="study-artifact-card" data-extension={ext}>
      {previewable ? (
        <button
          type="button"
          className="study-artifact-info study-artifact-preview"
          aria-label={`Preview ${artifact.title}`}
          onClick={(event) => workspace.open(artifact, false, event.currentTarget)}
        >
          {info}
          <PanelRightOpen size={17} aria-hidden="true" />
        </button>
      ) : (
        <div className="study-artifact-info">{info}</div>
      )}
      {(artifact.storage_key || artifact.download_url) && (
        <ArtifactDownloadButton
          key={artifact.storage_key || artifact.download_url}
          artifact={artifact}
        />
      )}
    </div>
  );
}
