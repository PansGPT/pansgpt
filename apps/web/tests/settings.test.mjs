import assert from "node:assert/strict";
import test from "node:test";
import { proxySettings } from "../lib/settings-proxy.ts";
import {
  feedbackRequestId,
  SettingsError,
  submitFeedback,
  updateAccountPassword,
  listAccountSessions,
} from "../lib/settings.ts";

const config = { apiUrl: "https://api.example.invalid", apiKey: "synthetic-server-key" };
const headers = { Authorization: "Bearer synthetic.token.signature" };

test("account proxy rejects unknown paths, missing identity and absent server keys", async () => {
  for (const path of [
    ["..", "user"],
    ["sessions", "https://evil.invalid"],
    ["password", "other"],
  ])
    assert.equal(
      (await proxySettings(new Request("https://app.example.invalid"), path, config)).status,
      404
    );
  assert.equal(
    (await proxySettings(new Request("https://app.example.invalid"), ["sessions"], config)).status,
    401
  );
  assert.equal(
    (
      await proxySettings(new Request("https://app.example.invalid", { headers }), ["sessions"], {
        apiUrl: config.apiUrl,
      })
    ).status,
    503
  );
});
test("account proxy preserves captured identity, bounds destinations and keeps responses private", async () => {
  let received;
  const response = await proxySettings(
    new Request("https://app.example.invalid?user_id=foreign&destination=evil", {
      headers: { ...headers, "X-API-Key": "untrusted", Cookie: "private" },
    }),
    ["sessions"],
    config,
    async (url, options) => {
      received = { url, options };
      return Response.json(
        { sessions: [], has_more: false },
        { headers: { "Set-Cookie": "upstream-private", "Retry-After": "30" } }
      );
    }
  );
  assert.equal(received.url.href, "https://api.example.invalid/api/v1/settings/sessions");
  assert.deepEqual(received.options.headers, {
    ...headers,
    "X-API-Key": config.apiKey,
    "Content-Type": "application/json",
  });
  assert.equal(received.options.redirect, "error");
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("Retry-After"), "30");
  assert.equal(response.headers.has("Set-Cookie"), false);
  assert.equal(response.headers.has("X-API-Key"), false);
});
test("oversized account bodies stop before transport and failed writes are never automatically retried", async () => {
  let calls = 0;
  const transport = async () => {
    calls++;
    throw new Error("PRIVATE INFRASTRUCTURE DETAIL");
  };
  assert.equal(
    (
      await proxySettings(
        new Request("https://app.example.invalid", {
          method: "PUT",
          headers,
          body: "x".repeat(20001),
        }),
        ["password"],
        config,
        transport
      )
    ).status,
    413
  );
  assert.equal(calls, 0);
  const result = await proxySettings(
    new Request("https://app.example.invalid", {
      method: "PUT",
      headers,
      body: '{"password":"synthetic-password"}',
    }),
    ["password"],
    config,
    transport
  );
  assert.equal(calls, 1);
  assert.equal(result.status, 503);
  assert.doesNotMatch(await result.text(), /PRIVATE|synthetic-password/);
});
test("feedback identities use version 7, the current timestamp and distinct random bits", () => {
  const before = Date.now();
  const ids = Array.from({ length: 100 }, feedbackRequestId);
  const after = Date.now();
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) {
    assert.match(id, /^[\da-f]{8}-[\da-f]{4}-7[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
    const timestamp = Number.parseInt(id.replaceAll("-", "").slice(0, 12), 16);
    assert.ok(timestamp >= before && timestamp <= after);
  }
});
test("password client normalizes untrusted errors, retains captured authorization and does not retry", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls++;
    assert.equal(url, "/api/settings/password");
    assert.equal(options.headers.Authorization, "Bearer captured-account-token");
    assert.deepEqual(JSON.parse(options.body), { password: "synthetic-password" });
    return Response.json(
      { detail: { code: "UNAVAILABLE", message: "PRIVATE PROVIDER DETAIL" } },
      { status: 503 }
    );
  });
  await assert.rejects(
    updateAccountPassword("captured-account-token", { password: "synthetic-password" }),
    (error) =>
      error instanceof SettingsError && error.message === "Something went wrong. Please try again."
  );
  assert.equal(calls, 1);
});
test("feedback requires a matching saved identity and malformed session responses fail closed", async (t) => {
  const id = feedbackRequestId();
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ id: feedbackRequestId(), status: "received" })
  );
  await assert.rejects(
    submitFeedback("token", {
      request_id: id,
      category: "other",
      description: "Synthetic feedback",
    }),
    SettingsError
  );
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ sessions: [{ id: "not-a-session", is_current: true }], has_more: false })
  );
  await assert.rejects(listAccountSessions("token", new AbortController().signal));
});
