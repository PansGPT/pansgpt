import assert from "node:assert/strict";
import test from "node:test";
import { fetchOAuthProviders } from "../lib/supabase/oauth-providers.ts";

test("provider discovery distinguishes configured options, failures and cancellation", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  await t.test("only explicitly enabled supported providers are returned", async () => {
    globalThis.fetch = async (_url, options) => {
      assert.equal(options.cache, "no-store");
      assert.equal(options.headers.apikey, "synthetic-public-key");
      assert.ok(options.signal instanceof AbortSignal);
      return Response.json({ external: { google: true, apple: false, github: true } });
    };
    assert.deepEqual(await fetchOAuthProviders("https://example.invalid", "synthetic-public-key"), [
      "google",
    ]);
    globalThis.fetch = async () => Response.json({ external: { google: false, apple: false } });
    assert.deepEqual(
      await fetchOAuthProviders("https://example.invalid", "synthetic-public-key"),
      []
    );
  });
  await t.test(
    "401, outages and malformed settings are errors, not disabled providers",
    async () => {
      for (const response of [
        new Response("Invalid API key", { status: 401 }),
        new Response("Unavailable", { status: 503 }),
        Response.json({}),
        Response.json({ external: [] }),
        Response.json({ external: null }),
      ]) {
        globalThis.fetch = async () => response;
        await assert.rejects(
          fetchOAuthProviders("https://example.invalid", "synthetic-public-key"),
          /Sign-in provider settings/
        );
      }
    }
  );
  await t.test("caller cancellation is preserved", async () => {
    const controller = new AbortController();
    controller.abort();
    globalThis.fetch = async (_url, { signal }) => {
      signal.throwIfAborted();
      throw new Error("Unreachable");
    };
    await assert.rejects(
      fetchOAuthProviders("https://example.invalid", "synthetic-public-key", controller.signal),
      { name: "AbortError" }
    );
  });
  await t.test("a stalled settings request has a bounded timeout", async () => {
    globalThis.fetch = async (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
    // Keep the event loop alive: AbortSignal.timeout itself uses an unreferenced timer.
    const keepAlive = setTimeout(() => {}, 5000);
    try {
      await assert.rejects(fetchOAuthProviders("https://example.invalid", "synthetic-public-key"), {
        name: "TimeoutError",
      });
    } finally {
      clearTimeout(keepAlive);
    }
  });
});
