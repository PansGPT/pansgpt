"use client";

import React from "react";
import { FileText, Download, Presentation, FileCode } from "lucide-react";
import { ArtifactItem } from "@/lib/sse-parser";

interface DocumentCardProps {
  artifact: ArtifactItem;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ artifact }) => {
  const ext = (artifact.file_extension || "file").toLowerCase();

  const getIcon = () => {
    if (ext === "pptx") return <Presentation className="h-5 w-5 text-amber-500" />;
    if (ext === "pdf") return <FileText className="h-5 w-5 text-red-500" />;
    if (ext === "docx") return <FileCode className="h-5 w-5 text-blue-500" />;
    return <FileText className="h-5 w-5 text-emerald-500" />;
  };

  const getBadgeColor = () => {
    if (ext === "pptx")
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300";
    if (ext === "pdf") return "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300";
    if (ext === "docx") return "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300";
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
  };

  return (
    <div className="my-3 flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
          {getIcon()}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {artifact.title}
          </h4>
          <span
            className={`inline-block mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getBadgeColor()}`}
          >
            {ext}
          </span>
        </div>
      </div>

      {artifact.download_url && (
        <a
          href={artifact.download_url}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 active:scale-95"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Download</span>
        </a>
      )}
    </div>
  );
};
