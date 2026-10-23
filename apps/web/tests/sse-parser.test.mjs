// [CHAT FIX 2] Exercise the real parser without browser, network, or model calls.
import assert from "node:assert/strict";
import test from "node:test";
import { SSEEventStreamReader, externalSourceUrl } from "../lib/sse-parser.ts";

test("split chunks are delivered in order and a final done frame is flushed", () => {
  const reader = new SSEEventStreamReader();
  assert.deepEqual(reader.push('event: text_chunk\ndata: {"token":"Hel'), []);
  assert.deepEqual(reader.push('lo"}\n\n'), [
    { event: "text_chunk", data: { token: "Hello", delta: undefined } },
  ]);
  assert.deepEqual(reader.push('event: done\ndata: {"full_text":"Hello"}'), []);
  assert.deepEqual(reader.flush(), [{ event: "done", data: { full_text: "Hello" } }]);
  assert.deepEqual(reader.flush(), []);
});

test("real web citations retain their URLs and nullable document coordinates", () => {
  const citation = {
    source_type: "web",
    title: "Real web result",
    url: "https://example.org/paper",
    chunk_id: null,
    document_id: null,
    page_start: null,
    page_end: null,
  };
  const reader = new SSEEventStreamReader();
  const result = reader.push(`event: citations\ndata: ${JSON.stringify([citation])}\n\n`);
  assert.deepEqual(result, [{ event: "citations", data: [citation] }]);
  assert.equal(externalSourceUrl(citation), citation.url);
});

test("fabricated and unsafe web sources never become clickable citations", () => {
  const reader = new SSEEventStreamReader();
  const sources = [
    { title: "No evidence" },
    { title: "Unsafe", source_type: "web", url: "javascript:alert(1)" },
    { title: "Local file", source_type: "web", url: "file:///etc/passwd" },
    { title: "No URL", source_type: "web" },
    { title: "Malformed", source_type: "web", url: "https://example.org", snippet: {} },
    { title: "Malformed page", chunk_id: "c", document_id: "d", page_start: "three" },
    { title: "Lecture", chunk_id: "chunk-1", document_id: "doc-1", page_start: 3 },
  ];
  const result = reader.push(`event: citations\ndata: ${JSON.stringify(sources)}\n\n`);
  assert.deepEqual(result, [{ event: "citations", data: [sources[6]] }]);
});

test("a mid-answer timeout retains its code and retryable flag before done", () => {
  const reader = new SSEEventStreamReader();
  const result = reader.push(
    'event: error\ndata: {"error":"Timed out","code":"TIMEOUT","retryable":true}\n\n' +
      'event: done\ndata: {"full_text":"Partial"}\n\n'
  );
  assert.deepEqual(result, [
    { event: "error", data: { error: "Timed out", code: "TIMEOUT", retryable: true } },
    { event: "done", data: { full_text: "Partial" } },
  ]);
});

test("invalid JSON and malformed payloads cannot crash the chat renderer", () => {
  const reader = new SSEEventStreamReader();
  assert.deepEqual(reader.push("event: text_chunk\ndata: nope\n\n"), []);
  assert.deepEqual(reader.push("event: artifact_ready\ndata: []\n\n"), []);
  assert.deepEqual(reader.push("event: unknown\ndata: {}\n\n"), []);
});
