import test from "node:test";
import assert from "node:assert/strict";
import {
  chartContentSchema,
  flashcardContentSchema,
  mnemonicContentSchema,
  safeDiagramSource,
} from "../lib/study-artifacts.ts";
import { SSEEventStreamReader } from "../lib/sse-parser.ts";

test("rich chart contract rejects unsafe and misleading data", () => {
  const graph = {
    type: "line",
    title: "Synthetic",
    data: { labels: ["A", "B"], datasets: [{ label: "Series", data: [1, 2] }] },
  };
  assert.equal(chartContentSchema.safeParse(graph).success, true);
  assert.equal(
    chartContentSchema.safeParse({ ...graph, data: { ...graph.data, labels: ["A"] } }).success,
    false
  );
  assert.equal(chartContentSchema.safeParse({ ...graph, type: "scatter" }).success, false);
  assert.equal(
    chartContentSchema.safeParse({
      ...graph,
      data: { ...graph.data, datasets: [{ label: "Bad", data: [NaN, Infinity] }] },
    }).success,
    false
  );
});
test("cards and mnemonics validate the actual backend shape", () => {
  assert.equal(
    flashcardContentSchema.safeParse({
      topic: "Synthetic",
      total: 1,
      cards: [{ front: "Q", back: "A", hint: "H" }],
    }).success,
    true
  );
  assert.equal(
    flashcardContentSchema.safeParse({ topic: "Synthetic", total: 1, cards: [] }).success,
    false
  );
  assert.equal(
    mnemonicContentSchema.safeParse({
      concept: "Synthetic",
      mnemonic: "ABC",
      breakdown: ["A", "B", "C"],
      clinical_notes: "Notes",
    }).success,
    true
  );
});
test("diagram renderer rejects active content and configuration", () => {
  assert.equal(safeDiagramSource("flowchart LR\n A[Question] --> B[Answer]"), true);
  for (const source of [
    "%%{init: {securityLevel: 'loose'}}%%\nflowchart LR\nA-->B",
    "flowchart LR\nclick A 'https://example.test'",
    "flowchart LR\nA[<img src=x>]",
  ])
    assert.equal(safeDiagramSource(source), false);
});
test("study note text survives the SSE envelope", () => {
  const reader = new SSEEventStreamReader();
  assert.equal(
    reader.push(
      'event: artifact_ready\ndata: {"skill_name":"create_md","title":"Synthetic","content":"# Notes"}\n\n'
    )[0].data.content,
    "# Notes"
  );
});
