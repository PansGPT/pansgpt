import {
  invalidateLocalCache,
  notifyLocalCacheChange,
  withLocalCacheLock,
  type LocalCacheKind,
  type LocalCacheOwner,
} from "./local-cache-coordination.ts";

export type StorageOwner = LocalCacheOwner;
const prefixes = { pdf: "pansgpt-reader-pdfs-v1:", thumbnail: "pansgpt-document-thumbnails-v1:" };
export type StorageAvailability = "available" | "unavailable" | "private-browsing";
export interface StorageMeasurement {
  availability: StorageAvailability;
  pdfBytes: number;
  pdfDocumentCount: number;
  pdfEntryCount: number;
  thumbnailBytes: number;
  thumbnailCount: number;
  totalBytes: number;
}
export interface SavedPdfEntry {
  pathname: string;
  documentId: string;
  bytes: number;
  storedAt: number | null;
}
function name(kind: LocalCacheKind, owner: StorageOwner): string {
  return `${prefixes[kind]}${owner.userId}:${owner.universityId}`;
}
function documentKey(address: string): { pathname: string; documentId: string } | null {
  try {
    const { pathname } = new URL(address);
    const match = /^\/__private-reader-pdf\/([^/]+)$/.exec(pathname);
    return match?.[1] ? { pathname, documentId: decodeURIComponent(match[1]) } : null;
  } catch {
    return null;
  }
}
export async function probeStorageAvailability(): Promise<StorageAvailability> {
  if (typeof caches === "undefined") return "unavailable";
  try {
    await caches.keys();
    return "available";
  } catch {
    return "unavailable";
  } // A permission failure does not identify private browsing.
}
async function entries(kind: LocalCacheKind, owner: StorageOwner) {
  const cache = await caches.open(name(kind, owner));
  const result: { request: Request; bytes: number; storedAt: number | null }[] = [];
  for (const request of await cache.keys()) {
    const response = await cache.match(request);
    if (!response) continue;
    const raw = Number(response.headers.get("x-pansgpt-stored-at"));
    const storedAt = Number.isFinite(raw) && raw > 0 && raw <= Date.now() ? raw : null;
    result.push({ request, bytes: (await response.blob()).size, storedAt });
  }
  return result;
}
export async function measureOwnerStorage(owner: StorageOwner): Promise<StorageMeasurement> {
  const availability = await probeStorageAvailability();
  if (availability !== "available")
    return {
      availability,
      pdfBytes: 0,
      pdfDocumentCount: 0,
      pdfEntryCount: 0,
      thumbnailBytes: 0,
      thumbnailCount: 0,
      totalBytes: 0,
    };
  // Read failures propagate; expired entries still occupy physical bytes until removed.
  const [pdfs, thumbnails] = await Promise.all([
    entries("pdf", owner),
    entries("thumbnail", owner),
  ]);
  const pdfBytes = pdfs.reduce((total, entry) => total + entry.bytes, 0);
  const thumbnailBytes = thumbnails.reduce((total, entry) => total + entry.bytes, 0);
  return {
    availability,
    pdfBytes,
    thumbnailBytes,
    totalBytes: pdfBytes + thumbnailBytes,
    pdfEntryCount: pdfs.length,
    thumbnailCount: thumbnails.length,
    pdfDocumentCount: new Set(
      pdfs.map((entry) => documentKey(entry.request.url)?.pathname).filter(Boolean)
    ).size,
  };
}
export async function listOwnerPdfEntries(owner: StorageOwner): Promise<SavedPdfEntry[]> {
  if ((await probeStorageAvailability()) !== "available")
    throw new Error("Local storage is unavailable. Please retry.");
  const byPath = new Map<string, SavedPdfEntry>();
  for (const entry of await entries("pdf", owner)) {
    const key = documentKey(entry.request.url);
    if (!key) continue;
    const previous = byPath.get(key.pathname);
    byPath.set(key.pathname, {
      ...key,
      bytes: (previous?.bytes ?? 0) + entry.bytes,
      storedAt: Math.max(previous?.storedAt ?? 0, entry.storedAt ?? 0) || null,
    });
  }
  return [...byPath.values()].sort((a, b) => (b.storedAt ?? 0) - (a.storedAt ?? 0));
}
async function remove(
  kind: LocalCacheKind,
  owner: StorageOwner,
  documentId?: string
): Promise<number> {
  if (typeof caches === "undefined") throw new Error("Storage is unavailable on this device.");
  invalidateLocalCache(kind, owner);
  return withLocalCacheLock(kind, owner, async () => {
    const cache = await caches.open(name(kind, owner));
    let removed = 0;
    try {
      for (const request of await cache.keys()) {
        if (documentId !== undefined && documentKey(request.url)?.documentId !== documentId)
          continue;
        if (await cache.delete(request)) removed++;
        else if (await cache.match(request))
          throw new Error("Couldn't remove a local file. Please retry.");
      }
      return removed;
    } finally {
      notifyLocalCacheChange();
    }
  });
}
export async function removeOwnerPdfEntry(owner: StorageOwner, documentId: string): Promise<void> {
  await remove("pdf", owner, documentId);
}
export function removeAllOwnerPdfs(owner: StorageOwner): Promise<number> {
  return remove("pdf", owner);
}
export function clearOwnerThumbnailCache(owner: StorageOwner): Promise<number> {
  return remove("thumbnail", owner);
}
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
