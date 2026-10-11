import { readFile, writeFile, rename, unlink } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
const run = promisify(execFile);
const root = new URL("../", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("design/control-native-downloads.json", root), "utf8"));
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
    const file = `control-native-${name}.${url.endsWith(".png") ? "png" : "svg"}`;
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
await writeFile(new URL("design/control-native-assets.json", root), JSON.stringify({ assets }, null, 2) + "\n");
const imports = assets.map(asset => `import ${asset.name} from "../../assets/${asset.file}";`).join("\n");
await writeFile(new URL("src/components/control-native-assets.tsx", root), `import type { ComponentProps } from "react";\n${imports}\nconst assets = { ${assets.map(asset => asset.name).join(", ")} };\nexport type ControlNativeAssetName = keyof typeof assets;\nexport function controlNativeAssetUrl(name: ControlNativeAssetName): string { const asset = assets[name]; return typeof asset === "string" ? asset : asset.src; }\nconst dimensions: Partial<Record<ControlNativeAssetName, { width: number; height: number }>> = ${JSON.stringify(Object.fromEntries(assets.filter(asset => asset.width !== undefined).map(asset => [asset.name, { width: asset.width, height: asset.height }])))};\nexport function ControlNativeAsset({ name, ...props }: Omit<ComponentProps<"img">, "src" | "alt"> & { name: ControlNativeAssetName }): React.ReactElement { return <img width={dimensions[name]?.width} height={dimensions[name]?.height} {...props} src={controlNativeAssetUrl(name)} alt="" />; }\n`);
const screenshots = JSON.parse(await readFile(new URL("design/control-native-screenshots.json", root), "utf8"));
for (let offset = 0; offset < screenshots.length; offset += 4) await Promise.all(screenshots.slice(offset, offset + 4).map(async screenshot => { const path = new URL(`design/control-${screenshot.id.replace(":", "-")}-reference.png`, root); if (!(await readFile(path).catch(() => undefined))?.length) await run("curl.exe", ["--silent", "--show-error", "--fail", "--connect-timeout", "10", "--max-time", "30", "-L", "-o", decodeURIComponent(path.pathname.slice(1)), screenshot.image_url]); }));
console.log(`Indexed ${assets.length} original control assets and ${screenshots.length} source screenshots.`);
