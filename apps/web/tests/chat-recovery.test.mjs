import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  ChatFailure,
  publicFailure,
  failureFrom,
  responseFailure,
  fetchWithRecovery,
  retryDelay,
  waitForRetry,
} from "../lib/chat-recovery.ts";
import { applyChatEvent } from "../lib/chat-message.ts";
import { SSEEventStreamReader } from "../lib/sse-parser.ts";

const originalFetch = globalThis.fetch;

test("legacy provider failures offer Retry without bypassing tool replay protection", () => {
  assert.equal(publicFailure("PROVIDER_ERROR", "", false).retryable, true);
  const blocked = publicFailure("TOOL_RETRY_BLOCKED", "", false);
  assert.equal(blocked.retryable, false);
  assert.match(blocked.message, /send a new message/);
  assert.doesNotMatch(blocked.message, /generated|results/);
  assert.equal(publicFailure("403", "", false).retryable, false);
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("provider and browser diagnostics never become public response copy", () => {
  for (const code of [
    "TIMEOUT",
    "RETRIEVAL_TIMEOUT",
    "AI_ROUTING_UNAVAILABLE",
    "500",
    "IMAGE_ANALYSIS_UNAVAILABLE",
  ])
    assert.equal(
      publicFailure(code, "Synthetic internal provider trace / table_name").message,
      "Something went wrong. Please try again."
    );
  assert.equal(
    failureFrom(new TypeError("Failed to fetch")).message,
    "Something went wrong. Please try again."
  );
  assert.equal(failureFrom(new ChatFailure(publicFailure("401"))).action, "sign_in");
});

test("access, credits, limits, file validation and policy retain actionable recovery", async () => {
  for (const [code, action] of [
    ["401", "sign_in"],
    ["402", "usage"],
    ["403", "review"],
    ["429", "wait"],
    ["413", "edit"],
    ["415", "edit"],
    ["422", "edit"],
  ]) {
    const failure = await responseFailure(
      new Response(JSON.stringify({ detail: "Internal details" }), { status: Number(code) })
    );
    assert.equal(failure.view.action, action);
    assert.equal(failure.view.retryable, false);
    assert.ok(!failure.message.includes("Internal"));
  }
  assert.equal(publicFailure("WEB_SEARCH_QUOTA_EXCEEDED").action, "wait");
  assert.equal(publicFailure("WEB_SEARCH_PRIVACY_BLOCKED").action, "edit");
});

test("retry delays grow exponentially with jitter and respect Retry-After", () => {
  assert.equal(retryDelay(1, null, 0), 500);
  assert.equal(retryDelay(2, null, 0), 1000);
  assert.equal(retryDelay(3, null, 0.5), 2125);
  assert.equal(retryDelay(1, "90"), 90000);
});

test("safe reads recover transient failures with bounded attempts", async () => {
  let calls = 0;
  globalThis.fetch = async () =>
    ++calls < 3
      ? new Response(null, { status: 503, headers: { "Retry-After": "0" } })
      : new Response("saved");
  assert.equal(await (await fetchWithRecovery("https://example.test/history")).text(), "saved");
  assert.equal(calls, 3);
});

test("authentication and long rate limits are never retried automatically", async () => {
  for (const status of [401, 403, 422, 429]) {
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return new Response(null, { status, headers: { "Retry-After": "90" } });
    };
    assert.equal((await fetchWithRecovery("https://example.test/history")).status, status);
    assert.equal(calls, 1);
  }
});

test("message sends, uploads and mutations are never replayed by the read retry helper", async () => {
  for (const method of ["POST", "PATCH", "DELETE", "PUT"]) {
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return new Response(null, { status: 503, headers: { "Retry-After": "0" } });
    };
    await fetchWithRecovery("https://example.test/resource", { method });
    assert.equal(calls, 1);
  }
});

test("transcription retries reuse the same recording body", async () => {
  const bodies = [];
  const recording = new FormData();
  recording.append("file", new Blob(["synthetic audio"]));
  globalThis.fetch = async (input, init) => {
    bodies.push(init.body);
    return new Response(null, {
      status: bodies.length === 1 ? 503 : 200,
      headers: { "Retry-After": "0" },
    });
  };
  await fetchWithRecovery(
    "https://example.test/transcribe",
    { method: "POST", body: recording },
    { safeTranscription: true }
  );
  assert.deepEqual(bodies, [recording, recording]);
});

test("cancelling backoff immediately prevents the next request", async () => {
  const controller = new AbortController();
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    queueMicrotask(() => controller.abort());
    return new Response(null, { status: 503 });
  };
  await assert.rejects(
    fetchWithRecovery("https://example.test/history", { signal: controller.signal })
  );
  assert.equal(calls, 1);
  await assert.rejects(waitForRetry(30000, controller.signal));
});

test("empty terminal done frames preserve a partial failed answer and its retry metadata", () => {
  const parser = new SSEEventStreamReader();
  const events = parser.push(
    'event: recovery\ndata: {"state":"retrying","attempt":1,"retry_after_ms":500}\n\nevent: text_chunk\ndata: {"token":"Keep this partial answer"}\n\nevent: error\ndata: {"code":"TIMEOUT","error":"Detailed internal timeout","retryable":true}\n\nevent: done\ndata: {"full_text":""}\n\n'
  );
  const message = events.reduce(applyChatEvent, {
    id: "synthetic",
    role: "assistant",
    content: "",
    status: "running",
  });
  assert.equal(message.content, "Keep this partial answer");
  assert.equal(message.status, "error");
  assert.equal(message.retryable, true);
  assert.equal(message.errorCode, "TIMEOUT");
  assert.equal(message.recovery, undefined);
  assert.equal(message.error, "Something went wrong. Please try again.");
});

test("provider failover leaves thinking unchanged and cannot trigger or clear the elapsed slow status", () => {
  const event = new SSEEventStreamReader().push(
    'event: recovery\ndata: {"state":"retrying","attempt":1,"retry_after_ms":5000}\n\n'
  )[0];
  const running = { id: "synthetic", role: "assistant", content: "", status: "running" };
  assert.equal(applyChatEvent(running, event).recovery, undefined);
  assert.equal(applyChatEvent({ ...running, recovery: "slow" }, event).recovery, "slow");
});

test("malformed recovery frames cannot inject public copy or invalid delay data", () => {
  const parser = new SSEEventStreamReader();
  assert.deepEqual(
    parser.push(
      'event: recovery\ndata: {"state":"complete","attempt":99,"retry_after_ms":-1,"label":"Fake success"}\n\n'
    ),
    []
  );
});
