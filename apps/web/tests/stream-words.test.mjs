import test from "node:test";
import assert from "node:assert/strict";
import { rehypeStreamWords } from "../lib/rehype-stream-words.ts";

test("streamed prose keeps whitespace and source offsets while code and math remain intact", () => {
  const text = (value, offset) => ({ type: "text", value, position: { start: { offset } } });
  const code = {
    type: "element",
    tagName: "pre",
    properties: {},
    children: [text("const x = 1", 40)],
  };
  const math = {
    type: "element",
    tagName: "span",
    properties: { className: ["katex"] },
    children: [text("x + y", 70)],
  };
  const tree = {
    type: "root",
    children: [
      { type: "element", tagName: "p", properties: {}, children: [text("Two  words\n", 0)] },
      code,
      math,
    ],
  };
  rehypeStreamWords()(tree);
  const words = tree.children[0].children;
  assert.equal(words.map((node) => node.value ?? node.children[0].value).join(""), "Two  words\n");
  assert.deepEqual(
    words
      .filter((node) => node.type === "element")
      .map((node) => node.properties["data-stream-offset"]),
    [0, 5]
  );
  assert.equal(code.children[0].type, "text");
  assert.equal(math.children[0].type, "text");
});
