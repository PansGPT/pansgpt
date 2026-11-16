import type { ChatAttachmentReadRequest } from "@pansgpt/types";
import { z } from "zod";
import { env } from "@/env";
import { fetchWithRecovery } from "./chat-recovery";

/** Only typed owned identities reach the API; browser previews use temporary blob URLs. */
export async function readOwnedUpload(
  token: string | undefined,
  file: ChatAttachmentReadRequest,
  preview: boolean,
  signal: AbortSignal
): Promise<Blob> {
  if (!token) throw new Error("Sign in again to open this file.");
  if (
    !z.uuid().safeParse(file.session_id).success ||
    !z.uuid().safeParse(file.attachment_id).success
  )
    throw new Error("This file is unavailable.");
  const endpoint = preview ? "preview?size=large" : "download";
  const response = await fetchWithRecovery(
    `${env.NEXT_PUBLIC_API_URL}/api/v1/ai/chat/sessions/${encodeURIComponent(file.session_id)}/attachments/${encodeURIComponent(file.attachment_id)}/${endpoint}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal,
      cache: "no-store",
    }
  );
  if (!response.ok)
    throw new Error(
      response.status === 404
        ? "This file is unavailable."
        : "Couldn't open this file. Please try again."
    );
  if (preview && response.headers.get("content-type")?.split(";")[0] !== "image/png")
    throw new Error("Couldn't preview this image. Please try again.");
  const blob = await response.blob();
  if (!blob.size || blob.size > 10 * 1024 * 1024) throw new Error("This file is unavailable.");
  return blob;
}
