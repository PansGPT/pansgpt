import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const root = new URL("../", import.meta.url);
const { textStyles } = JSON.parse(
  await readFile(new URL("design/figma-styles.json", root), "utf8")
);
const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const names = textStyles.map((style) => slug(style.name));
assert.equal(new Set(names).size, textStyles.length, "Typography name collision");
const lines = ["/* Generated from the archived Figma text styles. */"];
for (const style of textStyles) {
  const weight =
    style.fontName.variationSettings?.wght ??
    (/Semibold/i.test(style.fontName.style)
      ? 600
      : /Bold/i.test(style.fontName.style)
        ? 700
        : /Medium/i.test(style.fontName.style)
          ? 500
          : 400);
  const lineHeight =
    style.lineHeight.unit === "PIXELS"
      ? style.lineHeight.value + "px"
      : style.lineHeight.unit === "PERCENT"
        ? style.lineHeight.value / 100
        : "normal";
  const spacing =
    style.letterSpacing.unit === "PERCENT"
      ? style.letterSpacing.value / 100 + "em"
      : style.letterSpacing.value + "px";
  lines.push(
    `.p-type-${slug(style.name)} { font-family: var(--font-body); font-size: ${style.fontSize}px; font-weight: ${weight}; line-height: ${lineHeight}; letter-spacing: ${spacing}; }`
  );
}
const metadata = textStyles.map((style) => ({
  name: slug(style.name),
  figmaName: style.name,
  figmaStyleId: style.id,
}));
const outputs = [
  [new URL("src/styles/typography.css", root), lines.join("\n") + "\n"],
  [
    new URL("src/typography-styles.ts", root),
    "// Generated from Figma.\nexport const typographyStyles = " +
      JSON.stringify(metadata, null, 2) +
      " as const;\nexport type TypographyStyle = (typeof typographyStyles)[number]['name'];\n",
  ],
];
for (const [target, output] of outputs) {
  if (process.argv.includes("--check"))
    assert.equal(await readFile(target, "utf8"), output, "Typography is stale");
  else await writeFile(target, output);
}
console.log("Verified " + textStyles.length + " typography styles.");
