const PREFIX = "pansgpt-document-thumbnails-v1:";
const MAX_ENTRIES = 96;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const writes = new Map<string, Promise<void>>();

export type ThumbnailOwner = { userId: string; universityId: string };

function cacheName(owner: ThumbnailOwner): string {
  return `${PREFIX}${owner.userId}:${owner.universityId}`;
}

function cacheKey(documentId: string, revision: string): string {
  const key = new URL(
    `/__private-document-thumbnail/${encodeURIComponent(documentId)}`,
    location.origin
  );
  key.searchParams.set("revision", revision);
  return key.href;
}

export async function readThumbnail(
  owner: ThumbnailOwner,
  documentId: string,
  revision: string
): Promise<Blob | null> {
  try {
    if (typeof caches === "undefined") return null;
    const cache = await caches.open(cacheName(owner));
    const key = cacheKey(documentId, revision);
    const response = await cache.match(key);
    if (!response) return null;
    const storedAt = Number(response.headers.get("x-pansgpt-stored-at"));
    if (!storedAt || Date.now() - storedAt >= MAX_AGE_MS) {
      await cache.delete(key);
      return null;
    }
    return await response.blob();
  } catch {
    return null;
  }
}

async function storeThumbnail(
  owner: ThumbnailOwner,
  documentId: string,
  revision: string,
  blob: Blob,
  signal: AbortSignal
): Promise<void> {
  try {
    if (typeof caches === "undefined" || signal.aborted) return;
    const cache = await caches.open(cacheName(owner));
    if (signal.aborted) return;
    const key = cacheKey(documentId, revision);
    const entries = await cache.keys();
    const pathname = new URL(key).pathname;
    // Remove old versions of this document and cap total disk use per account.
    for (const entry of entries)
      if (new URL(entry.url).pathname === pathname) await cache.delete(entry);
    const remaining = await cache.keys();
    for (const entry of remaining.slice(0, Math.max(0, remaining.length - MAX_ENTRIES + 1)))
      await cache.delete(entry);
    if (!signal.aborted)
      await cache.put(
        key,
        new Response(blob, {
          headers: { "content-type": "image/png", "x-pansgpt-stored-at": String(Date.now()) },
        })
      );
  } catch {
    // Cache quota/private-browsing failures must not prevent the actual preview.
  }
}

export async function writeThumbnail(
  owner: ThumbnailOwner,
  documentId: string,
  revision: string,
  blob: Blob,
  signal: AbortSignal
): Promise<void> {
  const name = cacheName(owner);
  const pending = (writes.get(name) ?? Promise.resolve()).then(() =>
    storeThumbnail(owner, documentId, revision, blob, signal)
  );
  writes.set(name, pending);
  try {
    await pending;
  } finally {
    if (writes.get(name) === pending) writes.delete(name);
  }
}

export async function clearThumbnailCaches(keep?: ThumbnailOwner): Promise<void> {
  try {
    if (typeof caches === "undefined") return;
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => name.startsWith(PREFIX) && name !== (keep ? cacheName(keep) : undefined))
        .map((name) => caches.delete(name))
    );
  } catch {
    // Storage availability must not block signing out.
  }
}
