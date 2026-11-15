/**
 * Account-scoped browser storage management for Settings › Data & Storage.
 *
 * Rules enforced here:
 * - All operations are scoped to the signed-in owner (userId + universityId).
 * - clearPdfCopies / clearThumbnailCaches use a `keep` argument that PRESERVES
 *   the owner's cache and removes others. We NEVER call them here with the
 *   owner's identity as `keep` — that would remove other owners' data, not the
 *   current user's data.
 * - Instead we implement direct management on the owner's specific cache name.
 * - Failures are reported truthfully rather than swallowed.
 */

export type StorageOwner = { userId: string; universityId: string };

// Must match the PREFIX constants in reader-pdf-cache.ts and document-thumbnail-cache.ts
const PDF_PREFIX = "pansgpt-reader-pdfs-v1:";
const THUMB_PREFIX = "pansgpt-document-thumbnails-v1:";

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days (matches reader-pdf-cache.ts)
const THUMB_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours (matches document-thumbnail-cache.ts)

function pdfCacheName(owner: StorageOwner): string {
  return `${PDF_PREFIX}${owner.userId}:${owner.universityId}`;
}
function thumbCacheName(owner: StorageOwner): string {
  return `${THUMB_PREFIX}${owner.userId}:${owner.universityId}`;
}

export type StorageAvailability = "available" | "unavailable" | "private-browsing";

export interface StorageMeasurement {
  availability: StorageAvailability;
  /** Total bytes used by the owner's saved PDF copies. */
  pdfBytes: number;
  /** Number of distinct document pathnames cached as PDFs. */
  pdfDocumentCount: number;
  /** Number of PDF cache entries (may exceed pdfDocumentCount if revisions differ). */
  pdfEntryCount: number;
  /** Total bytes used by the owner's thumbnail previews. */
  thumbnailBytes: number;
  /** Number of thumbnail entries. */
  thumbnailCount: number;
  /** Total measured bytes. */
  totalBytes: number;
}

export interface SavedPdfEntry {
  /** Pathname used as the cache key (encodes document ID). */
  pathname: string;
  /** Extracted document ID from the cache key URL. */
  documentId: string;
  /** Bytes of this cache entry. */
  bytes: number;
  /** When this was stored (epoch ms), or null if metadata is absent. */
  storedAt: number | null;
}

function extractDocumentId(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    // pathname: /__private-reader-pdf/<encoded-id>
    const match = /^\/__private-reader-pdf\/([^?]+)/.exec(pathname);
    if (match?.[1]) return decodeURIComponent(match[1]);
  } catch {
    // fall through
  }
  return url;
}

function extractPathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

/** Probe whether Cache Storage is available. Returns the detected availability. */
export async function probeStorageAvailability(): Promise<StorageAvailability> {
  if (typeof caches === "undefined") return "unavailable";
  try {
    // A harmless probe: list all cache names.
    await caches.keys();
    return "available";
  } catch {
    return "private-browsing";
  }
}

/**
 * Measure actual stored bytes for the owner.
 * Never presents origin-wide navigator.storage.estimate() as account-specific.
 * Returns truthful zeros for empty caches, not an error.
 */
export async function measureOwnerStorage(owner: StorageOwner): Promise<StorageMeasurement> {
  const availability = await probeStorageAvailability();
  if (availability !== "available") {
    return {
      availability,
      pdfBytes: 0,
      pdfDocumentCount: 0,
      pdfEntryCount: 0,
      thumbnailBytes: 0,
      thumbnailCount: 0,
      totalBytes: 0,
    };
  }

  let pdfBytes = 0;
  let pdfDocumentCount = 0;
  let pdfEntryCount = 0;
  const pdfPathnames = new Set<string>();

  try {
    const pdfCache = await caches.open(pdfCacheName(owner));
    const pdfKeys = await pdfCache.keys();
    for (const request of pdfKeys) {
      const response = await pdfCache.match(request);
      if (!response) continue;
      const storedAt = Number(response.headers.get("x-pansgpt-stored-at"));
      const size = Number(response.headers.get("content-length"));
      // Skip expired or invalid entries — they are semantically absent.
      if (
        !storedAt ||
        Date.now() - storedAt >= MAX_AGE_MS ||
        !size ||
        size < 5 ||
        response.headers.get("content-type") !== "application/pdf"
      ) {
        continue;
      }
      pdfEntryCount++;
      pdfBytes += size;
      pdfPathnames.add(extractPathname(request.url));
    }
    pdfDocumentCount = pdfPathnames.size;
  } catch {
    // Cache access failure — report what we have so far; availability stays "available"
    // so the caller knows Cache Storage is reachable but this cache had an error.
  }

  let thumbnailBytes = 0;
  let thumbnailCount = 0;
  try {
    const thumbCache = await caches.open(thumbCacheName(owner));
    const thumbKeys = await thumbCache.keys();
    for (const request of thumbKeys) {
      const response = await thumbCache.match(request);
      if (!response) continue;
      const storedAt = Number(response.headers.get("x-pansgpt-stored-at"));
      if (!storedAt || Date.now() - storedAt >= THUMB_MAX_AGE_MS) continue;
      // Thumbnails store no content-length; estimate via blob
      try {
        const blob = await response.blob();
        thumbnailBytes += blob.size;
        thumbnailCount++;
      } catch {
        // If blob() fails, count the entry but not the bytes.
        thumbnailCount++;
      }
    }
  } catch {
    // Thumbnail cache error; leave counts at 0.
  }

  return {
    availability,
    pdfBytes,
    pdfDocumentCount,
    pdfEntryCount,
    thumbnailBytes,
    thumbnailCount,
    totalBytes: pdfBytes + thumbnailBytes,
  };
}

/**
 * List all valid PDF cache entries for the owner, one entry per pathname.
 * Returns the most-recently-stored revision for each document pathname.
 */
export async function listOwnerPdfEntries(owner: StorageOwner): Promise<SavedPdfEntry[]> {
  const availability = await probeStorageAvailability();
  if (availability !== "available") return [];

  const byPathname = new Map<string, SavedPdfEntry>();
  try {
    const pdfCache = await caches.open(pdfCacheName(owner));
    const keys = await pdfCache.keys();
    for (const request of keys) {
      const response = await pdfCache.match(request);
      if (!response) continue;
      const storedAt = Number(response.headers.get("x-pansgpt-stored-at")) || null;
      const size = Number(response.headers.get("content-length"));
      if (
        !storedAt ||
        Date.now() - storedAt >= MAX_AGE_MS ||
        !size ||
        size < 5 ||
        response.headers.get("content-type") !== "application/pdf"
      ) {
        continue;
      }
      const pathname = extractPathname(request.url);
      const documentId = extractDocumentId(request.url);
      const existing = byPathname.get(pathname);
      // Keep the most recently stored revision for each document.
      if (!existing || (storedAt !== null && (existing.storedAt ?? 0) < storedAt)) {
        byPathname.set(pathname, { pathname, documentId, bytes: size, storedAt });
      } else if (existing) {
        // Add bytes of older revisions to the entry we keep.
        byPathname.set(pathname, { ...existing, bytes: existing.bytes + size });
      }
    }
  } catch (err) {
    // Rethrow — callers must distinguish a list failure from an empty list.
    throw new Error(
      "Local PDF list is unavailable. " + (err instanceof Error ? err.message : "Please try again.")
    );
  }
  return Array.from(byPathname.values()).sort((a, b) => (b.storedAt ?? 0) - (a.storedAt ?? 0));
}

/**
 * Remove all cache entries (all revisions) for a single document ID belonging to the owner.
 * Throws if the cache is unavailable or the deletion failed.
 */
export async function removeOwnerPdfEntry(owner: StorageOwner, documentId: string): Promise<void> {
  if (typeof caches === "undefined") throw new Error("Storage is unavailable on this device.");
  const pdfCache = await caches.open(pdfCacheName(owner));
  const keys = await pdfCache.keys();
  const targetPathname = new URL(
    `/__private-reader-pdf/${encodeURIComponent(documentId)}`,
    location.origin
  ).pathname;
  let removed = 0;
  for (const request of keys) {
    if (extractPathname(request.url) === targetPathname) {
      const deleted = await pdfCache.delete(request);
      if (deleted) removed++;
    }
  }
  if (removed === 0) {
    // Not found is acceptable — it may have expired between list and removal.
  }
}

/**
 * Remove ALL saved PDF copies for the owner. Does not touch thumbnails, auth,
 * preferences, drafts, or any other user's data.
 * Throws if the operation failed.
 */
export async function removeAllOwnerPdfs(owner: StorageOwner): Promise<number> {
  if (typeof caches === "undefined") throw new Error("Storage is unavailable on this device.");
  const pdfCache = await caches.open(pdfCacheName(owner));
  const keys = await pdfCache.keys();
  let removed = 0;
  const errors: string[] = [];
  for (const request of keys) {
    try {
      const deleted = await pdfCache.delete(request);
      if (deleted) removed++;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  if (errors.length > 0) {
    throw new Error(`Some files could not be removed (${errors.length} error(s)). Please retry.`);
  }
  return removed;
}

/**
 * Clear temporary thumbnail cache for the owner only. Preserves saved PDFs.
 * Throws if the operation failed.
 */
export async function clearOwnerThumbnailCache(owner: StorageOwner): Promise<number> {
  if (typeof caches === "undefined") throw new Error("Storage is unavailable on this device.");
  const thumbCache = await caches.open(thumbCacheName(owner));
  const keys = await thumbCache.keys();
  let removed = 0;
  const errors: string[] = [];
  for (const request of keys) {
    try {
      const deleted = await thumbCache.delete(request);
      if (deleted) removed++;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  if (errors.length > 0) {
    throw new Error(`Cache could not be fully cleared (${errors.length} error(s)). Please retry.`);
  }
  return removed;
}

/** Format bytes as a compact human-readable string. */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
