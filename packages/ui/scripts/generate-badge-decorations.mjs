import { readFile, writeFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const download = JSON.parse(await readFile(new URL("design/badge-final-downloads.json", root), "utf8"));
const variants = JSON.parse(await readFile(new URL("design/badge-variants.json", root), "utf8")).variants;
const spacing = { xxs: 2, xs: 4, sm: 6, md: 8, lg: 12 };
const styles = {}, glyphs = {};
const type = { "Pill color": "pill", "Badge color": "color", "Badge modern": "modern" };
const icon = { "Icon leading": "leading", "Icon trailing": "trailing", Only: "only", Avatar: "avatar", Country: "country", "X close": "close" };
function amount(style, property) { const match = style.match(new RegExp(`${property}-\\[([^\\]]+)\\]`)); if (!match) return undefined; return Number(match[1].match(/([\d.]+)px/)?.[1] ?? spacing[match[1].match(/spacing-(\w+)/)?.[1]]); }
for (const [index, id] of download.order.entries()) {
  const source = variants.find(v => v.id === id); const props = Object.fromEntries(source.name.split(", ").map(pair => pair.split("=")));
  const code = await readFile(new URL(`design/references/badge-${id.replace(":", "-")}.tsx.txt`, root), "utf8");
  const color = props.Color.toLowerCase().replace("blue gray", "gray blue").replaceAll(" ", "-");
  const asset = code.match(/const (\w+) = "/)?.[1];
  const name = `source${index}_${asset}`;
  glyphs[`${type[props.Type]}:${props.Size}:${icon[props.Icon]}:${color}`] = name;
  const style = code.split(/function Badge\(/)[1]?.match(/className \|\| "([^"\n]+)"/)?.[1];
  if (!style) throw Error(`Missing badge root ${id}`);
  const all = amount(style, "p"), x = amount(style, "px"), y = amount(style, "py");
  styles[`${type[props.Type]}:${props.Size}:${icon[props.Icon]}`] = { paddingLeft: amount(style, "pl") ?? x ?? all, paddingRight: amount(style, "pr") ?? x ?? all, paddingTop: y ?? all, paddingBottom: y ?? all, gap: amount(style, "gap") ?? 0 };
}
await writeFile(new URL("src/components/badge-decoration-data.ts", root), `import type { CSSProperties } from "react";\nimport type { BadgeFinalAssetName } from "./badge-final-assets";\nexport const badgeDecorationStyles: Record<string, CSSProperties> = ${JSON.stringify(styles, null, 2)};\nexport const badgeDecorationGlyphs: Record<string, BadgeFinalAssetName> = ${JSON.stringify(glyphs, null, 2)};\n`);
await writeFile(new URL("preview/badge-source-data.ts", root), `export const badgeSources = ${JSON.stringify(variants, null, 2)} as const;\n`);
console.log(`Generated ${Object.keys(styles).length} spacing combinations and ${Object.keys(glyphs).length} source glyph mappings.`);
