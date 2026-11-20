import test from "node:test";
import assert from "node:assert/strict";
import { contextAtParent, parseMessageContext } from "../lib/message-context.ts";
import { SSEEventStreamReader } from "../lib/sse-parser.ts";

const doc = "018f3a30-0001-7000-8000-000000000001";
const source = {
  action_mode: "create_flashcards",
  library_document: { id: doc, title: "Synthetic source" },
};
test("message selections are typed and canonical init context is preserved", () => {
  assert.deepEqual(parseMessageContext(source), source);
  assert.equal(parseMessageContext({ ...source, action_mode: "invented" }), undefined);
  const [event] = new SSEEventStreamReader().push(
    `event: init\ndata: ${JSON.stringify({ context: source })}\n\n`
  );
  assert.deepEqual(event.data.context, source);
});
test("source inheritance follows the chosen branch and respects explicit clearing", () => {
  const messages = [
    { id: "u1", role: "user", context: source, parentId: null },
    { id: "a1", role: "assistant", parentId: "u1" },
    {
      id: "u2",
      role: "user",
      parentId: "a1",
      context: { action_mode: null, library_document: null },
    },
    { id: "a2", role: "assistant", parentId: "u2" },
    {
      id: "other",
      role: "user",
      parentId: null,
      context: { action_mode: null, library_document: { id: doc, title: "Other branch" } },
    },
  ];
  assert.deepEqual(contextAtParent(messages, "a1"), source);
  assert.equal(contextAtParent(messages, "a2").library_document, null);
  assert.equal(contextAtParent(messages, null), undefined);
  assert.equal(
    contextAtParent([{ id: "cycle", role: "assistant", parentId: "cycle" }], "cycle"),
    undefined
  );
});
