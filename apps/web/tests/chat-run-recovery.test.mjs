import test from "node:test";
import assert from "node:assert/strict";
import {
  parseRunSnapshot,
  recoveredMessage,
  trackChatTransport,
  disposeChatTransports,
} from "../lib/chat-run-recovery.ts";
const run = "00000000-0000-4000-8000-000000000001",
  user = "00000000-0000-4000-8000-000000000002",
  assistant = "00000000-0000-4000-8000-000000000003";

test("legacy generic provider errors recover Retry when no tool fence exists", () => {
  const snapshot = parseRunSnapshot({
    run_id: run,
    user_message_id: user,
    assistant_message_id: assistant,
    status: "error",
    error_code: "PROVIDER_ERROR",
    retryable: false,
    tool_started: false,
    retry_blocked: false,
  });
  assert.equal(recoveredMessage(snapshot).retryable, true);
});

test("reattached runs recover the current public stage and elapsed wait hint", () => {
  const snapshot = parseRunSnapshot({
    run_id: run,
    status: "running",
    user_message_id: user,
    assistant_message_id: assistant,
    activity: "checking_materials",
    elapsed_ms: 35000,
  });
  assert.equal(recoveredMessage(snapshot).activity, "checking_materials");
  assert.equal(recoveredMessage(snapshot).delayed, true);
  const unsafe = parseRunSnapshot({ ...snapshot, activity: "PRIVATE SCRATCHPAD" });
  assert.equal(unsafe.activity, undefined);
});

test("read-only searches preserve Retry after snapshot recovery, while old or unsafe runs stay fenced", () => {
  for (const [fence, expected] of [
    [false, true],
    [true, false],
    [undefined, false],
  ]) {
    const snapshot = parseRunSnapshot({
      run_id: run,
      user_message_id: user,
      assistant_message_id: assistant,
      status: "error",
      error_code: "PROVIDER_ERROR",
      retryable: true,
      tool_started: true,
      retry_blocked: fence,
      tools: [{ call_id: "search", tool_name: "rag_search", status: "success" }],
    });
    assert.equal(recoveredMessage(snapshot).retryable, expected);
  }
});

test("run snapshots normalize public artifacts and reject malformed identities", () => {
  const snapshot = parseRunSnapshot({
    run_id: run,
    status: "running",
    user_message_id: user,
    assistant_message_id: assistant,
    content: "Partial",
    artifacts: [{ skill_name: "create_md", title: "Notes", content: "# Notes", storage_key: null }],
    tools: [
      {
        call_id: "call",
        tool_name: "read_document",
        status: "success",
        arguments: { secret: "never restored" },
      },
    ],
  });
  assert.equal(snapshot.artifacts[0].content, "# Notes");
  assert.equal(snapshot.tools[0].arguments, undefined);
  assert.equal(recoveredMessage(snapshot).status, "running");
  assert.equal(parseRunSnapshot({ ...snapshot, run_id: "not-an-id" }), null);
});
test("failed side-effecting runs never offer an unsafe whole-request retry", () => {
  const snapshot = parseRunSnapshot({
    run_id: run,
    status: "error",
    user_message_id: user,
    assistant_message_id: assistant,
    content: "Partial",
    error_code: "TIMEOUT",
    tool_started: true,
    retryable: true,
  });
  const message = recoveredMessage(snapshot);
  assert.equal(message.status, "error");
  assert.equal(message.retryable, false);
});
test("completed runs restore saved content while stopped runs stay stopped", () => {
  const snapshot = parseRunSnapshot({
    run_id: run,
    status: "complete",
    user_message_id: user,
    assistant_message_id: assistant,
    content: "Finished",
  });
  assert.equal(recoveredMessage(snapshot).isSaved, true);
  assert.equal(recoveredMessage({ ...snapshot, status: "cancelled" }).status, "cancelled");
});

test("completed snapshots preserve usable artifacts and their incomplete-work notice", () => {
  const snapshot = parseRunSnapshot({
    run_id: run,
    status: "complete",
    user_message_id: user,
    assistant_message_id: assistant,
    completion_warning: "additional_work_incomplete",
    retry_blocked: true,
    artifacts: [{ skill_name: "plot_graph", title: "Synthetic curve", content: { type: "line" } }],
  });
  const message = recoveredMessage(snapshot);
  assert.equal(message.status, "complete");
  assert.equal(message.isSaved, true);
  assert.equal(message.completionWarning, "additional_work_incomplete");
  assert.equal(message.artifacts.length, 1);
  assert.equal(message.failure, undefined);
  assert.equal(
    parseRunSnapshot({ ...snapshot, completion_warning: "PRIVATE" }).completion_warning,
    undefined
  );
});
test("auth disposal cancels old account transports without cancelling retained owner", () => {
  const cancelled = [];
  const endA = trackChatTransport("A", () => cancelled.push("A"));
  const endB = trackChatTransport("B", () => cancelled.push("B"));
  disposeChatTransports("B");
  assert.deepEqual(cancelled, ["A"]);
  endB();
  disposeChatTransports();
  assert.deepEqual(cancelled, ["A"]);
  endA();
});
