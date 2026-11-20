"use client";

import { fetchWithRecovery, publicFailure } from "@/lib/chat-recovery";

// Adapted from assistant-ui's attachment element; see assistant-ui.LICENSE.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { ChatLibrarySource } from "@pansgpt/types";
import { createPortal } from "react-dom";
import { AttachmentPrimitive, useAui, useAuiState } from "@assistant-ui/react";
import { FileText, ImageIcon, Loader2, RotateCcw, X } from "lucide-react";
import { DialogPrimitive, Tooltip } from "@pansgpt/ui/shell";
import { useAuth } from "@/lib/auth-context";
import { env } from "@/env";
import { ChatError, ChatNotice } from "./connection-notice";
import { useChatActions } from "./actions-context";

export const AttachmentNoticeTargetContext = createContext<HTMLElement | null>(null);

function FileAttachmentContent({ name }: { name: ReactNode }): React.ReactElement {
  return (
    <>
      <FileText size={23} aria-hidden="true" />
      <span className="study-chat-file-copy">
        {name}
        <small>Document</small>
      </span>
    </>
  );
}

export function LibraryAttachment({
  source,
  onRemove,
}: {
  source: ChatLibrarySource;
  onRemove?: () => void;
}): React.ReactElement {
  return (
    <div
      className="study-chat-attachment-card"
      data-image="false"
      data-removable="false"
      data-library-document={source.id}
    >
      <div
        className="study-chat-attachment-tile"
        role="group"
        aria-label={`Document attachment ${source.title}`}
        title={source.title}
      >
        <FileAttachmentContent name={<span>{source.title}</span>} />
      </div>
      {onRemove && (
        <button
          type="button"
          className="study-chat-attachment-remove"
          aria-label="Remove library document from edited message"
          onClick={onRemove}
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

/** Local files and authenticated previews only; never load a model-supplied image URL. */
function useAttachmentPreview(expanded = false): {
  src?: string;
  failed: boolean;
  retry: () => void;
} {
  const attachment = useAuiState((s) => s.attachment);
  const { sessionId } = useChatActions();
  const { session, profile } = useAuth();
  const token = session?.access_token;
  const image = attachment.type === "image";
  const file = attachment.file;
  const id = attachment.id;
  const complete = attachment.status.type === "complete";
  const identity = `${profile?.id}:${profile?.university_id}:${sessionId}:${id}:${token}:${expanded}`;
  const [attempt, setAttempt] = useState(0);
  const [preview, setPreview] = useState<{
    identity: string;
    file?: File;
    src?: string;
    failed: boolean;
  }>();
  useEffect(() => {
    if (!image) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    async function load(): Promise<void> {
      try {
        let blob: Blob;
        if (file) blob = file;
        else {
          if (!complete || !sessionId || !token || !profile?.id) return;
          const response = await fetchWithRecovery(
            `${env.NEXT_PUBLIC_API_URL}/api/v1/ai/chat/sessions/${encodeURIComponent(sessionId)}/attachments/${encodeURIComponent(id)}/preview${expanded ? "?size=large" : ""}`,
            {
              headers: { Authorization: `Bearer ${token}` },
              signal: controller.signal,
              cache: "no-store",
            }
          );
          if (!response.ok || response.headers.get("content-type")?.split(";")[0] !== "image/png")
            throw new Error("Preview unavailable");
          blob = await response.blob();
        }
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setPreview({ identity, file, src: objectUrl, failed: false });
      } catch {
        if (!controller.signal.aborted) setPreview({ identity, file, failed: true });
      }
    }
    void load();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [image, file, id, complete, sessionId, token, profile?.id, identity, expanded, attempt]);
  const current = preview?.identity === identity && preview.file === file ? preview : undefined;
  return {
    src: current?.src,
    failed: current?.failed ?? false,
    retry: () => setAttempt((n) => n + 1),
  };
}

function ExpandedImage({
  thumbnail,
  name,
}: {
  thumbnail: string;
  name: string;
}): React.ReactElement {
  const { src, failed, retry } = useAttachmentPreview(true);
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src ?? thumbnail} alt={name} className="study-chat-image-preview" />
      {failed && (
        <button type="button" className="study-chat-lightbox-retry" onClick={retry}>
          Retry full-size preview
        </button>
      )}
    </>
  );
}

export function ChatAttachment({ removable = false }: { removable?: boolean }): React.ReactElement {
  const aui = useAui();
  const noticeTarget = useContext(AttachmentNoticeTargetContext);
  const file = useAuiState((s) => s.attachment.file);
  const [retryError, setRetryError] = useState(false);
  const name = useAuiState((s) => s.attachment.name);
  const image = useAuiState((s) => s.attachment.type === "image");
  const status = useAuiState((s) => s.attachment.status);
  const submitting = useAuiState((s) => s.optional.message?.submission !== undefined);
  const uploading = status.type === "running" || (submitting && status.type !== "complete");
  const uploadFailed = status.type === "incomplete";
  const uploadFailure = uploadFailed
    ? [
        ...["401", "402", "403", "404", "413", "415", "422", "429"].map((code) =>
          publicFailure(code, "", false, "upload")
        ),
        publicFailure("429", "limit reached", false, "upload"),
      ].find((failure) => failure.message === status.message)
    : undefined;
  const { src, failed, retry } = useAttachmentPreview();
  const [broken, setBroken] = useState<string>();
  const available = src && broken !== src;
  const previewFailed = failed || (!!src && broken === src);
  const label = image ? "Image" : "Document";
  const tile = (
    <>
      {image ? (
        available ? (
          // Blob URLs are private, temporary and cannot be optimized by next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={name} onError={() => setBroken(src)} />
        ) : (
          <ImageIcon size={24} aria-hidden="true" />
        )
      ) : (
        <FileAttachmentContent name={<AttachmentPrimitive.Name />} />
      )}
      {uploading && (
        <span className="study-chat-attachment-overlay" role="status">
          <Loader2 size={19} className="study-chat-spin" />
          <span className="p-sr-only">Uploading {name}</span>
        </span>
      )}
    </>
  );
  const UploadNotice = !uploadFailure && removable && file ? ChatError : ChatNotice;
  const uploadNotice = uploadFailed ? (
    <UploadNotice
      message={
        retryError
          ? "We couldn't attach this file. Choose it again to retry."
          : (uploadFailure?.message ?? "We couldn't upload this file. Please try again.")
      }
    >
      <div className="study-chat-recovery-actions">
        {!uploadFailure && removable && file && (
          <button
            type="button"
            aria-label="Retry upload"
            onClick={() => {
              setRetryError(false);
              void (async () => {
                try {
                  await aui.attachment().remove();
                  await aui.composer().addAttachment(file);
                } catch {
                  setRetryError(true);
                }
              })();
            }}
          >
            <RotateCcw size={14} aria-hidden="true" /> Retry
          </button>
        )}
        {uploadFailure?.action === "sign_in" && <a href="/login">Sign in again</a>}
      </div>
    </UploadNotice>
  ) : null;
  return (
    <>
      <AttachmentPrimitive.Root
        className="study-chat-attachment-card"
        data-image={image}
        data-removable={removable}
        data-error={uploadFailed}
      >
        {image && available ? (
          <DialogPrimitive.Root>
            <DialogPrimitive.Trigger asChild>
              <button
                type="button"
                className="study-chat-attachment-tile"
                aria-label={`Preview ${name}`}
              >
                {tile}
              </button>
            </DialogPrimitive.Trigger>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="study-chat-lightbox-overlay" />
              <DialogPrimitive.Content className="study-chat-lightbox" aria-describedby={undefined}>
                <DialogPrimitive.Title className="p-sr-only">Image preview</DialogPrimitive.Title>
                <ExpandedImage thumbnail={src} name={name} />
                <DialogPrimitive.Close
                  className="study-chat-lightbox-close"
                  aria-label="Close image preview"
                >
                  <X size={22} aria-hidden="true" />
                </DialogPrimitive.Close>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        ) : (
          <div
            className="study-chat-attachment-tile"
            role="group"
            aria-label={`${label} attachment ${name}`}
            title={image ? undefined : name}
          >
            {tile}
            {image && !previewFailed && !uploading && (
              <span className="p-sr-only">Loading preview</span>
            )}
          </div>
        )}
        {removable && (
          <Tooltip content={image ? "Remove image" : `Remove ${name}`}>
            <AttachmentPrimitive.Remove
              className="study-chat-attachment-remove"
              aria-label={`Remove ${name}`}
            >
              <X size={13} />
            </AttachmentPrimitive.Remove>
          </Tooltip>
        )}
        {removable && status.type === "requires-action" && (
          <span className="study-chat-upload-ready" role="status">
            Ready
          </span>
        )}
        {image && previewFailed && (
          <button type="button" className="study-chat-preview-retry" onClick={retry}>
            Retry preview
          </button>
        )}
      </AttachmentPrimitive.Root>
      {removable
        ? noticeTarget && uploadNotice && createPortal(uploadNotice, noticeTarget)
        : uploadNotice}
    </>
  );
}
