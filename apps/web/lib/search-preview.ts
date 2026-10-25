import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";

type PreviewNode = {
  type: string;
  value?: string;
  alt?: string | null;
  children?: PreviewNode[];
};
const blockContainers = new Set(["root", "blockquote", "list", "listItem", "table", "tableRow"]);

function previewText(node: PreviewNode): string {
  if (node.type === "html" || node.type === "definition" || node.type === "footnoteDefinition")
    return "";
  if (node.type === "image" || node.type === "imageReference") return node.alt ?? "";
  if (node.type === "break") return " ";
  if (typeof node.value === "string") {
    // Server excerpts may start/end inside emphasis. Keep literal code untouched.
    return node.type === "text"
      ? node.value
          .replace(/(^|[\s…])(?:\*\*|__|~~)(?=\S)/g, "$1")
          .replace(/(\S)(?:\*\*|__|~~)(?=$|[\s….,;:!?])/g, "$1")
      : node.value;
  }
  return (node.children ?? []).map(previewText).join(blockContainers.has(node.type) ? " " : "");
}

/** Compact, noninteractive text from Markdown; no HTML or links are rendered. */
export function searchPreviewText(markdown: string): string {
  const tree = fromMarkdown(markdown, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  });
  return previewText(tree).replace(/\s+/g, " ").trim();
}
