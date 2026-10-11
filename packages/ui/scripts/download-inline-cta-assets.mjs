import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
const run = promisify(execFile);
const root = new URL("../", import.meta.url);
const source = JSON.parse(await readFile(new URL("design/inline-cta-downloads.json", root), "utf8"));
const assets = [];
async function record(name, file) {
  const bytes = await readFile(new URL(`assets/${file}`, root));
  const svg = file.endsWith(".svg") ? bytes.toString("utf8").match(/<svg\b[^>]+>/)?.[0] : undefined;
  assets.push({ name, file, ...(svg ? { width: Number(svg.match(/width="([\d.]+)"/)[1]), height: Number(svg.match(/height="([\d.]+)"/)[1]) } : {}), sha256: createHash("sha256").update(bytes).digest("hex") });
}
const entries = Object.entries(source.urls);
for (let offset = 0; offset < entries.length; offset += 4) {
  await Promise.all(entries.slice(offset, offset + 4).map(async ([name, url]) => {
    const file = `inline-cta-${name}.${url.endsWith(".png") ? "png" : "svg"}`;
    const path = new URL(`assets/${file}`, root);
    if (!process.argv.includes("--local")) await run("curl.exe", ["--silent", "--show-error", "--fail", "-L", "-o", decodeURIComponent(path.pathname.slice(1)), url]);
    await record(name, file);
  }));
}
assets.sort((a,b) => a.name.localeCompare(b.name));
await writeFile(new URL("design/inline-cta-assets.json", root), JSON.stringify({ assets }, null, 2) + "\n");
const imports = assets.map(a => `import ${a.name} from "../../assets/${a.file}";`).join("\n");
await writeFile(new URL("src/components/inline-cta-assets.tsx", root), `import type { ComponentProps } from "react";\n${imports}\nconst assets = { ${assets.map(a=>a.name).join(", ")} };\nexport type InlineCTAAssetName = keyof typeof assets;\nexport function inlineCTAAssetUrl(name: InlineCTAAssetName): string { const asset = assets[name]; return typeof asset === "string" ? asset : asset.src; }\nconst dimensions: Partial<Record<InlineCTAAssetName, { width: number; height: number }>> = ${JSON.stringify(Object.fromEntries(assets.filter(a => a.width !== undefined).map(a => [a.name, { width: a.width, height: a.height }])))};\nexport function InlineCTAAsset({ name, ...props }: Omit<ComponentProps<"img">, "src" | "alt"> & { name: InlineCTAAssetName }): React.ReactElement { return <img width={dimensions[name]?.width} height={dimensions[name]?.height} {...props} src={inlineCTAAssetUrl(name)} alt="" />; }\n`);
console.log(`Downloaded and indexed ${assets.length} original inline-cta-menu assets.`);
