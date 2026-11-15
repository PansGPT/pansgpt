import { cp, mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(join(repo, "apps/web/package.json"));

export async function syncPdfAssets() {
  const source = dirname(require.resolve("pdfjs-dist/package.json"));
  const { version } = JSON.parse(await readFile(join(source, "package.json"), "utf8"));
  const target = join(repo, "apps/web/public/pdfjs", version);
  await mkdir(target, { recursive: true });
  await cp(join(source, "build/pdf.worker.min.mjs"), join(target, "pdf.worker.min.mjs"));
  await cp(join(source, "LICENSE"), join(target, "LICENSE"));
  for (const folder of ["cmaps", "standard_fonts", "wasm"]) {
    await cp(join(source, folder), join(target, folder), { recursive: true });
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await syncPdfAssets();
