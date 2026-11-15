import assert from "node:assert/strict";
import test from "node:test";
import { proxySettings } from "../lib/settings-proxy.ts";
import {
  feedbackRequestId,
  SettingsError,
  submitFeedback,
  updateAccountPassword,
  listAccountSessions,
  listFeedbackHistory,
  listOwnedUploads,
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

test("account proxy allows GET feedback and uploads and forwards safelisted pagination params", async () => {
  let feedbackReceived;
  await proxySettings(
    new Request("https://app.example.invalid?limit=25&offset=50&evil=true", { headers }),
    ["feedback"],
    config,
    async (url, options) => {
      feedbackReceived = { url, options };
      return Response.json({ tickets: [], next_offset: null });
    }
  );
  assert.equal(
    feedbackReceived.url.href,
    "https://api.example.invalid/api/v1/settings/feedback?limit=25&offset=50"
  );
  assert.equal(feedbackReceived.url.searchParams.has("evil"), false);

  let uploadsReceived;
  await proxySettings(
    new Request("https://app.example.invalid?limit=10&offset=0", { headers }),
    ["uploads"],
    config,
    async (url, options) => {
      uploadsReceived = { url, options };
      return Response.json({ attachments: [], next_offset: null });
    }
  );
  assert.equal(
    uploadsReceived.url.href,
    "https://api.example.invalid/api/v1/settings/uploads?limit=10&offset=0"
  );
});

test("listFeedbackHistory and listOwnedUploads parse typed API responses", async (t) => {
  const ticketId = "01900000-0000-7000-8000-000000000001";
  t.mock.method(globalThis, "fetch", async (url) => {
    if (url.includes("feedback")) {
      return Response.json({
        tickets: [
          {
            id: ticketId,
            category: "bug",
            subject: "Feedback: bug",
            status: "open",
            created_at: "2026-11-15T12:00:00Z",
            updated_at: "2026-11-15T12:00:00Z",
            first_message: "Sample bug report",
          },
        ],
        next_offset: null,
      });
    }
    if (url.includes("uploads")) {
      return Response.json({
        attachments: [
          {
            id: "01900000-0000-7000-8000-000000000002",
            name: "prescription.pdf",
            content_type: "application/pdf",
            size: 10240,
            created_at: "2026-11-15T12:00:00Z",
            session_id: "01900000-0000-7000-8000-000000000003",
            in_use: false,
          },
        ],
        next_offset: null,
      });
    }
    return Response.json({}, { status: 404 });
  });

  const feedbackRes = await listFeedbackHistory("token", 0, new AbortController().signal);
  assert.equal(feedbackRes.tickets.length, 1);
  assert.equal(feedbackRes.tickets[0].id, ticketId);
  assert.equal(feedbackRes.tickets[0].first_message, "Sample bug report");

  const uploadsRes = await listOwnedUploads("token", 0, new AbortController().signal);
  assert.equal(uploadsRes.attachments.length, 1);
  assert.equal(uploadsRes.attachments[0].name, "prescription.pdf");
  assert.equal(uploadsRes.attachments[0].in_use, false);
});
