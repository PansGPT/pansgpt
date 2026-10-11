import { readdir, readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const styles = new URL("../src/styles/", import.meta.url);
const files = (await readdir(styles)).filter((name) => name.endsWith(".css"));
const sources = await Promise.all(
  files.map(async (name) => ({ name, text: await readFile(new URL(name, styles), "utf8") }))
);
const declarations = new Set(
  sources.flatMap((source) => [...source.text.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]))
);
// These properties are supplied by Radix or the progress component at runtime.
const runtimeProperties = new Set([
  "--radix-select-trigger-width",
  "--radix-select-content-available-height",
  "--radix-dropdown-menu-content-available-height",
  "--radix-popover-content-available-height",
  "--radix-popover-trigger-width",
  "--progress",
  "--upload-progress",
]);
const missing = sources.flatMap((source) =>
  [...source.text.matchAll(/var\(\s*(--[\w-]+)/g)]
    .filter((match) => !declarations.has(match[1]) && !runtimeProperties.has(match[1]))
    .map((match) => source.name + ": " + match[1])
);
assert.deepEqual(missing, [], "CSS references an undeclared design token");
console.log("Verified CSS references across " + files.length + " stylesheets.");
