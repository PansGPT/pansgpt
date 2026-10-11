import { readFile, writeFile } from "node:fs/promises";
import ts from "typescript";
const root = new URL("../", import.meta.url);
const layouts = JSON.parse(await readFile(new URL("design/table-layouts.json", root), "utf8"));
const order = ["1227:110480", "1229:12388", "1227:121348", "1229:12040", "1227:115509", "1229:11893", "1229:2364", "1229:12241", "1227:110588", "1229:15727", "1227:115298", "1229:17412", "1229:543", "1229:18422", "1229:7899", "1229:19933"];
let currentTree;
function attr(node, name) {
  const opening = ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : undefined;
  const value = opening?.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.text === name)?.initializer;
  if (value && ts.isStringLiteral(value)) return value.text;
  if (value && ts.isJsxExpression(value) && value.expression) return ts.isIdentifier(value.expression) || ts.isStringLiteral(value.expression) ? value.expression.text : value.expression.getText();
}
function find(node, predicate) { const result = []; const visit = child => { if (predicate(child)) result.push(child); ts.forEachChild(child, visit); }; ts.forEachChild(node, visit); return result; }
function text(node) {
  if (ts.isJsxText(node)) return node.text.replace(/\s+/g, " ").trim();
  if (ts.isJsxExpression(node) && node.expression && (ts.isStringLiteral(node.expression) || ts.isNoSubstitutionTemplateLiteral(node.expression))) return node.expression.text;
  if (ts.isJsxElement(node) || ts.isJsxFragment(node)) return node.children.map(text).filter(Boolean).join(" ");
  return "";
}
function content(node) {
  if (!node) throw new Error("Missing source cell");
  if (ts.isJsxSelfClosingElement(node) && ["TableCell", "TableHeaderCell"].includes(node.tagName.getText())) {
    const helper = currentTree.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === node.tagName.getText());
    const returned = find(helper, n => ts.isReturnStatement(n) && n.expression).at(-1);
    if (!returned) throw new Error("Missing repeated cell helper");
    const conditionValues = {};
    const evaluate = n => {
      if (ts.isParenthesizedExpression(n)) return evaluate(n.expression);
      if (ts.isIdentifier(n)) return conditionValues[n.text];
      if (ts.isStringLiteral(n)) return n.text;
      if (n.kind === ts.SyntaxKind.TrueKeyword) return true;
      if (n.kind === ts.SyntaxKind.FalseKeyword) return false;
      if (ts.isBinaryExpression(n)) { const a = evaluate(n.left), b = evaluate(n.right); if (n.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken) return a === b; if (n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) return a && b; if (n.operatorToken.kind === ts.SyntaxKind.BarBarToken) return a || b; }
    };
    const bindings = helper.parameters[0]?.name;
    if (bindings && ts.isObjectBindingPattern(bindings)) for (const binding of bindings.elements) {
      const name = binding.name.getText(); const supplied = attr(node, name);
      conditionValues[name] = supplied === "true" ? true : supplied === "false" ? false : supplied ?? (binding.initializer ? evaluate(binding.initializer) : undefined);
    }
    for (const statement of find(helper, n => ts.isVariableDeclaration(n) && n.initializer)) conditionValues[statement.name.getText()] = evaluate(statement.initializer);
    const selected = [];
    const visit = n => {
      if (ts.isConditionalExpression(n)) { const value = evaluate(n.condition); if (value !== undefined) { visit(value ? n.whenTrue : n.whenFalse); return; } }
      if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) { const value = evaluate(n.left); if (value !== undefined) { if (value) visit(n.right); return; } }
      if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) selected.push(n);
      ts.forEachChild(n, visit);
    };
    visit(returned.expression);
    return nodeContent(selected);
  }
  const nodes = [node, ...find(node, n => ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n))];
  return nodeContent(nodes);
}
function nodeContent(nodes) {
  return {
    texts: nodes.filter(n => ts.isJsxElement(n) && n.openingElement.tagName.getText() === "p").map(n => ({ name: attr(n, "data-name") ?? "Text", text: text(n), style: attr(n, "className") ?? "" })),
    images: nodes.filter(n => ts.isJsxSelfClosingElement(n) && n.tagName.getText() === "img").map(n => ({ src: attr(n, "src"), style: attr(n, "className") ?? "" })),
    backgrounds: nodes.map(n => attr(n, "className")?.match(/bg-\[(#[0-9a-fA-F]+)\]/)?.[1]).filter(Boolean),
    blocks: nodes.filter(n => ["Table cell", "Avatar", "Badge", "File type icon", "File type wrap", "Text and supporting text"].includes(attr(n, "data-name"))).map(n => ({ name: attr(n, "data-name"), style: attr(n, "className") ?? "", texts: find(n, c => ts.isJsxElement(c) && c.openingElement.tagName.getText() === "p").map(text) })),
    controls: nodes.filter(n => ts.isJsxSelfClosingElement(n) && !["img", "div", "span"].includes(n.tagName.getText())).map(n => ({ name: n.tagName.getText(), style: attr(n, "className") ?? "", value: attr(n, "fill") ?? attr(n, "online") ?? attr(n, "type") ?? "" })),
  };
}
const result = [];
for (const layout of layouts) {
  const code = await readFile(new URL(`design/references/table-${layout.id.replace(":", "-")}.tsx.txt`, root), "utf8");
  const tree = ts.createSourceFile("source.tsx", code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  currentTree = tree;
  const nodes = find(tree, n => ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n));
  const get = (id, columnIndex, cellIndex) => {
    const node = nodes.find(n => attr(n, "data-node-id") === id);
    if (node) return node;
    const columns = nodes.filter(n => attr(n, "data-name") === "Column");
    const candidates = find(columns[columnIndex], n => ["Table header cell", "Table cell"].includes(attr(n, "data-name")) || (ts.isJsxSelfClosingElement(n) && ["TableCell", "TableHeaderCell"].includes(n.tagName.getText())));
    if (!candidates[cellIndex]) throw new Error(`Missing ${layout.id} cell ${id}, column ${columnIndex}, row ${cellIndex}`);
    return candidates[cellIndex];
  };
  const header = nodes.find(n => attr(n, "data-name") === "Card header");
  result.push({ ...layout, assetIndex: order.indexOf(layout.id) + 5, headerContent: header ? content(header) : null, columns: layout.columns.map((column, ci) => ({ ...column, cells: column.cells.map((cell, ri) => ({ ...cell, content: content(get(cell.id, ci, ri)) })) })) });
}
await writeFile(new URL("preview/table-content-data.ts", root), `import type { TableSource } from "./table-source-types";\nexport const tableContentSources: TableSource[] = ${JSON.stringify(result)};\n`);
const primitiveCode = await readFile(new URL("design/references/table-1222-107305.tsx.txt", root), "utf8");
const primitiveTree = ts.createSourceFile("source.tsx", primitiveCode, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const variants = find(primitiveTree, n => ts.isJsxElement(n) && attr(n, "data-name")?.startsWith("Type="));
await writeFile(new URL("preview/table-cell-content-data.ts", root), `import type { SourceCellContent } from "./table-source-types";\nexport const tableCellContents: (SourceCellContent & { id: string; name: string })[] = ${JSON.stringify(variants.map(n => ({ id: attr(n, "data-node-id"), name: attr(n, "data-name"), ...content(n) })))};\n`);
console.log(JSON.stringify({ tables: result.length, cells: result.reduce((sum, source) => sum + source.columns.reduce((s, c) => s + c.cells.length, 0), 0), primitiveBranches: variants.length, firstCells: result[0].columns.map(c => c.cells[1].content) }, null, 2));
