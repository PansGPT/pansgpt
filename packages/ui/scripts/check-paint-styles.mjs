import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const root = new URL("../design/", import.meta.url);
const archive = JSON.parse(await readFile(new URL("figma-paint-styles.json", root), "utf8"));
const manifest = JSON.parse(
  await readFile(new URL("figma-paint-styles.manifest.json", root), "utf8")
);
const source = JSON.stringify(archive);
let checksum = 2166136261;
for (let index = 0; index < source.length; index++) {
  checksum ^= source.charCodeAt(index);
  checksum = Math.imul(checksum, 16777619);
}
assert.equal(archive.fileKey, manifest.fileKey);
assert.equal(archive.count, manifest.count);
assert.equal(archive.styles.length, manifest.count);
assert.equal(new Set(archive.styles.map((style) => style.id)).size, manifest.count);
assert.equal(
  source.length,
  manifest.sourceLength,
  "Paint archive length differs from the Figma export"
);
assert.equal(
  checksum >>> 0,
  manifest.checksum,
  "Paint archive differs from the lossless Figma export"
);
const counts = {};
for (const style of archive.styles) {
  for (const paint of style.paints) counts[paint.type] = (counts[paint.type] ?? 0) + 1;
}
assert.deepEqual(counts, manifest.paintCounts);
console.log(
  "Verified " +
    archive.count +
    " paint styles against the Figma export checksum; bitmap files remain separate assets."
);
