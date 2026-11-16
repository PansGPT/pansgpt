"use client";
import { useEffect, useState } from "react";
import { LoaderCircle, RotateCw } from "lucide-react";
import type { OwnedAttachment } from "@pansgpt/types";
import { readOwnedUpload } from "@/lib/owned-upload";
import { SettingsDetailView } from "./settings-detail-view";

export function OwnedImageView({
  file,
  token,
  onOpenChange,
}: {
  file: OwnedAttachment;
  token: string | undefined;
  onOpenChange: (open: boolean) => void;
}): React.ReactElement {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ attempt: number; url?: string; error?: boolean }>({
    attempt: -1,
  });
  useEffect(() => {
    const controller = new AbortController();
    let url: string | undefined;
    if (file.session_id)
      void readOwnedUpload(
        token,
        { session_id: file.session_id, attachment_id: file.id },
        true,
        controller.signal
      )
        .then((blob) => {
          if (controller.signal.aborted) return;
          url = URL.createObjectURL(blob);
          setState({ attempt, url });
        })
        .catch(() => {
          if (!controller.signal.aborted) setState({ attempt, error: true });
        });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [token, file.id, file.session_id, attempt]);
  const current = state.attempt === attempt ? state : null;
  return (
    <SettingsDetailView
      open
      onOpenChange={onOpenChange}
      title="Image preview"
      description={file.name}
    >
      {!current && (
        <div className="settings-spinner-row" role="status" aria-label="Loading image">
          <LoaderCircle className="animate-spin" size={20} />
        </div>
      )}
      {current?.error && (
        <div className="settings-inline-error" role="alert">
          <span>Couldn&apos;t preview this image. Please try again.</span>
          <button
            type="button"
            className="settings-notice-retry"
            aria-label="Retry image preview"
            onClick={() => setAttempt((old) => old + 1)}
          >
            <RotateCw size={15} />
          </button>
        </div>
      )}
      {/* Authenticated temporary browser blob; no public image URL or server image proxy. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {current?.url && <img className="settings-upload-image" src={current.url} alt={file.name} />}
    </SettingsDetailView>
  );
}
