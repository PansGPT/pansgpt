import { readFile, readdir, writeFile } from "node:fs/promises";
import ts from "typescript";
const root = new URL("../", import.meta.url);
const ledger = JSON.parse(await readFile(new URL("../../docs/design-system/coverage.json", root), "utf8"));
const inventory = JSON.parse(await readFile(new URL("design/figma-components.json", root), "utf8"));
const ids = new Set();
for (const file of await readdir(new URL("preview/", root))) {
  if (!/\.tsx?$/.test(file)) continue;
  const source = ts.createSourceFile(file, await readFile(new URL(`preview/${file}`, root), "utf8"), ts.ScriptTarget.Latest, true, file.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const visit = node => { if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && /^\d+:\d+$/.test(node.text)) ids.add(node.text); ts.forEachChild(node, visit); }; visit(source);
}
const included = new Set(ledger.pages.filter(page => page.inScope && page.id !== "3463:407484").map(page => page.id));
const rows = inventory.pages.filter(page => included.has(page.page.id)).flatMap(page => page.families.map(family => ({ id: family.id, name: family.name, page: page.page.name, variantCount: family.variantCount, variants: family.variants, defaultPresent: ids.has(family.defaultId) })));
await writeFile(new URL("design/fixture-audit.json", root), JSON.stringify({ previewSourceIds: ids.size, families: rows }, null, 2) + "\n");
console.log(JSON.stringify({ families: rows.length, sourceIds: ids.size, missingDefaults: rows.filter(row => !row.defaultPresent).map(row => ({ id: row.id, name: row.name, variants: row.variantCount })) }));
