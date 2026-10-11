import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
const run = promisify(execFile);
const root = new URL("../", import.meta.url);
const source = JSON.parse(await readFile(new URL("design/feed-downloads.json", root), "utf8"));
const assets = [];
const entries = Object.entries(source.urls);
for (let offset = 0; offset < entries.length; offset += 4) {
  await Promise.all(entries.slice(offset, offset + 4).map(async ([name, url]) => {
    const file = `feed-${name}.${url.endsWith(".png") ? "png" : "svg"}`;
    const path = new URL(`assets/${file}`, root);
    if (!process.argv.includes("--local")) await run("curl.exe", ["--silent", "--show-error", "--fail", "-L", "-o", decodeURIComponent(path.pathname.slice(1)), url]);
    const bytes = await readFile(path);
    const svg = file.endsWith(".svg") ? bytes.toString("utf8").match(/<svg\b[^>]+>/)?.[0] : undefined;
    assets.push({ name, file, ...(svg ? { width: Number(svg.match(/width="([\d.]+)"/)[1]), height: Number(svg.match(/height="([\d.]+)"/)[1]) } : {}), sha256: createHash("sha256").update(bytes).digest("hex") });
  }));
}
assets.sort((a,b) => a.name.localeCompare(b.name));
await writeFile(new URL("design/feed-assets.json", root), JSON.stringify({ assets }, null, 2) + "\n");
const imports = assets.map(a => `import ${a.name} from "../../assets/${a.file}";`).join("\n");
await writeFile(new URL("src/components/feed-assets.tsx", root), `import type { ComponentProps } from "react";\n${imports}\nconst assets = { ${assets.map(a=>a.name).join(", ")} };\nexport type FeedAssetName = keyof typeof assets;\nexport function feedAssetUrl(name: FeedAssetName): string { const asset = assets[name]; return typeof asset === "string" ? asset : asset.src; }\nconst dimensions: Partial<Record<FeedAssetName, { width: number; height: number }>> = ${JSON.stringify(Object.fromEntries(assets.filter(a => a.width !== undefined).map(a => [a.name, { width: a.width, height: a.height }])))};\nexport function FeedAsset({ name, ...props }: Omit<ComponentProps<"img">, "src" | "alt"> & { name: FeedAssetName }): React.ReactElement { return <img width={dimensions[name]?.width} height={dimensions[name]?.height} {...props} src={feedAssetUrl(name)} alt="" />; }\n`);
console.log(`Indexed ${assets.length} original feed-player assets.`);
