import { readFile, writeFile } from "node:fs/promises";
import ts from "typescript";
const root = new URL("../", import.meta.url);
function attribute(node, name) { const opening = ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : undefined; const value = opening?.attributes.properties.find(property => ts.isJsxAttribute(property) && property.name.text === name)?.initializer; if (value && ts.isStringLiteral(value)) return value.text; if (value && ts.isJsxExpression(value) && value.expression) return ts.isIdentifier(value.expression) || ts.isStringLiteral(value.expression) ? value.expression.text : value.expression.getText(); return undefined; }
function named(node, name) { return attribute(node, "data-name") === name; }
function descendants(node, predicate) { const result = []; const visit = child => { if (predicate(child)) result.push(child); ts.forEachChild(child, visit); }; ts.forEachChild(node, visit); return result; }
function text(node) { if (ts.isJsxText(node)) return node.text.replace(/\s+/g, " ").trim(); if (ts.isJsxExpression(node) && node.expression && (ts.isStringLiteral(node.expression) || ts.isNoSubstitutionTemplateLiteral(node.expression))) return node.expression.text; if (ts.isJsxElement(node) || ts.isJsxFragment(node)) return node.children.map(text).filter(Boolean).join(" "); return ""; }
const files = [{ id: "1240:168901", index: 24 }, { id: "1251:2998", index: 28 }, { id: "1240:138404", index: 34 }];
const result = [];
for (const file of files) {
  const code = await readFile(new URL(`design/references/slideout-${file.id.replace(":", "-")}.tsx.txt`, root), "utf8"); const tree = ts.createSourceFile("source.tsx", code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const rows = descendants(tree, node => named(node, "_Feed item base") || named(node, "Avatar label group"));
  result.push({ ...file, rows: rows.map(node => {
    const images = descendants(node, child => ts.isJsxSelfClosingElement(child) && child.tagName.getText() === "img");
    const background = descendants(node, child => attribute(child, "className")?.includes("bg-[#")).map(child => attribute(child, "className")?.match(/bg-\[(#[0-9a-fA-F]+)\]/)?.[1]).find(Boolean);
    const avatarFrame = descendants(node, child => named(child, "Avatar"))[0]; const indicator = avatarFrame ? descendants(avatarFrame, child => attribute(child, "online") !== undefined || (ts.isJsxSelfClosingElement(child) && child.tagName.getText() === "AvatarOnlineIndicator"))[0] : undefined;
    return { id: attribute(node, "data-node-id"), texts: descendants(node, child => ts.isJsxElement(child) && child.openingElement.tagName.getText() === "p").map(child => ({ name: attribute(child, "data-name") ?? "Text", text: text(child) })).filter(child => child.text), images: images.map(child => attribute(child, "src")).filter(Boolean), background, online: indicator ? indicator.getText().includes(" online") : undefined, unread: images.some(child => attribute(child, "src") === "imgDot") };
  }) });
}
await writeFile(new URL("preview/slideout-feed-source-data.ts", root), `export const slideoutFeedSources = ${JSON.stringify(result, null, 2)} as const;\n`);
console.log(result.map(source => `${source.id}: ${source.rows.length} source rows`).join("\n"));
