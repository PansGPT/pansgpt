import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { storePdfCopy, readPdfCopy } from "../lib/reader-pdf-cache.ts";
import { writeThumbnail, readThumbnail } from "../lib/document-thumbnail-cache.ts";
import { localCacheEpoch } from "../lib/local-cache-coordination.ts";
import {
  measureOwnerStorage,
  listOwnerPdfEntries,
  removeOwnerPdfEntry,
  removeAllOwnerPdfs,
  clearOwnerThumbnailCache,
  formatBytes,
  probeStorageAvailability,
} from "../lib/storage-management.ts";

class MemoryCache {
  entries = new Map();
  async match(key) {
    const address = typeof key === "string" ? key : key.url;
    const entry = this.entries.get(address);
    return entry ? entry.clone() : undefined;
  }
  async put(key, response) {
    const address = typeof key === "string" ? key : key.url;
    this.entries.set(address, response.clone());
  }
  async delete(key) {
    const address = typeof key === "string" ? key : key.url;
    return this.entries.delete(address);
  }
  async keys() {
    return [...this.entries.keys()].map((key) => new Request(key));
  }
}

class MemoryStorage {
  entries = new Map();
  async open(name) {
    if (!this.entries.has(name)) this.entries.set(name, new MemoryCache());
    return this.entries.get(name);
  }
  async keys() {
    return [...this.entries.keys()];
  }
  async delete(name) {
    return this.entries.delete(name);
  }
}

const previousCaches = globalThis.caches;
const previousLocation = globalThis.location;

const ownerA = { userId: "user-1", universityId: "uni-1" };
const ownerB = { userId: "user-2", universityId: "uni-2" };

beforeEach(() => {
  globalThis.caches = new MemoryStorage();
  globalThis.location = { origin: "https://app.example.test" };
});

after(() => {
  globalThis.caches = previousCaches;
  globalThis.location = previousLocation;
});

function createPdfResponse(size = 1024, storedAt = Date.now()) {
  const content = "%PDF-" + "x".repeat(Math.max(0, size - 5));
  return new Response(new Blob([content], { type: "application/pdf" }), {
    headers: {
      "content-type": "application/pdf",
      "content-length": String(content.length),
      "x-pansgpt-stored-at": String(storedAt),
    },
  });
}

function createThumbResponse(storedAt = Date.now()) {
  const blob = new Blob(["PNG_SAMPLE_DATA"], { type: "image/png" });
  return new Response(blob, {
    headers: {
      "content-type": "image/png",
      "x-pansgpt-stored-at": String(storedAt),
    },
  });
}

test("formatBytes formats correctly across B, KB, MB, GB", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(500), "500 B");
  assert.equal(formatBytes(1024), "1.0 KB");
  assert.equal(formatBytes(1536), "1.5 KB");
  assert.equal(formatBytes(1024 * 1024), "1.0 MB");
  assert.equal(formatBytes(25 * 1024 * 1024), "25.0 MB");
  assert.equal(formatBytes(1.5 * 1024 * 1024 * 1024), "1.50 GB");
});

test("storage measurement returns truthful zero on empty cache without error", async () => {
  const m = await measureOwnerStorage(ownerA);
  assert.equal(m.availability, "available");
  assert.equal(m.pdfBytes, 0);
  assert.equal(m.pdfDocumentCount, 0);
  assert.equal(m.pdfEntryCount, 0);
  assert.equal(m.thumbnailBytes, 0);
  assert.equal(m.thumbnailCount, 0);
  assert.equal(m.totalBytes, 0);
});

test("storage measurement isolates accounts and universities", async () => {
  const cacheA = await globalThis.caches.open("pansgpt-reader-pdfs-v1:user-1:uni-1");
  await cacheA.put(
    "https://app.example.test/__private-reader-pdf/doc-1?revision=v1",
    createPdfResponse(2048)
  );

  const thumbCacheA = await globalThis.caches.open("pansgpt-document-thumbnails-v1:user-1:uni-1");
  await thumbCacheA.put(
    "https://app.example.test/__private-document-thumbnail/doc-1?revision=v1",
    createThumbResponse()
  );

  // Owner B should see zero
  const mB = await measureOwnerStorage(ownerB);
  assert.equal(mB.pdfBytes, 0);
  assert.equal(mB.pdfDocumentCount, 0);
  assert.equal(mB.thumbnailCount, 0);

  // Owner A should see exact measured bytes
  const mA = await measureOwnerStorage(ownerA);
  assert.equal(mA.pdfBytes, 2048);
  assert.equal(mA.pdfDocumentCount, 1);
  assert.equal(mA.pdfEntryCount, 1);
  assert.equal(mA.thumbnailCount, 1);
  assert.equal(mA.totalBytes > 2048, true);
});

test("stale and invalid entries still occupy measurable bytes and can be removed", async () => {
  const cacheA = await globalThis.caches.open("pansgpt-reader-pdfs-v1:user-1:uni-1");
  // Expired PDF (older than 30 days)
  const expiredTime = Date.now() - 31 * 24 * 60 * 60 * 1000;
  await cacheA.put(
    "https://app.example.test/__private-reader-pdf/doc-old?revision=v1",
    createPdfResponse(4096, expiredTime)
  );

  // Non-PDF content-type
  await cacheA.put(
    "https://app.example.test/__private-reader-pdf/doc-bad?revision=v1",
    new Response("not a pdf", {
      headers: {
        "content-type": "text/plain",
        "content-length": "9",
        "x-pansgpt-stored-at": String(Date.now()),
      },
    })
  );

  // Valid PDF
  await cacheA.put(
    "https://app.example.test/__private-reader-pdf/doc-valid?revision=v1",
    createPdfResponse(1024)
  );

  const m = await measureOwnerStorage(ownerA);
  assert.equal(m.pdfDocumentCount, 3);
  assert.equal(m.pdfBytes, 4096 + 9 + 1024);

  const list = await listOwnerPdfEntries(ownerA);
  assert.equal(list.length, 3);
  assert.equal(list.find((entry) => entry.documentId === "doc-valid").bytes, 1024);
  await removeAllOwnerPdfs(ownerA);
  assert.equal((await measureOwnerStorage(ownerA)).totalBytes, 0);
});

test("removeOwnerPdfEntry removes all revisions of target document only", async () => {
  const cache = await globalThis.caches.open("pansgpt-reader-pdfs-v1:user-1:uni-1");
  await cache.put(
    "https://app.example.test/__private-reader-pdf/doc-target?revision=v1",
    createPdfResponse(1024)
  );
  await cache.put(
    "https://app.example.test/__private-reader-pdf/doc-target?revision=v2",
    createPdfResponse(1024)
  );
  await cache.put(
    "https://app.example.test/__private-reader-pdf/doc-keep?revision=v1",
    createPdfResponse(2048)
  );

  await removeOwnerPdfEntry(ownerA, "doc-target");

  const list = await listOwnerPdfEntries(ownerA);
  assert.equal(list.length, 1);
  assert.equal(list[0].documentId, "doc-keep");
});

test("removeAllOwnerPdfs removes all owner PDFs while preserving thumbnails and other owners", async () => {
  const cacheA = await globalThis.caches.open("pansgpt-reader-pdfs-v1:user-1:uni-1");
  await cacheA.put(
    "https://app.example.test/__private-reader-pdf/doc-1?revision=v1",
    createPdfResponse(1024)
  );

  const thumbCacheA = await globalThis.caches.open("pansgpt-document-thumbnails-v1:user-1:uni-1");
  await thumbCacheA.put(
    "https://app.example.test/__private-document-thumbnail/doc-1?revision=v1",
    createThumbResponse()
  );

  const cacheB = await globalThis.caches.open("pansgpt-reader-pdfs-v1:user-2:uni-2");
  await cacheB.put(
    "https://app.example.test/__private-reader-pdf/doc-b?revision=v1",
    createPdfResponse(2048)
  );

  const removed = await removeAllOwnerPdfs(ownerA);
  assert.equal(removed, 1);

  // Owner A PDFs should be 0
  const listA = await listOwnerPdfEntries(ownerA);
  assert.equal(listA.length, 0);

  // Owner A thumbnails must remain intact
  const mA = await measureOwnerStorage(ownerA);
  assert.equal(mA.pdfBytes, 0);
  assert.equal(mA.thumbnailCount, 1);

  // Owner B must be completely untouched
  const listB = await listOwnerPdfEntries(ownerB);
  assert.equal(listB.length, 1);
});

test("clearOwnerThumbnailCache removes thumbnails only, preserving saved PDFs", async () => {
  const pdfCache = await globalThis.caches.open("pansgpt-reader-pdfs-v1:user-1:uni-1");
  await pdfCache.put(
    "https://app.example.test/__private-reader-pdf/doc-1?revision=v1",
    createPdfResponse(1024)
  );

  const thumbCache = await globalThis.caches.open("pansgpt-document-thumbnails-v1:user-1:uni-1");
  await thumbCache.put(
    "https://app.example.test/__private-document-thumbnail/doc-1?revision=v1",
    createThumbResponse()
  );

  const cleared = await clearOwnerThumbnailCache(ownerA);
  assert.equal(cleared, 1);

  const m = await measureOwnerStorage(ownerA);
  assert.equal(m.thumbnailCount, 0);
  assert.equal(m.thumbnailBytes, 0);
  assert.equal(m.pdfBytes, 1024);
  assert.equal(m.pdfDocumentCount, 1);
});

test("handles unavailable Cache Storage gracefully", async () => {
  delete globalThis.caches;
  const avail = await probeStorageAvailability();
  assert.equal(avail, "unavailable");

  const m = await measureOwnerStorage(ownerA);
  assert.equal(m.availability, "unavailable");
  assert.equal(m.totalBytes, 0);

  await assert.rejects(listOwnerPdfEntries(ownerA), /unavailable/);
});

test("cache read failures do not become successful zero measurements", async () => {
  globalThis.caches.open = async () => {
    throw new Error("denied");
  };
  await assert.rejects(measureOwnerStorage(ownerA), /denied/);
});

test("measurement uses bytes rather than an untrusted size header and sums every revision", async () => {
  const cache = await caches.open("pansgpt-reader-pdfs-v1:user-1:uni-1");
  const response = createPdfResponse(17);
  response.headers.set("content-length", "NaN");
  await cache.put("https://app.example.test/__private-reader-pdf/doc?revision=new", response);
  await cache.put(
    "https://app.example.test/__private-reader-pdf/doc?revision=old",
    createPdfResponse(31, Date.now() - 1000)
  );
  assert.equal((await measureOwnerStorage(ownerA)).pdfBytes, 48);
  assert.equal((await listOwnerPdfEntries(ownerA))[0].bytes, 48);
});

test("a download started before removal cannot recreate an owned PDF or thumbnail", async () => {
  const pdfEpoch = localCacheEpoch("pdf", ownerA);
  const thumbEpoch = localCacheEpoch("thumbnail", ownerA);
  await removeAllOwnerPdfs(ownerA);
  await clearOwnerThumbnailCache(ownerA);
  const signal = new AbortController().signal;
  await storePdfCopy(ownerA, "doc", "v1", new Blob(["%PDF-synthetic"]), signal, pdfEpoch);
  await writeThumbnail(ownerA, "doc", "v1", new Blob(["image"]), signal, thumbEpoch);
  assert.equal(await readPdfCopy(ownerA, "doc", "v1"), null);
  assert.equal(await readThumbnail(ownerA, "doc", "v1"), null);
  await storePdfCopy(ownerA, "doc", "v1", new Blob(["%PDF-synthetic"]), signal);
  assert.ok(await readPdfCopy(ownerA, "doc", "v1"));
});

test("removal waits for an active write and leaves no resurrected PDF", async () => {
  const cache = await caches.open("pansgpt-reader-pdfs-v1:user-1:uni-1");
  let release, started;
  const barrier = new Promise((resolve) => {
    release = resolve;
  });
  const writing = new Promise((resolve) => {
    started = resolve;
  });
  const put = cache.put.bind(cache);
  cache.put = async (...args) => {
    started();
    await barrier;
    return put(...args);
  };
  const write = storePdfCopy(
    ownerA,
    "doc",
    "v1",
    new Blob(["%PDF-synthetic"]),
    new AbortController().signal
  );
  await writing;
  const removal = removeAllOwnerPdfs(ownerA);
  release();
  await Promise.all([write, removal]);
  assert.equal((await measureOwnerStorage(ownerA)).pdfBytes, 0);
});

test("a failed delete is not reported as a successful removal", async () => {
  const cache = await caches.open("pansgpt-reader-pdfs-v1:user-1:uni-1");
  await cache.put("https://app.example.test/__private-reader-pdf/doc", createPdfResponse());
  cache.delete = async () => false;
  await assert.rejects(removeOwnerPdfEntry(ownerA, "doc"), /Couldn't remove/);
});
