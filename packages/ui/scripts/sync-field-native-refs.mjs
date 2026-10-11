import { readFile, writeFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("design/field-native-downloads.json", root), "utf8"));
const variants = JSON.parse(await readFile(new URL("design/field-native-variants.json", root), "utf8"));
for (const variant of variants) {
  if (manifest.order.includes(variant.id)) continue;
  const source = await readFile(new URL(`design/references/field-${variant.id.replace(":", "-")}.tsx.txt`, root), "utf8");
  if (!source.includes("function InputField") && !source.includes("function Select")) throw Error(`Incomplete reference ${variant.id}`);
  const index = manifest.order.length;
  manifest.order.push(variant.id);
  for (const [, name, url] of source.matchAll(/const (img\w+) = "(https:\/\/[^"]+)";/g)) manifest.urls[`source${index}_${name}`] = url;
}
await writeFile(new URL("design/field-native-downloads.json", root), JSON.stringify(manifest, null, 2) + "\n");
console.log(`${manifest.order.length} full field references, ${Object.keys(manifest.urls).length} original asset bindings.`);
