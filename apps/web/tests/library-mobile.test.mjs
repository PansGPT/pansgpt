import test from "node:test";
import assert from "node:assert/strict";
import { readingDateGroup } from "../lib/library-catalog.ts";

test("reading groups follow calendar days, including a recent opening before midnight", () => {
  const now = new Date(2026, 9, 27, 0, 5);
  assert.equal(readingDateGroup(new Date(2026, 9, 27, 0, 1).toISOString(), now), "Today");
  assert.equal(readingDateGroup(new Date(2026, 9, 26, 23, 58).toISOString(), now), "Yesterday");
  assert.equal(readingDateGroup(new Date(2026, 9, 20, 12).toISOString(), now), "Previous 7 days");
  assert.equal(readingDateGroup(new Date(2026, 9, 19, 12).toISOString(), now), "Earlier");
  assert.equal(readingDateGroup(null, now), "Earlier");
  assert.equal(readingDateGroup("invalid", now), "Earlier");
});

import { readLibraryLocation, libraryLocationUrl } from "../lib/library-location.ts";

test("library links retain the selected collection/course and safely round-trip course codes", () => {
  assert.deepEqual(readLibraryLocation(new URLSearchParams()), { kind: "recent" });
  assert.deepEqual(readLibraryLocation(new URLSearchParams("tab=courses")), { kind: "courses" });
  const href = libraryLocationUrl(new URLSearchParams("q=old&tab=recent"), {
    kind: "course",
    code: "PCL 401 & II",
  });
  const params = new URL(href, "https://example.test").searchParams;
  assert.deepEqual(readLibraryLocation(params), { kind: "course", code: "PCL 401 & II" });
  assert.equal(params.has("q"), false);
  const recent = new URL(libraryLocationUrl(params, { kind: "recent" }), "https://example.test")
    .searchParams;
  assert.equal(recent.has("course"), false);
  assert.deepEqual(readLibraryLocation(recent), { kind: "recent" });
  assert.deepEqual(readLibraryLocation(new URLSearchParams("tab=unknown&course=  ")), {
    kind: "recent",
  });
});
