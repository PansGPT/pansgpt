import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  clearThumbnailCaches,
  readThumbnail,
  writeThumbnail,
} from "../lib/document-thumbnail-cache.ts";

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
const owner = { userId: "student-a", universityId: "university-a" };
const blob = new Blob(["synthetic preview bytes"], { type: "image/png" });
beforeEach(() => {
  globalThis.caches = new MemoryStorage();
  globalThis.location = { origin: "https://app.example.test" };
});
after(() => {
  if (previousCaches === undefined) delete globalThis.caches;
  else globalThis.caches = previousCaches;
  if (previousLocation === undefined) delete globalThis.location;
  else globalThis.location = previousLocation;
});
function save(id, revision = "v1", account = owner) {
  return writeThumbnail(account, id, revision, blob, new AbortController().signal);
}

test("a cached PNG is reusable only by its account, university and document revision", async () => {
  await save("document-a");
  assert.equal(
    await (await readThumbnail(owner, "document-a", "v1")).text(),
    "synthetic preview bytes"
  );
  assert.equal(await readThumbnail({ ...owner, userId: "student-b" }, "document-a", "v1"), null);
  assert.equal(
    await readThumbnail({ ...owner, universityId: "university-b" }, "document-a", "v1"),
    null
  );
  assert.equal(await readThumbnail(owner, "document-a", "v2"), null);
});

test("replacing a document revision removes its older cached image", async () => {
  await save("document-a", "v1");
  await save("document-a", "v2");
  assert.equal(await readThumbnail(owner, "document-a", "v1"), null);
  assert.ok(await readThumbnail(owner, "document-a", "v2"));
  const cache = await caches.open((await caches.keys())[0]);
  assert.equal((await cache.keys()).length, 1);
});

test("expired previews are discarded and concurrent writes respect the entry cap", async () => {
  await save("document-a");
  const cache = await caches.open((await caches.keys())[0]);
  const key = (await cache.keys())[0];
  const headers = { "x-pansgpt-stored-at": String(Date.now() - 25 * 3600000) };
  await cache.put(key, new Response(blob, { headers }));
  assert.equal(await readThumbnail(owner, "document-a", "v1"), null);
  await Promise.all(Array.from({ length: 100 }, (_, index) => save(`document-${index}`)));
  const keys = await cache.keys();
  assert.equal(keys.length, 96);
  assert.ok(keys.every((entry) => !entry.headers.has("authorization")));
});

test("account changes remove foreign caches and logout clears all thumbnail caches", async () => {
  await save("document-a");
  await save("document-b", "v1", { ...owner, userId: "student-b" });
  await caches.open("unrelated-app-cache");
  await clearThumbnailCaches(owner);
  assert.equal((await caches.keys()).length, 2);
  assert.ok(await readThumbnail(owner, "document-a", "v1"));
  await clearThumbnailCaches();
  assert.deepEqual(await caches.keys(), ["unrelated-app-cache"]);
});

test("cancelled writes and unavailable browser storage do not break loading", async () => {
  const controller = new AbortController();
  controller.abort();
  await writeThumbnail(owner, "document-a", "v1", blob, controller.signal);
  assert.deepEqual(await caches.keys(), []);
  globalThis.caches = {
    open: async () => {
      throw new Error("Storage blocked");
    },
  };
  assert.equal(await readThumbnail(owner, "document-a", "v1"), null);
  await save("document-a");
  await clearThumbnailCaches();
});
