import { readFile, writeFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const { order } = JSON.parse(await readFile(new URL("design/button-native-downloads.json", root), "utf8"));
const variants = JSON.parse(await readFile(new URL("design/button-native-variants.json", root), "utf8"));
const names = { Primary: "primary", Secondary: "secondary", Tertiary: "tertiary", "Link color": "link-color", "Link gray": "link-gray", Link: "link-color" };
const mapping = {};
for (const [index, id] of order.entries()) {
  const variant = variants.find(v => v.id === id), props = Object.fromEntries(variant.name.split(", ").map(pair => pair.split("=")));
  if (props.Size !== "sm" || props["Icon only"] !== "False") continue;
  const text = await readFile(new URL(`design/references/button-${id.replace(":", "-")}.tsx.txt`, root), "utf8");
  const assets = [...text.matchAll(/const (\w+) = "/g)].map(m => `source${index}_${m[1]}`);
  mapping[`${variant.familyId === "6218:85578" ? "destructive" : "normal"}:${names[props.Hierarchy]}:${props.State.toLowerCase()}`] = assets;
}
await writeFile(new URL("src/components/button-native-data.ts", root), `import type { ButtonNativeAssetName } from "./button-native-assets";\nexport const buttonNativeGlyphs: Record<string, readonly ButtonNativeAssetName[]> = ${JSON.stringify(mapping, null, 2)};\n`);
await writeFile(new URL("preview/button-source-data.ts", root), `export const buttonSources = ${JSON.stringify(variants, null, 2)} as const;\n`);
console.log(`Generated ${Object.keys(mapping).length} complete hierarchy/state glyph groups.`);
