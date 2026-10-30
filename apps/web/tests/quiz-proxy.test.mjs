import test from "node:test";
import assert from "node:assert/strict";
import { proxyQuiz } from "../lib/quiz-proxy.ts";

const config = { apiUrl: "https://api.example.test", apiKey: "server-only-test-key" };
const id = "00000000-0000-4000-8000-000000000001";
test("quiz retry stays owner-authenticated and targets the same request", async () => {
  let target;
  const response = await proxyQuiz(
    new Request("http://localhost", {
      method: "POST",
      headers: { Authorization: "Bearer student-token" },
    }),
    ["jobs", id, "retry"],
    config,
    async (url) => {
      target = String(url);
      return Response.json({ status: "queued" });
    }
  );
  assert.equal(response.status, 200);
  assert.equal(target, `https://api.example.test/api/v1/quiz/jobs/${id}/retry`);
  assert.equal(
    (
      await proxyQuiz(
        new Request("http://localhost", { method: "POST" }),
        ["jobs", id, "retry"],
        config
      )
    ).status,
    401
  );
});
test("quiz proxy adds server identity and preserves the student's bearer identity", async () => {
  let received;
  const request = new Request(
    "http://localhost/api/quiz/history?offset=20&course=PCL%20401&url=https://evil.test",
    { headers: { Authorization: "Bearer student-token", "X-API-Key": "forged-client-key" } }
  );
  const response = await proxyQuiz(request, ["history"], config, async (url, options) => {
    received = { url: String(url), options };
    return Response.json({ items: [] });
  });
  assert.equal(response.status, 200);
  assert.equal(received.options.headers["X-API-Key"], config.apiKey);
  assert.equal(received.options.headers.Authorization, "Bearer student-token");
  assert.equal(
    received.url,
    "https://api.example.test/api/v1/quiz/history?offset=20&course=PCL+401"
  );
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("x-api-key"), null);
});
test("quiz proxy rejects traversal, unapproved routes, missing user identity and missing server configuration", async () => {
  const transport = () => {
    throw Error("must not reach network");
  };
  for (const path of [["..", "admin"], ["jobs%2f.."], ["https:", "evil.test"], ["users"]])
    assert.equal(
      (await proxyQuiz(new Request("http://localhost"), path, config, transport)).status,
      404
    );
  assert.equal(
    (await proxyQuiz(new Request("http://localhost"), ["history"], config, transport)).status,
    401
  );
  assert.equal(
    (
      await proxyQuiz(
        new Request("http://localhost"),
        ["history"],
        { apiUrl: config.apiUrl },
        transport
      )
    ).status,
    503
  );
});
test("quiz proxy bounds incoming answer bodies before forwarding", async () => {
  let calls = 0;
  const request = new Request("http://localhost", {
    method: "PUT",
    headers: { Authorization: "Bearer student-token" },
    body: "x".repeat(524289),
  });
  const response = await proxyQuiz(request, ["attempts", id, "answers"], config, async () => {
    calls++;
    return Response.json({});
  });
  assert.equal(response.status, 413);
  assert.equal(calls, 0);
});
test("public share capability travels in the body and upstream failures remain safe", async () => {
  const token = "synthetic-capability-token-not-a-user-session";
  let body;
  const response = await proxyQuiz(
    new Request("http://localhost/api/quiz/shared", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
    ["shared"],
    config,
    async (url, options) => {
      assert.equal(String(url), "https://api.example.test/api/v1/quiz/shared");
      body = await options.body.text();
      return Response.json({ percentage: 80 });
    }
  );
  assert.equal(response.status, 200);
  assert.equal(JSON.parse(body).token, token);
  const failure = await proxyQuiz(
    new Request("http://localhost", { headers: { Authorization: "Bearer student-token" } }),
    ["history"],
    config,
    async () => {
      throw Error("secret database details");
    }
  );
  assert.equal(failure.status, 503);
  assert.doesNotMatch(await failure.text(), /secret database/);
});
