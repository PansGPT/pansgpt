import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = new URL("../", import.meta.url);
const source = JSON.parse(await readFile(new URL("design/figma-variables.json", root), "utf8"));
const styles = JSON.parse(await readFile(new URL("design/figma-styles.json", root), "utf8"));
const vars = source.variables.map(([id, name, type, collectionId, valuesByMode]) => ({
  id,
  name,
  type,
  collectionId,
  valuesByMode,
}));
const byId = new Map(vars.map((v) => [v.id, v]));
const collections = new Map(styles.collections.map((c) => [c.id, c]));
const slug = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const frequencies = new Map();
for (const v of vars) frequencies.set(slug(v.name), (frequencies.get(slug(v.name)) ?? 0) + 1);
const names = new Map(
  vars.map((v) => [
    v.id,
    "--figma-" +
      (frequencies.get(slug(v.name)) > 1 ? slug(collections.get(v.collectionId).name) + "-" : "") +
      slug(v.name),
  ])
);
assert.equal(new Set(names.values()).size, vars.length, "CSS token name collision");
function modeFor(variable, theme) {
  const collection = collections.get(variable.collectionId);
  assert.ok(collection, "Unknown variable collection: " + variable.collectionId);
  return (
    collection.modes.find((m) => m.name.toLowerCase().includes(theme))?.modeId ??
    collection.defaultModeId
  );
}
function resolve(variable, theme, seen = new Set()) {
  assert.ok(!seen.has(variable.id), "Circular alias: " + variable.name);
  const value = variable.valuesByMode[modeFor(variable, theme)];
  assert.notEqual(value, undefined, "Missing mode value: " + variable.name);
  if (value && typeof value === "object" && value.type === "VARIABLE_ALIAS") {
    const target = byId.get(value.id);
    assert.ok(target, "Missing alias target: " + value.id);
    return resolve(target, theme, new Set([...seen, variable.id]));
  }
  return value;
}
function oklch({ r, g, b, a = 1 }) {
  const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [red, green, blue] = [r, g, b].map(linear);
  const l = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
  const m = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
  const s = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);
  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const aa = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const chroma = Math.hypot(aa, bb);
  const hue = chroma < 0.000001 ? 0 : ((Math.atan2(bb, aa) * 180) / Math.PI + 360) % 360;
  return (
    "oklch(" +
    (lightness * 100).toFixed(6) +
    "% " +
    chroma.toFixed(8) +
    " " +
    hue.toFixed(6) +
    (a < 1 ? " / " + a.toFixed(8) : "") +
    ")"
  );
}
function cssValue(variable, theme) {
  resolve(variable, theme);
  const value = variable.valuesByMode[modeFor(variable, theme)];
  if (value && typeof value === "object" && value.type === "VARIABLE_ALIAS")
    return "var(" + names.get(value.id) + ")";
  if (variable.type === "COLOR") return oklch(value);
  if (variable.type === "FLOAT") return value + "px";
  if (variable.type === "BOOLEAN") return value ? "1" : "0";
  if (variable.name.startsWith("Font weight/"))
    return String(
      /bold/i.test(value) ? (/semi/i.test(value) ? 600 : 700) : /medium/i.test(value) ? 500 : 400
    );
  return JSON.stringify(value);
}
function declarations(theme, filter = () => true) {
  return vars.filter(filter).map((v) => "  " + names.get(v.id) + ": " + cssValue(v, theme) + ";");
}
const semantic = vars.filter((v) => v.collectionId === "VariableCollectionId:5256:372339");
const aliases = semantic.map((v) => ["--" + slug(v.name.split("/").at(-1)), names.get(v.id)]);
assert.equal(
  new Set(aliases.map(([name]) => name)).size,
  aliases.length,
  "Semantic token collision"
);
const fontSizes = vars.filter((v) => v.name.startsWith("Font size/"));
const lines = [
  "/* Generated from Figma. Run pnpm --filter @pansgpt/ui tokens:generate. */",
  ":root,",
  '[data-theme="light"] {',
  ...declarations("light"),
  ...aliases.map(([name, target]) => "  " + name + ": var(" + target + ");"),
  "}",
  "",
  '[data-theme="dark"] {',
  ...declarations("dark", (v) => collections.get(v.collectionId).modes.length > 1),
  "}",
  "",
  ":root {",
  "  --font-body: var(--figma-font-family-font-family-body), sans-serif;",
  "  --font-display: var(--figma-font-family-font-family-display), sans-serif;",
];
for (const s of styles.effectStyles) {
  if (s.effects.every((e) => e.type === "BACKGROUND_BLUR")) {
    lines.push("  --effect-" + slug(s.name.split("/").at(-1)) + ": " + s.effects[0].radius + "px;");
    continue;
  }
  const orderedEffects = s.effects.filter(
    (e) => e.visible !== false && ["DROP_SHADOW", "INNER_SHADOW"].includes(e.type)
  );
  if (s.name.startsWith("Focus rings/")) {
    // CSS paints its first shadow on top. Figma's 2px background band must cover
    // the inner portion of the 4px colored ring, as in the design reference code.
    const innerBand = orderedEffects.findIndex(
      (e) =>
        e.type === "DROP_SHADOW" &&
        e.radius === 0 &&
        e.spread === 2 &&
        e.offset.x === 0 &&
        e.offset.y === 0
    );
    if (innerBand > 0) orderedEffects.unshift(orderedEffects.splice(innerBand, 1)[0]);
  }
  const shadows = orderedEffects.map((e) => {
    const binding = e.boundVariables?.color?.id;
    const color = binding ? "var(" + names.get(binding) + ")" : oklch(e.color);
    if (binding) assert.ok(names.has(binding), "Unknown effect binding");
    return (
      (e.type === "INNER_SHADOW" ? "inset " : "") +
      [e.offset.x, e.offset.y, e.radius, e.spread ?? 0].map((n) => n + "px").join(" ") +
      " " +
      color
    );
  });
  lines.push("  --effect-" + slug(s.name.split("/").at(-1)) + ": " + shadows.join(", ") + ";");
}
lines.push("}", "");
const themeLines = [
  "/* Generated Tailwind v4 mappings. Import after @import 'tailwindcss'. */",
  "@theme inline {",
  "  --font-sans: var(--font-body);",
];
const appendTheme = (value) => themeLines.push(value);
for (const [name] of aliases) appendTheme("  --color-" + name.slice(2) + ": var(" + name + ");");
for (const v of fontSizes) {
  const short = v.name.split("/").at(-1);
  const lineHeight = vars.find((x) => x.name === "Line height/" + short);
  const sizeName = short.replace(/^text-/, "");
  appendTheme("  --text-" + sizeName + ": var(" + names.get(v.id) + ");");
  if (lineHeight)
    appendTheme("  --text-" + sizeName + "--line-height: var(" + names.get(lineHeight.id) + ");");
}
for (const v of vars.filter((v) =>
  ["VariableCollectionId:6298:45383", "VariableCollectionId:6298:46388"].includes(v.collectionId)
)) {
  const prefix = v.collectionId === "VariableCollectionId:6298:45383" ? "spacing" : "radius";
  appendTheme(
    "  --" +
      prefix +
      "-" +
      slug(v.name).replace(new RegExp("^" + prefix + "-"), "") +
      ": var(" +
      names.get(v.id) +
      ");"
  );
}
themeLines.push("}", "");
const css = lines.join("\n");
assert.ok(!css.includes("undefined"), "Unresolved CSS value");
const target = new URL("src/styles/tokens.css", root);
if (process.argv.includes("--check")) {
  assert.equal(await readFile(target, "utf8"), css, "Generated tokens are stale");
  assert.equal(
    await readFile(new URL("src/styles/tailwind.css", root), "utf8"),
    themeLines.join("\n"),
    "Generated Tailwind mappings are stale"
  );
} else {
  await writeFile(target, css);
  await writeFile(new URL("src/styles/tailwind.css", root), themeLines.join("\n"));
}
console.log(
  "Verified " +
    vars.length +
    " variables, both color modes, " +
    styles.textStyles.length +
    " text styles and " +
    styles.effectStyles.length +
    " effects. " +
    fileURLToPath(target)
);
