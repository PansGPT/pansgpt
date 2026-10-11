import { readFile, writeFile, rename, unlink } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
const run = promisify(execFile);
const root = new URL("../", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("design/modal-downloads.json", root), "utf8"));
const assets = [];
const entries = [];
function valid(bytes, file) {
  if (!bytes?.length) return false;
  if (file.endsWith(".svg")) return /<svg\b/.test(bytes.toString("utf8")) && /<\/svg>\s*$/.test(bytes.toString("utf8"));
  if (bytes.length < 24) return false;
  if (bytes.subarray(1, 4).toString() === "PNG") return bytes.subarray(-8, -4).toString() === "IEND";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
  return bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP" && bytes.readUInt32LE(4) + 8 === bytes.length;
}
for (const [index, reference] of manifest.order.entries()) {
  const code = await readFile(new URL(`design/references/${reference.path}`, root), "utf8");
  for (const [, variable, url] of code.matchAll(/const (img\w*) = "(https:\/\/[^"]+)";/g)) entries.push([`source${index}_${variable}`, url]);
}
for (let offset = 0; offset < entries.length; offset += 4) {
  await Promise.all(entries.slice(offset, offset + 4).map(async ([name, url]) => {
    const file = `modal-${name}.${url.endsWith(".png") ? "png" : "svg"}`;
    const path = new URL(`assets/${file}`, root);
    const existing = await readFile(path).catch(() => undefined);
    if (!valid(existing, file)) {
      const temporary = new URL(path.href + ".part");
      try { await run("curl.exe", ["--silent", "--show-error", "--fail", "--connect-timeout", "10", "--max-time", "45", "--retry", "2", "-L", "-o", decodeURIComponent(temporary.pathname.slice(1)), url]); const downloaded = await readFile(temporary); if (!valid(downloaded, file)) throw Error(`Incomplete original asset ${file}`); await rename(temporary, path); }
      catch (error) { await unlink(temporary).catch(() => undefined); throw error; }
    }
    const bytes = await readFile(path);
    const svg = file.endsWith(".svg") ? bytes.toString("utf8").match(/<svg\b[^>]+>/)?.[0] : undefined;
    assets.push({ name, file, ...(svg ? { width: Number(svg.match(/width="([\d.]+)"/)[1]), height: Number(svg.match(/height="([\d.]+)"/)[1]) } : {}), sha256: createHash("sha256").update(bytes).digest("hex") });
  }));
}
assets.sort((a, b) => a.name.localeCompare(b.name));
await writeFile(new URL("design/modal-assets.json", root), JSON.stringify({ assets }, null, 2) + "\n");
const imports = assets.map(asset => `import ${asset.name} from "../../assets/${asset.file}";`).join("\n");
await writeFile(new URL("src/components/modal-assets.tsx", root), `import type { ComponentProps } from "react";\n${imports}\nconst assets = { ${assets.map(asset => asset.name).join(", ")} };\nexport type ModalAssetName = keyof typeof assets;\nexport function modalAssetUrl(name: ModalAssetName): string { const asset = assets[name]; return typeof asset === "string" ? asset : asset.src; }\nconst dimensions: Partial<Record<ModalAssetName, { width: number; height: number }>> = ${JSON.stringify(Object.fromEntries(assets.filter(asset => asset.width !== undefined).map(asset => [asset.name, { width: asset.width, height: asset.height }])))};\nexport function ModalAsset({ name, ...props }: Omit<ComponentProps<"img">, "src" | "alt"> & { name: ModalAssetName }): React.ReactElement { return <img width={dimensions[name]?.width} height={dimensions[name]?.height} {...props} src={modalAssetUrl(name)} alt="" />; }\n`);
console.log(`Indexed ${assets.length} original modal assets.`);
