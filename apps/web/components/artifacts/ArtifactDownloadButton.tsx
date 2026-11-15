"use client";

import {
  fetchWithRecovery,
  failureFrom,
  responseFailure,
  ChatFailure,
  publicFailure,
} from "@/lib/chat-recovery";

import { useEffect, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import type { ArtifactItem } from "@pansgpt/types";
import { useAuth } from "@/lib/auth-context";
import { artifactDownload } from "@/lib/artifact-download";
import { env } from "@/env";

export function ArtifactDownloadButton({
  artifact,
  label,
}: {
  artifact: ArtifactItem;
  label?: string;
}): React.ReactElement {
  const { session, profile } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = useRef<AbortController | null>(null);
  const urls = useRef(new Set<string>());
  useEffect(
    () => () => {
      active.current?.abort();
      for (const url of urls.current) URL.revokeObjectURL(url);
      urls.current.clear();
    },
    [profile?.id, profile?.university_id]
  );
  async function download(): Promise<void> {
    if (downloading) return;
    const controller = new AbortController();
    active.current = controller;
    setDownloading(true);
    setError(null);
    try {
      if (!session?.access_token) throw new ChatFailure(publicFailure("401"));
      const { url, filename } = artifactDownload(artifact, env.NEXT_PUBLIC_API_URL);
      const response = await fetchWithRecovery(url, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) throw await responseFailure(response, "download");
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      const objectUrl = URL.createObjectURL(blob);
      urls.current.add(objectUrl);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        urls.current.delete(objectUrl);
      }, 1000);
    } catch (failure: unknown) {
      if (!controller.signal.aborted) setError(failureFrom(failure, "download").message);
    } finally {
      if (!controller.signal.aborted) setDownloading(false);
      if (active.current === controller) active.current = null;
    }
  }
  return (
    <div className="study-artifact-download-action">
      <button
        type="button"
        className="study-artifact-download"
        aria-label={label}
        disabled={downloading}
        onClick={() => {
          void download();
        }}
      >
        {downloading ? (
          <Loader2 size={14} className="study-artifact-spinner" aria-hidden="true" />
        ) : (
          <Download size={14} aria-hidden="true" />
        )}
        <span>{downloading ? "Downloading…" : error ? "Retry download" : "Download"}</span>
      </button>
      {error && (
        <p role="alert" className="study-artifact-error">
          {error}
        </p>
      )}
    </div>
  );
}
