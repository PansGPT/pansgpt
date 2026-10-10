"use client";

import React, { useState } from "react";
import { FileText, Download, Presentation, FileCode, Loader2 } from "lucide-react";
import { ArtifactItem } from "@/lib/sse-parser";

interface DocumentCardProps {
  artifact: ArtifactItem;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ artifact }) => {
  const [downloading, setDownloading] = useState(false);
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

  const handleDownload = async () => {
    if (!artifact.download_url || downloading) return;
    setDownloading(true);
    try {
      // Always go through our own API endpoint — never a raw presigned URL.
      // The API streams bytes with Content-Disposition: attachment, so no
      // browser redirect to Office Online or any external viewer.
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      // Resolve the canonical storage key from artifact metadata or download_url
      let storageKey = artifact.storage_key;
      if (!storageKey && artifact.download_url) {
        if (artifact.download_url.includes("key=")) {
          const match = artifact.download_url.match(/[?&]key=([^&]+)/);
          if (match) storageKey = decodeURIComponent(match[1]);
        } else if (artifact.download_url.includes("universities/")) {
          const idx = artifact.download_url.indexOf("universities/");
          if (idx !== -1) {
            storageKey = artifact.download_url.slice(idx).split("?")[0];
          }
        }
      }

      // Build clean filename: prefer artifact title, fall back to UUID+ext
      const rawTitle = artifact.title || "PansGPT_Artifact";
      const safeTitle = rawTitle
        .replace(/[^a-zA-Z0-9 _-]/g, "")
        .trim()
        .replace(/\s+/g, "_");
      const filename = `${safeTitle}.${ext}`;

      let url: string;
      if (storageKey) {
        url = `${apiBase}/api/v1/library/documents/download?key=${encodeURIComponent(storageKey)}&filename=${encodeURIComponent(safeTitle)}`;
      } else if (artifact.download_url.startsWith("http")) {
        url = artifact.download_url;
      } else {
        url = `${apiBase}${artifact.download_url}`;
      }

      // Get the current session token for authorization
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);

      const anchor = document.createElement("a");

      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setDownloading(false);
    }
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
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {downloading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          <span>{downloading ? "Downloading…" : "Download"}</span>
        </button>
      )}
    </div>
  );
};
