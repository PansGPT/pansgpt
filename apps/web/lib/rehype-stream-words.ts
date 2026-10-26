/** Structural subset of HAST; avoids adding a runtime or type-only dependency. */
interface StreamNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: StreamNode[];
  position?: { start: { offset?: number } };
}

/** Wrap prose only. Code, math and SVG remain owned by their existing renderers. */
export function rehypeStreamWords(): (tree: StreamNode) => void {
  return (tree) => {
    function walk(parent: StreamNode): void {
      if (!parent.children) return;
      for (let index = 0; index < parent.children.length; index++) {
        const node = parent.children[index];
        if (!node) continue;
        if (node.type === "element") {
          const classes = node.properties?.className;
          if (
            ["code", "pre", "math", "svg", "script", "style"].includes(node.tagName ?? "") ||
            (Array.isArray(classes) && classes.some((name) => String(name).includes("katex")))
          )
            continue;
          walk(node);
        } else if (
          node.type === "text" &&
          node.value &&
          node.position?.start.offset !== undefined
        ) {
          const start = node.position.start.offset;
          const words: StreamNode[] = Array.from(node.value.matchAll(/\S+|\s+/gu), (match) => {
            if (/^\s+$/u.test(match[0])) return { type: "text", value: match[0] };
            return {
              type: "element",
              tagName: "span",
              properties: { "data-stream-offset": start + match.index },
              children: [{ type: "text", value: match[0] }],
            };
          });
          parent.children.splice(index, 1, ...words);
          index += words.length - 1;
        }
      }
    }
    walk(tree);
  };
}
