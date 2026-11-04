import assert from "node:assert/strict";
import test from "node:test";
import { chatSessionUrl, newChatUrl, cleanChatParams } from "../lib/chat-navigation.ts";

test("chatSessionUrl routes mobile devices to Home bottom sheet query and desktop to chat page", () => {
  const sessionId = "00000000-0000-4000-8000-000000000123";
  assert.equal(chatSessionUrl(sessionId, true), `/app?session=${sessionId}`);
  assert.equal(chatSessionUrl(sessionId, false), `/app/chat?session=${sessionId}`);
  assert.equal(chatSessionUrl("special/id with space", true), "/app?session=special%2Fid%20with%20space");
});

test("newChatUrl routes mobile devices to Home chat=new query and desktop to /app/chat", () => {
  assert.equal(newChatUrl(true), "/app?chat=new");
  assert.equal(newChatUrl(false), "/app/chat");
});

test("cleanChatParams strips session and chat query parameters without losing pathname or other params", () => {
  assert.equal(cleanChatParams("?session=123", "/app"), "/app");
  assert.equal(cleanChatParams("?chat=new", "/app"), "/app");
  assert.equal(cleanChatParams("?session=123&filter=all", "/app"), "/app?filter=all");
  assert.equal(cleanChatParams("", "/app"), "/app");
});
