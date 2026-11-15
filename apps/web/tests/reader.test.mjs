import test from "node:test";
import assert from "node:assert/strict";
import { parseCitationGeometry } from "../lib/citation-geometry.ts";
import { documentSources } from "../lib/chat-message.ts";

test("citation geometry validates normalized bounds and safely falls back to a page", () => {
  const geometry = {
    page: 3,
    bbox: [0.1, 0.2, 0.6, 0.4],
    rects: [
      [0.1, 0.2, 0.6, 0.3],
      [0.1, 0.31, 0.6, 0.4],
    ],
  };
  assert.deepEqual(parseCitationGeometry(geometry), geometry);
  for (const invalid of [
    null,
    "bad",
    {},
    { ...geometry, page: -1 },
    { ...geometry, bbox: [-1, 0, 1, 1] },
    { ...geometry, bbox: [0.8, 0.2, 0.1, 0.4] },
    { ...geometry, bbox: [0, 0, Infinity, 1] },
  ]) {
    assert.equal(parseCitationGeometry(invalid), null);
  }
  assert.deepEqual(parseCitationGeometry({ ...geometry, rects: "invalid" }), {
    page: 3,
    bbox: geometry.bbox,
  });
});

test("reader retains separate page links while general chat groups by document", () => {
  const source = (page) => ({
    document_id: "synthetic",
    title: "Synthetic material",
    page_start: page,
  });
  const citations = [source(3), source(7), source(3)];
  assert.equal(documentSources(citations).length, 1);
  assert.deepEqual(
    documentSources(citations, true).map((item) => item.page_start),
    [3, 7]
  );
});
