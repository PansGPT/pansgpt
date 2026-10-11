import { readFile, writeFile } from "node:fs/promises";
import ts from "typescript";
const root = new URL("../", import.meta.url);
const code = await readFile(new URL("design/references/navigation-1157-90307.tsx.txt", root), "utf8");
const tree = ts.createSourceFile("source.tsx", code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = tree.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === "NavFeaturedCard");
const types = ["Progress bar", "Image", "Progress circle", "Cookie preferences", "Current projects", "Referral link", "Onboarding steps", "Upgrade CTA", "Support CTA", "Event CTA", "Message", "Free trial CTA", "QR code"];
function find(node, predicate) { const out = []; const visit = n => { if (predicate(n)) out.push(n); ts.forEachChild(n, visit); }; ts.forEachChild(node, visit); return out; }
const result = [];
for (const type of types) {
  const env = { type, xCloseButton: true };
  function evaluate(n) {
    if (!n) return undefined;
    if (ts.isParenthesizedExpression(n)) return evaluate(n.expression);
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text;
    if (ts.isNumericLiteral(n)) return Number(n.text);
    if (n.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (n.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (ts.isIdentifier(n)) return Object.hasOwn(env, n.text) ? env[n.text] : n.text.startsWith("img") ? n.text : undefined;
    if (ts.isArrayLiteralExpression(n)) return n.elements.map(evaluate);
    if (ts.isPrefixUnaryExpression(n) && n.operator === ts.SyntaxKind.ExclamationToken) return !evaluate(n.operand);
    if (ts.isBinaryExpression(n)) { const a=evaluate(n.left), b=evaluate(n.right); if(n.operatorToken.kind===ts.SyntaxKind.EqualsEqualsEqualsToken)return a===b; if(n.operatorToken.kind===ts.SyntaxKind.AmpersandAmpersandToken)return a&&b; if(n.operatorToken.kind===ts.SyntaxKind.BarBarToken)return a||b; }
    if (ts.isConditionalExpression(n)) return evaluate(evaluate(n.condition) ? n.whenTrue : n.whenFalse);
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === "includes") { const receiver = evaluate(n.expression.expression); return receiver?.includes(evaluate(n.arguments[0])); }
    if (ts.isTaggedTemplateExpression(n)) return evaluate(n.template);
    if (ts.isTemplateExpression(n)) return n.head.text + n.templateSpans.map(span => String(evaluate(span.expression) ?? "") + span.literal.text).join("");
  }
  function attr(node, name) {
    const opening = ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : undefined;
    const value = opening?.attributes.properties.find(p=>ts.isJsxAttribute(p)&&p.name.text===name)?.initializer;
    return value && ts.isStringLiteral(value) ? value.text : value && ts.isJsxExpression(value) ? evaluate(value.expression) : undefined;
  }
  for (const declaration of find(component, n => ts.isVariableDeclaration(n) && n.initializer)) env[declaration.name.getText()] = evaluate(declaration.initializer);
  const returned = find(component, n=>ts.isReturnStatement(n)&&n.expression).at(-1);
  const nodes=[];
  function visit(n) {
    if(ts.isConditionalExpression(n)){ const value=evaluate(n.condition); if(value!==undefined){visit(value?n.whenTrue:n.whenFalse);return;} }
    if(ts.isBinaryExpression(n)&&n.operatorToken.kind===ts.SyntaxKind.AmpersandAmpersandToken){const value=evaluate(n.left);if(value!==undefined){if(value)visit(n.right);return;}}
    if(ts.isJsxElement(n)||ts.isJsxSelfClosingElement(n))nodes.push(n);
    ts.forEachChild(n,visit);
  }
  visit(returned.expression);
  function text(n) { if(ts.isJsxText(n))return n.text.replace(/\s+/g," ").trim();if(ts.isJsxExpression(n))return String(evaluate(n.expression)??"");if(ts.isJsxElement(n)||ts.isJsxFragment(n))return n.children.map(text).filter(Boolean).join(" ");return ""; }
  function image(n) { let avatar=n.parent; while(avatar && attr(avatar,"data-name")!=="Avatar") avatar=avatar.parent; const background=avatar?find(avatar,c=>attr(c,"className")?.match?.(/bg-\[(#[0-9a-f]+)\]/i)).map(c=>attr(c,"className").match(/bg-\[(#[0-9a-f]+)\]/i)[1])[0]:undefined; return {name:attr(n,"src"),style:attr(n,"className")??"",background:background??null}; }
  result.push({type,texts:nodes.filter(n=>ts.isJsxElement(n)&&n.openingElement.tagName.getText()==="p").map(n=>({text:text(n),style:attr(n,"className")??""})),images:nodes.filter(n=>ts.isJsxSelfClosingElement(n)&&n.tagName.getText()==="img").map(image),blocks:nodes.filter(n=>attr(n,"data-name")).map(n=>({name:attr(n,"data-name"),style:attr(n,"className")??""})),controls:nodes.filter(n=>ts.isJsxSelfClosingElement(n)&&n.tagName.getText()!=="img").map(n=>({name:n.tagName.getText(),style:attr(n,"className")??""}))});
}
await writeFile(new URL("preview/nav-featured-content-data.ts",root),`export const navFeaturedContents = ${JSON.stringify(result,null,2)} as const;\n`);
console.log(JSON.stringify(result.map(r=>({type:r.type,texts:r.texts.map(t=>t.text),images:r.images.map(i=>i.name),controls:r.controls})),null,2));
