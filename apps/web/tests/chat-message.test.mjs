import assert from "node:assert/strict";
import test from "node:test";
import {
  applyChatEvent,
  finishChatMessage,
  safeChatLink,
  publicProgressLines,
  documentSources,
} from "../lib/chat-message.ts";
import { SSEEventStreamReader } from "../lib/sse-parser.ts";

const pending = () => ({
  id: "synthetic-answer",
  role: "assistant",
  content: "",
  status: "running",
});

test("typed model progress stays separate from raw thoughts and survives terminal events", () => {
  const update = {
    code: "searching_sources",
    label: "Looking up the match report",
    source: "model",
  };
  const parser = new SSEEventStreamReader();
  const events = parser.push(
    `event: public_progress\ndata: ${JSON.stringify(update)}\n\nevent: public_progress\ndata: ${JSON.stringify(update)}\n\nevent: thinking_chunk\ndata: {"token":"PRIVATE REASONING"}\n\n`
  );
  const result = events.reduce(applyChatEvent, pending());
  assert.deepEqual(result.progress, [update]);
  assert.equal(result.thinking, undefined);
  assert.deepEqual(applyChatEvent(result, { event: "error", data: { error: "Retry" } }).progress, [
    update,
  ]);
  for (const bad of [
    { ...update, source: "private" },
    { ...update, code: "fake" },
    { ...update, label: "<think>PRIVATE</think>" },
    { ...update, label: "https://example.test/private" },
    { ...update, label: "a".repeat(121) },
  ]) {
    assert.deepEqual(
      new SSEEventStreamReader().push(`event: public_progress\ndata: ${JSON.stringify(bad)}\n\n`),
      []
    );
  }
});

test("reactivating a phase selects its existing model copy without duplicating progress history", () => {
  let message = pending();
  const reading = { code: "reading_document", label: "Reading the enzyme sketch", source: "model" };
  const writing = { code: "writing_response", label: "Explaining the diagram", source: "model" };
  message = applyChatEvent(message, { event: "public_progress", data: writing });
  message = applyChatEvent(message, { event: "public_progress", data: reading });
  message = applyChatEvent(message, {
    event: "thinking_chunk",
    data: { code: "writing_response" },
  });
  assert.equal(message.activity, "writing_response");
  assert.deepEqual(message.progress, [writing, reading]);
  assert.equal(
    message.progress.find((item) => item.code === message.activity).label,
    "Explaining the diagram"
  );
});

test("a provider error followed by done keeps partial content and the failure status", () => {
  const parser = new SSEEventStreamReader();
  const events = parser.push(
    'event: text_chunk\ndata: {"delta":"Partial answer"}\n\nevent: error\ndata: {"error":"Synthetic timeout"}\n\nevent: done\ndata: {"full_text":"Partial answer"}\n\n'
  );
  const message = events.reduce(applyChatEvent, pending());
  assert.equal(message.content, "Partial answer");
  assert.equal(message.status, "error");
  assert.equal(message.error, "Synthetic timeout");
  assert.equal(finishChatMessage(message, false).status, "error");
});

test("EOF needs explicit completion; cancellation and complete responses stay distinct", () => {
  const partial = { ...pending(), content: "Keep this" };
  assert.equal(finishChatMessage(partial, false).status, "error");
  assert.equal(finishChatMessage(partial, true).status, "cancelled");
  assert.equal(finishChatMessage(partial, true).content, "Keep this");
  const complete = applyChatEvent(partial, { event: "done", data: { full_text: "" } });
  assert.equal(complete.content, "");
  assert.equal(finishChatMessage(complete, false).status, "complete");
});

test("streaming reasoning, repeated tool IDs, artifacts and citations preserve their separate data", () => {
  const events = [
    { event: "thinking_chunk", data: { code: "checking_materials", delta: "PRIVATE RAW PLAN" } },
    {
      event: "tool_start",
      data: { call_id: "tool-1", tool_name: "create_doc", arguments: { topic: "Sample" } },
    },
    {
      event: "tool_start",
      data: { call_id: "tool-1", tool_name: "create_doc", arguments: { topic: "Updated sample" } },
    },
    {
      event: "tool_end",
      data: {
        call_id: "tool-1",
        tool_name: "create_doc",
        status: "success",
        result: { ready: true },
        duration_ms: 25,
      },
    },
    { event: "artifact_ready", data: { skill_name: "create_doc", title: "Synthetic notes" } },
    {
      event: "citations",
      data: [{ title: "Synthetic course source", document_id: "doc", chunk_id: "chunk" }],
    },
  ];
  const result = events.reduce(applyChatEvent, pending());
  assert.equal(result.thinking, "Checking your course materials.");
  assert.equal(result.tools.length, 1);
  assert.equal(result.tools[0].status, "success");
  assert.equal(result.tools[0].arguments.topic, "Updated sample");
  assert.equal(result.artifacts[0].title, "Synthetic notes");
  assert.equal(result.citations[0].document_id, "doc");
});

test("AI links allow web URLs and reject script, file, data and relative destinations", () => {
  assert.equal(safeChatLink("https://example.invalid/notes"), "https://example.invalid/notes");
  for (const href of [
    undefined,
    "javascript:alert(1)",
    "data:text/html,x",
    "file:///secret",
    "//tracker.invalid",
    "/admin",
  ]) {
    assert.equal(safeChatLink(href), undefined);
  }
});

test("raw reasoning cannot become progress or repeat a stage", () => {
  const raw = applyChatEvent(pending(), {
    event: "thinking_chunk",
    data: { token: "PRIVATE PLAN\n    raw code block" },
  });
  assert.equal(raw.thinking, undefined);
  const known = applyChatEvent(raw, {
    event: "thinking_chunk",
    data: { code: "reviewing_request", token: "PRIVATE CONTENT" },
  });
  const repeated = applyChatEvent(known, {
    event: "thinking_chunk",
    data: { code: "reviewing_request" },
  });
  assert.equal(repeated.thinking, "Reviewing your request.");
  assert.deepEqual(
    publicProgressLines(
      "PRIVATE OLD PLAN\nChecking your course materials.\nChecking your course materials."
    ),
    ["Checking your course materials."]
  );
});

test("source display groups document pages without changing citation coordinates", () => {
  const citations = [
    { title: "Synthetic course document", document_id: "one", page_start: 2 },
    { title: "Synthetic course document", document_id: "one", page_start: 9 },
    { title: "Other document", document_id: "two", page_start: 4 },
  ];
  assert.equal(documentSources(citations).length, 2);
  assert.equal(citations.length, 3);
  assert.equal(citations[1].page_start, 9);
});
