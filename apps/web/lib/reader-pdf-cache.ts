/** Private, bounded browser-disk copies; callers must verify current document access first. */
import {
  localCacheEpoch,
  notifyLocalCacheChange,
  withLocalCacheLock,
} from "./local-cache-coordination.ts";
export type PdfOwner = { userId: string; universityId: string };
export const MAX_CACHED_PDF_BYTES = 50 * 1024 * 1024;
const PREFIX = "pansgpt-reader-pdfs-v1:";
const MAX_BYTES = 256 * 1024 * 1024;
const MAX_ENTRIES = 12;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const writes = new Map<string, Promise<void>>();
let generation = 0;

function name(owner: PdfOwner): string {
  return `${PREFIX}${owner.userId}:${owner.universityId}`;
}
function key(documentId: string, revision: string): string {
  const value = new URL(`/__private-reader-pdf/${encodeURIComponent(documentId)}`, location.origin);
  value.searchParams.set("revision", revision);
  return value.href;
}

export async function readPdfCopy(
  owner: PdfOwner,
  documentId: string,
  revision: string
): Promise<Blob | null> {
  try {
    if (typeof caches === "undefined") return null;
    const cache = await caches.open(name(owner));
    const address = key(documentId, revision);
    const response = await cache.match(address);
    if (!response) return null;
    const stored = Number(response.headers.get("x-pansgpt-stored-at"));
    const size = Number(response.headers.get("content-length"));
    if (
      !stored ||
      Date.now() - stored >= MAX_AGE_MS ||
      size < 5 ||
      size > MAX_CACHED_PDF_BYTES ||
      response.headers.get("content-type") !== "application/pdf"
    ) {
      await cache.delete(address);
      return null;
    }
    const blob = await response.blob();
    if (blob.size !== size || (await blob.slice(0, 5).text()) !== "%PDF-") {
      await cache.delete(address);
      return null;
    }
    return blob;
  } catch {
    return null;
  }
}

export async function discardPdfCopy(owner: PdfOwner, documentId: string): Promise<void> {
  try {
    if (typeof caches === "undefined") return;
    const cache = await caches.open(name(owner));
    const pathname = new URL(key(documentId, "")).pathname;
    for (const entry of await cache.keys())
      if (new URL(entry.url).pathname === pathname) await cache.delete(entry);
  } catch {
    /* Storage failures never prevent reading or access revocation. */
  }
}

export async function storePdfCopy(
  owner: PdfOwner,
  documentId: string,
  revision: string,
  blob: Blob,
  signal: AbortSignal,
  cacheEpoch = localCacheEpoch("pdf", owner)
): Promise<void> {
  const epoch = generation;
  const cacheName = name(owner);
  const pending = (writes.get(cacheName) ?? Promise.resolve()).then(() =>
    withLocalCacheLock("pdf", owner, async () => {
      try {
        if (
          typeof caches === "undefined" ||
          signal.aborted ||
          epoch !== generation ||
          cacheEpoch === null ||
          cacheEpoch !== localCacheEpoch("pdf", owner) ||
          blob.size < 5 ||
          blob.size > MAX_CACHED_PDF_BYTES
        )
          return;
        if ((await blob.slice(0, 5).text()) !== "%PDF-") return;
        const cache = await caches.open(cacheName);
        const address = key(documentId, revision);
        const pathname = new URL(address).pathname;
        const keep: { request: Request; bytes: number; stored: number }[] = [];
        for (const request of await cache.keys()) {
          const response = await cache.match(request);
          const stored = Number(response?.headers.get("x-pansgpt-stored-at"));
          const bytes = Number(response?.headers.get("content-length"));
          if (
            new URL(request.url).pathname === pathname ||
            !stored ||
            Date.now() - stored >= MAX_AGE_MS ||
            !bytes ||
            bytes > MAX_CACHED_PDF_BYTES
          )
            await cache.delete(request);
          else keep.push({ request, bytes, stored });
        }
        keep.sort((a, b) => a.stored - b.stored);
        let bytes = keep.reduce((sum, entry) => sum + entry.bytes, blob.size);
        while (keep.length >= MAX_ENTRIES || bytes > MAX_BYTES) {
          const oldest = keep.shift();
          if (!oldest) break;
          bytes -= oldest.bytes;
          await cache.delete(oldest.request);
        }
        if (signal.aborted || epoch !== generation || cacheEpoch !== localCacheEpoch("pdf", owner))
          return;
        await cache.put(
          address,
          new Response(blob, {
            headers: {
              "content-type": "application/pdf",
              "content-length": String(blob.size),
              "cache-control": "private",
              "x-pansgpt-stored-at": String(Date.now()),
            },
          })
        );
        if (signal.aborted || epoch !== generation || cacheEpoch !== localCacheEpoch("pdf", owner))
          await cache.delete(address);
        notifyLocalCacheChange();
      } catch {
        /* Quota/private-browsing errors leave normal network reading available. */
      }
    })
  );
  writes.set(cacheName, pending);
  try {
    await pending;
  } finally {
    if (writes.get(cacheName) === pending) writes.delete(cacheName);
  }
}

export async function clearPdfCopies(keep?: PdfOwner): Promise<void> {
  generation++;
  await Promise.allSettled([...writes.values()]);
  try {
    if (typeof caches === "undefined") return;
    for (const cacheName of await caches.keys())
      if (cacheName.startsWith(PREFIX) && cacheName !== (keep ? name(keep) : undefined))
        await caches.delete(cacheName);
  } catch {
    /* Signing out must succeed even if disk storage is unavailable. */
  }
}

/** A full download is used only within the disk-cache budget; larger PDFs keep range loading. */
export async function downloadPdfCopy(
  url: string,
  signal: AbortSignal,
  token?: string
): Promise<Uint8Array | null> {
  const response = await fetch(url, {
    signal,
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (response.status !== 200) throw new Error("The PDF file couldn’t be loaded. Please retry.");
  if (Number(response.headers.get("content-length")) > MAX_CACHED_PDF_BYTES) {
    await response.body?.cancel();
    return null;
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("The PDF download was interrupted. Please retry.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > MAX_CACHED_PDF_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-")
    throw new Error("This file isn’t a readable PDF.");
  return bytes;
}
