import assert from "node:assert/strict";
import test from "node:test";
import { proxyGovernance } from "../lib/governance-proxy.ts";

const config = { apiUrl: "https://api.example.invalid", apiKey: "server-only-client-key" };
const authenticated = { Authorization: "Bearer synthetic.token.signature" };
test("administrative transport rejects unlisted paths and missing identity", async () => {
  for (const path of [
    ["..", "auth"],
    ["materials", "https://example.invalid"],
    ["users"],
    ["settings", "delete"],
  ])
    assert.equal(
      (await proxyGovernance(new Request("https://app.example.invalid/api"), path, config)).status,
      404
    );
  assert.equal(
    (await proxyGovernance(new Request("https://app.example.invalid/api"), ["identity"], config))
      .status,
    401
  );
  assert.equal(
    (
      await proxyGovernance(
        new Request("https://app.example.invalid/api", { headers: authenticated }),
        ["identity"],
        { apiUrl: config.apiUrl }
      )
    ).status,
    503
  );
});
test("administrative proxy forwards only fixed paths and documented queries", async () => {
  let received;
  const response = await proxyGovernance(
    new Request(
      "https://app.example.invalid/api?university_id=scope&search=clinical&destination=https://evil.invalid",
      { headers: authenticated }
    ),
    ["materials"],
    config,
    async (url, options) => {
      received = { url, options };
      return Response.json({ items: [] });
    }
  );
  assert.equal(response.status, 200);
  assert.equal(received.url.origin, "https://api.example.invalid");
  assert.equal(received.url.pathname, "/api/v1/governance/materials");
  assert.equal(received.url.searchParams.has("destination"), false);
  assert.equal(received.options.headers["X-API-Key"], config.apiKey);
  assert.equal(response.headers.has("X-API-Key"), false);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
});
test("file downloads preserve binary media and a safe upstream disposition", async () => {
  const id = "019a7b20-1000-7000-8000-000000000001";
  const response = await proxyGovernance(
    new Request("https://app.example.invalid/api", { headers: authenticated }),
    ["materials", id, "file"],
    config,
    async () =>
      new Response(new Uint8Array([37, 80, 68, 70]), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": "attachment; filename=synthetic.pdf",
        },
      })
  );
  assert.equal(response.headers.get("Content-Type"), "application/pdf");
  assert.match(response.headers.get("Content-Disposition"), /synthetic.pdf/);
  assert.equal(await response.text(), "%PDF");
});
test("oversized administrative bodies stop before reaching the API", async () => {
  let calls = 0;
  const response = await proxyGovernance(
    new Request("https://app.example.invalid/api", {
      method: "POST",
      headers: authenticated,
      body: "x".repeat(65537),
    }),
    ["students", "batch"],
    config,
    async () => {
      calls++;
      return Response.json({});
    }
  );
  assert.equal(response.status, 413);
  assert.equal(calls, 0);
});
test("network errors produce a retryable service response", async () => {
  const response = await proxyGovernance(
    new Request("https://app.example.invalid/api", { headers: authenticated }),
    ["identity"],
    config,
    async () => {
      throw new Error("synthetic upstream failure");
    }
  );
  assert.equal(response.status, 503);
  assert.doesNotMatch(JSON.stringify(await response.json()), /synthetic upstream failure/);
});
