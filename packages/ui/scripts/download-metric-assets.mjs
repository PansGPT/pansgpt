import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
const run = promisify(execFile);
const root = new URL("../", import.meta.url);
const source = JSON.parse(await readFile(new URL("design/metric-downloads.json", root), "utf8"));
const mini = JSON.parse(await readFile(new URL("design/mini-chart-layers.json", root), "utf8"));
const wide = JSON.parse(await readFile(new URL("design/metric-wide-layers.json", root), "utf8"));
const assets = [];
async function record(name, file, sourceId) {
  const bytes = await readFile(new URL(`assets/${file}`, root));
  const svg = bytes.toString("utf8").match(/<svg\b[^>]+>/)?.[0];
  assets.push({ name, file, ...(sourceId ? { sourceId } : {}), width: Number(svg.match(/width="([\d.]+)"/)[1]), height: Number(svg.match(/height="([\d.]+)"/)[1]), sha256: createHash("sha256").update(bytes).digest("hex") });
}
const entries = Object.entries(source.urls);
for (let offset = 0; offset < entries.length; offset += 4) {
  await Promise.all(entries.slice(offset, offset + 4).map(async ([name, url]) => {
    const file = `metric-${name}.svg`;
    const path = new URL(`assets/${file}`, root);
    if (!process.argv.includes("--local")) await run("curl.exe", ["--silent", "--show-error", "--fail", "-L", "-o", decodeURIComponent(path.pathname.slice(1)), url]);
    await record(name, file);
  }));
}
for (const chart of [...mini, ...wide]) for (let index = 0; index < chart.layers.length; index++) {
  const layer = chart.layers[index]; layer.asset = `native_${chart.id.replace(":", "_")}_${index}`;
  await record(layer.asset, layer.file, layer.id);
}
assets.sort((a,b) => a.name.localeCompare(b.name));
await writeFile(new URL("design/metric-assets.json", root), JSON.stringify({ assets }, null, 2) + "\n");
const imports = assets.map(a => `import ${a.name} from "../../assets/${a.file}";`).join("\n");
const miniReferences = Object.fromEntries(mini.map(chart => [chart.name.match(/Type=([^,]+)/)[1].toLowerCase().replaceAll(" ", "") + "_" + chart.name.match(/Trend=(\w+)/)[1].toLowerCase(), chart]));
const wideReferences = Object.fromEntries(wide.map(chart => [chart.id.replace(":", "_"), chart]));
await writeFile(new URL("src/components/metric-assets.tsx", root), `import type { ComponentProps } from "react";\n${imports}\nconst assets = { ${assets.map(a=>a.name).join(", ")} };\nexport type MetricAssetName = keyof typeof assets;\nexport function metricAssetUrl(name: MetricAssetName): string { const asset = assets[name]; return typeof asset === "string" ? asset : asset.src; }\nconst dimensions: Partial<Record<MetricAssetName, { width: number; height: number }>> = ${JSON.stringify(Object.fromEntries(assets.filter(a => a.width !== undefined).map(a => [a.name, { width: a.width, height: a.height }])))};\nexport function MetricAsset({ name, ...props }: Omit<ComponentProps<"img">, "src" | "alt"> & { name: MetricAssetName }): React.ReactElement { return <img width={dimensions[name]?.width} height={dimensions[name]?.height} {...props} src={metricAssetUrl(name)} alt="" />; }\nexport const miniChartReferences = ${JSON.stringify(miniReferences, null, 2)} as const;\nexport const metricWideChartReferences = ${JSON.stringify(wideReferences, null, 2)} as const;\n`);
console.log(`Indexed ${assets.length} original metric assets and ${mini.length} mini-chart layouts.`);
