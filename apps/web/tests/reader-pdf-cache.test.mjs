import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  clearPdfCopies,
  readPdfCopy,
  storePdfCopy,
  discardPdfCopy,
  downloadPdfCopy,
  MAX_CACHED_PDF_BYTES,
} from "../lib/reader-pdf-cache.ts";
// Generic Cache Storage stand-in; the browser preview also exercises the real API.
class MemoryCache {
  entries = new Map();
  async match(key) {
    return this.entries.get(typeof key === "string" ? key : key.url)?.clone();
  }
  async put(key, response) {
    this.entries.set(typeof key === "string" ? key : key.url, response.clone());
  }
  async delete(key) {
    return this.entries.delete(typeof key === "string" ? key : key.url);
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
const previousFetch = globalThis.fetch;
const owner = { userId: "student-a", universityId: "university-a" };
const pdf = new Blob(["%PDF-synthetic interface sample"], { type: "application/pdf" });
beforeEach(() => {
  globalThis.caches = new MemoryStorage();
  globalThis.location = { origin: "https://app.example.test" };
  globalThis.fetch = previousFetch;
});
after(() => {
  globalThis.caches = previousCaches;
  globalThis.location = previousLocation;
  globalThis.fetch = previousFetch;
});
const save = (id, revision = "v1", account = owner) =>
  storePdfCopy(account, id, revision, pdf, new AbortController().signal);

test("PDF copies are isolated by account, university and document revision", async () => {
  await save("document-a");
  assert.equal(await (await readPdfCopy(owner, "document-a", "v1")).text(), await pdf.text());
  assert.equal(await readPdfCopy({ ...owner, userId: "student-b" }, "document-a", "v1"), null);
  assert.equal(
    await readPdfCopy({ ...owner, universityId: "university-b" }, "document-a", "v1"),
    null
  );
  assert.equal(await readPdfCopy(owner, "document-a", "v2"), null);
  await save("document-a", "v2");
  assert.equal(await readPdfCopy(owner, "document-a", "v1"), null);
});
test("corrupt, expired and revoked PDF copies are discarded", async () => {
  await save("document-a");
  const cache = await caches.open((await caches.keys())[0]);
  const address = (await cache.keys())[0];
  await cache.put(
    address,
    new Response("invalid", {
      headers: {
        "content-type": "application/pdf",
        "content-length": "7",
        "x-pansgpt-stored-at": String(Date.now()),
      },
    })
  );
  assert.equal(await readPdfCopy(owner, "document-a", "v1"), null);
  await save("document-a");
  await cache.put(
    address,
    new Response(pdf, {
      headers: {
        "content-type": "application/pdf",
        "content-length": String(pdf.size),
        "x-pansgpt-stored-at": String(Date.now() - 31 * 86400000),
      },
    })
  );
  assert.equal(await readPdfCopy(owner, "document-a", "v1"), null);
  await save("document-a");
  await discardPdfCopy(owner, "document-a");
  assert.equal(await readPdfCopy(owner, "document-a", "v1"), null);
});
test("concurrent stores are bounded and never persist bearer tokens or signed URLs", async () => {
  await Promise.all(Array.from({ length: 15 }, (_, i) => save(`document-${i}`)));
  const cache = await caches.open((await caches.keys())[0]);
  const entries = await cache.keys();
  assert.equal(entries.length, 12);
  assert.ok(
    entries.every((entry) => !entry.headers.has("authorization") && !entry.url.includes("token="))
  );
});
test("logout and account change remove private PDFs without affecting other app caches", async () => {
  await save("document-a");
  await save("document-b", "v1", { ...owner, userId: "student-b" });
  await caches.open("other-cache");
  await clearPdfCopies(owner);
  assert.ok(await readPdfCopy(owner, "document-a", "v1"));
  assert.equal((await caches.keys()).length, 2);
  await clearPdfCopies();
  assert.deepEqual(await caches.keys(), ["other-cache"]);
});
test("the total byte budget evicts old copies before the entry limit", async () => {
  await save("seed");
  const cache = await caches.open((await caches.keys())[0]);
  await discardPdfCopy(owner, "seed");
  for (let i = 0; i < 6; i++) {
    await cache.put(
      `https://app.example.test/__private-reader-pdf/old-${i}?revision=v1`,
      new Response(pdf, {
        headers: {
          "content-type": "application/pdf",
          "content-length": String(MAX_CACHED_PDF_BYTES),
          "x-pansgpt-stored-at": String(Date.now() - (10 - i) * 1000),
        },
      })
    );
  }
  await save("new");
  const entries = await cache.keys();
  assert.equal(entries.length, 6);
  assert.ok(entries.every((entry) => !entry.url.includes("old-0")));
  assert.ok(await readPdfCopy(owner, "new", "v1"));
});
test("logout waits for in-flight disk writes and removes their result", async () => {
  await save("seed");
  const cache = await caches.open((await caches.keys())[0]);
  const put = cache.put.bind(cache);
  let release;
  let started;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const writing = new Promise((resolve) => {
    started = resolve;
  });
  cache.put = async (...args) => {
    started();
    await gate;
    await put(...args);
  };
  const pending = save("late");
  await writing;
  const clearing = clearPdfCopies();
  release();
  await Promise.all([pending, clearing]);
  assert.deepEqual(await caches.keys(), []);
});
test("cancelled writes, quota errors and unavailable disk do not block reading", async () => {
  const signal = AbortSignal.abort();
  await storePdfCopy(owner, "document-a", "v1", pdf, signal);
  assert.deepEqual(await caches.keys(), []);
  globalThis.caches = {
    open: async () => {
      throw new Error("Storage blocked");
    },
    keys: async () => [],
  };
  assert.equal(await readPdfCopy(owner, "document-a", "v1"), null);
  await save("document-a");
  await clearPdfCopies();
});
test("large downloads stop before reading their body and keep range loading available", async () => {
  const stream = new ReadableStream(
    {
      pull() {
        throw new Error("Must not read an oversized body");
      },
    },
    { highWaterMark: 0 }
  );
  globalThis.fetch = async () =>
    new Response(stream, { headers: { "content-length": String(MAX_CACHED_PDF_BYTES + 1) } });
  assert.equal(
    await downloadPdfCopy("https://files.example.test/pdf", new AbortController().signal),
    null
  );
});
test("PDF download validates bytes and sends bearer tokens only when explicitly using the API", async () => {
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return new Response(pdf);
  };
  await downloadPdfCopy("https://files.example.test/pdf", new AbortController().signal);
  await downloadPdfCopy(
    "https://api.example.test/pdf",
    new AbortController().signal,
    "synthetic-token"
  );
  assert.equal(requests[0].options.headers, undefined);
  assert.equal(requests[1].options.headers.Authorization, "Bearer synthetic-token");
  globalThis.fetch = async () => new Response(pdf, { status: 206 });
  await assert.rejects(
    downloadPdfCopy("https://files.example.test/pdf", new AbortController().signal)
  );
  globalThis.fetch = async () => new Response("not a PDF");
  await assert.rejects(
    downloadPdfCopy("https://files.example.test/pdf", new AbortController().signal)
  );
});
