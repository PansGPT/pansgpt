import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
const run = promisify(execFile);
const root = new URL("../", import.meta.url);
const source = JSON.parse(await readFile(new URL("design/text-editor-downloads.json", root), "utf8"));
const assets = [];
const entries = Object.entries(source.urls);
for (let offset = 0; offset < entries.length; offset += 4) {
  await Promise.all(entries.slice(offset, offset + 4).map(async ([name, url]) => {
    const file = `text-editor-${name}.svg`;
    const path = new URL(`assets/${file}`, root);
    await run("curl.exe", ["--silent", "--show-error", "--fail", "-L", "-o", decodeURIComponent(path.pathname.slice(1)), url]);
    const bytes = await readFile(path);
    const svg = bytes.toString("utf8").match(/<svg\b[^>]+>/)?.[0];
    assets.push({ name, file, width: Number(svg.match(/width="([\d.]+)"/)[1]), height: Number(svg.match(/height="([\d.]+)"/)[1]), sha256: createHash("sha256").update(bytes).digest("hex") });
  }));
}
assets.sort((a,b) => a.name.localeCompare(b.name));
await writeFile(new URL("design/text-editor-assets.json", root), JSON.stringify({ assets, mappings: source.mappings }, null, 2) + "\n");
const imports = assets.map(a => `import ${a.name} from "../../assets/${a.file}";`).join("\n");
await writeFile(new URL("src/components/text-editor-assets.tsx", root), `import type { ComponentProps } from "react";\n${imports}\nconst assets = { ${assets.map(a=>a.name).join(", ")} };\nexport type TextEditorAssetName = keyof typeof assets;\nexport function TextEditorAsset({ name, ...props }: Omit<ComponentProps<"img">, "src" | "alt"> & { name: TextEditorAssetName }): React.ReactElement { const asset = assets[name]; return <img {...props} src={typeof asset === "string" ? asset : asset.src} alt="" />; }\n`);
console.log(`Downloaded and indexed ${assets.length} original text-editor assets.`);
