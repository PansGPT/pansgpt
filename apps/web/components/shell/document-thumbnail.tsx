"use client";
import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { env } from "@/env";
import { readThumbnail, writeThumbnail } from "@/lib/document-thumbnail-cache";

export function DocumentThumbnail({
  documentId,
  revision = "v1",
}: {
  documentId?: string;
  revision?: string;
}): React.ReactElement {
  const { session, profile } = useAuth();
  const token = session?.access_token;
  const ownerId = profile?.id;
  const universityId = profile?.university_id;
  const authenticatedId = session?.user.id;
  const identity = `${ownerId}:${universityId}:${documentId}:${revision}`;
  const preview = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [image, setImage] = useState<{ key: string; url: string } | null>(null);
  const [failedDocument, setFailedDocument] = useState<string | null>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    });
    if (preview.current) observer.observe(preview.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (
      !documentId ||
      !token ||
      !visible ||
      !ownerId ||
      !universityId ||
      ownerId !== authenticatedId
    )
      return;
    const requestedId = documentId;
    const owner = { userId: ownerId, universityId };
    const controller = new AbortController();
    let objectUrl: string | null = null;
    let retryTimer: number | undefined;
    let retries = 0;
    function display(blob: Blob): void {
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob);
      setImage({ key: identity, url: objectUrl });
    }
    function load(): void {
      let retryable = true;
      void fetch(
        `${env.NEXT_PUBLIC_API_URL}/api/v1/library/${encodeURIComponent(requestedId)}/thumbnail`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
          cache: "no-store",
        }
      )
        .then(async (response) => {
          if (!response.ok) {
            retryable = response.status >= 500 || response.status === 429;
            throw new Error(`Preview request failed (${response.status})`);
          }
          if (response.headers.get("content-type")?.split(";")[0] !== "image/png") {
            retryable = false;
            throw new Error("Preview unavailable");
          }
          const blob = await response.blob();
          if (!controller.signal.aborted) {
            display(blob);
            void writeThumbnail(owner, requestedId, revision, blob, controller.signal);
          }
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          if (retryable && retries < 2) {
            retries += 1;
            retryTimer = window.setTimeout(load, 1500 * retries);
            return;
          }
          setFailedDocument(requestedId);
          console.warn("Document thumbnail could not load", requestedId, error);
        });
    }
    void readThumbnail(owner, requestedId, revision).then((cached) => {
      if (controller.signal.aborted) return;
      if (cached) display(cached);
      else load();
    });
    return () => {
      controller.abort();
      window.clearTimeout(retryTimer);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [documentId, token, visible, ownerId, universityId, authenticatedId, revision, identity]);
  return (
    <span className="dashboard-document-thumbnail" ref={preview} aria-hidden="true">
      {image?.key === identity && image ? (
        // Authenticated, temporary object URLs are rendered locally, not by an image proxy.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image.url} alt="" onError={() => setImage(null)} />
      ) : (
        <span className="dashboard-document-placeholder">
          <FileText size={26} />
          <span>
            {documentId
              ? failedDocument === documentId
                ? "Preview unavailable"
                : "Loading preview…"
              : "Sample document"}
          </span>
        </span>
      )}
    </span>
  );
}
