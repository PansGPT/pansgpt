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
