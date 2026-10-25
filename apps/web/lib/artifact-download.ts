import type { ArtifactItem } from "./sse-parser";

const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const artifactKey = new RegExp(
  `^artifacts/${uuid}/${uuid}/(?:docs|pdf|pptx|md)/[a-z0-9_.-]+$`,
  "i"
);

/** Route generated files through the owner-authorized API, never a remote payload URL. */
export function artifactDownload(
  artifact: ArtifactItem,
  apiBase: string
): { url: string; filename: string } {
  const api = new URL(apiBase);
  let key = artifact.storage_key;
  if (!key && artifact.download_url) {
    const candidate = new URL(artifact.download_url, api);
    if (
      candidate.origin !== api.origin ||
      !["/api/v1/library/artifacts/download", "/api/v1/library/documents/download"].includes(
        candidate.pathname
      )
    )
      throw new Error("This file has no valid download location.");
    key = candidate.searchParams.get("key") ?? undefined;
  }
  if (!key || !artifactKey.test(key) || key.includes(".."))
    throw new Error("This file has no valid download location. Please generate it again.");
  const extension = key.split(".").at(-1)?.toLowerCase();
  if (!extension || !["docx", "pdf", "pptx", "md"].includes(extension))
    throw new Error("This file type cannot be downloaded.");
  const title =
    (artifact.title || "PansGPT Artifact")
      .replace(new RegExp(`\\.${extension}$`, "i"), "")
      .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, "_")
      .trim()
      .replace(/[. ]+$/, "")
      .slice(0, 160) || "PansGPT Artifact";
  const url = new URL("/api/v1/library/artifacts/download", api);
  url.searchParams.set("key", key);
  url.searchParams.set("filename", title);
  return { url: url.href, filename: `${title}.${extension}` };
}

export function artifactDownloadError(status: number): string {
  if (status === 401 || status === 403) return "Please sign in again to download this file.";
  if (status === 404)
    return "This file is unavailable. Retry, or ask PansGPT to generate it again.";
  return "The file could not be downloaded. Please retry in a moment.";
}
