import { z } from "zod";
import type { ChatMessageView, ChatRunSnapshot } from "@pansgpt/types";
import { SSEEventStreamReader } from "./sse-parser.ts";
import { parsePublicProgressUpdates, parseProgressCode } from "./public-progress.ts";
import { publicFailure } from "./chat-recovery.ts";

const id = z.string().uuid().nullish();
const schema = z.object({
  run_id: id,
  status: z.enum(["idle", "running", "complete", "error", "cancelled", "interrupted"]),
  request_id: id,
  user_message_id: id,
  assistant_message_id: id,
  content: z.string().max(500000).default(""),
  citations: z.array(z.unknown()).max(100).default([]),
  artifacts: z.array(z.unknown()).max(32).default([]),
  tools: z
    .array(
      z.object({
        call_id: z.string(),
        tool_name: z.string(),
        status: z.enum(["running", "success", "error"]),
      })
    )
    .max(64)
    .default([]),
  public_progress: z.unknown().optional(),
  error_code: z.string().nullish(),
  completion_warning: z.literal("additional_work_incomplete").nullish().catch(undefined),
  retryable: z.boolean().default(true),
  tool_started: z.boolean().default(false),
  retry_blocked: z.boolean().optional(),
  activity: z.unknown().optional(),
  elapsed_ms: z.number().int().min(0).default(0),
});
export function parseRunSnapshot(input: unknown): ChatRunSnapshot | null {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return null;
  const value = parsed.data;
  const reader = new SSEEventStreamReader();
  const events = reader.push(
    `event: citations\ndata: ${JSON.stringify(value.citations)}\n\n` +
      value.artifacts
        .map((artifact) => `event: artifact_ready\ndata: ${JSON.stringify(artifact)}\n\n`)
        .join("")
  );
  return {
    ...value,
    run_id: value.run_id ?? null,
    activity: parseProgressCode(value.activity),
    citations: events.flatMap((event) => (event.event === "citations" ? event.data : [])),
    artifacts: events.flatMap((event) => (event.event === "artifact_ready" ? [event.data] : [])),
    public_progress: parsePublicProgressUpdates(value.public_progress),
  };
}
export function recoveredMessage(snapshot: ChatRunSnapshot): ChatMessageView | null {
  if (!snapshot.assistant_message_id || !snapshot.user_message_id || snapshot.status === "idle")
    return null;
  const failure =
    snapshot.status === "error" || snapshot.status === "interrupted"
      ? publicFailure(
          (snapshot.retry_blocked ?? snapshot.tool_started)
            ? "TOOL_RETRY_BLOCKED"
            : snapshot.error_code || "RUN_FAILED",
          "",
          snapshot.retryable && !(snapshot.retry_blocked ?? snapshot.tool_started)
        )
      : undefined;
  if (failure && snapshot.request_id) failure.reference = snapshot.request_id;
  return {
    id: snapshot.assistant_message_id,
    parentId: snapshot.user_message_id,
    role: "assistant",
    isActive: true,
    content: snapshot.content,
    status: snapshot.status === "interrupted" ? "error" : snapshot.status,
    isSaved: snapshot.status === "complete",
    tools: snapshot.tools,
    artifacts: snapshot.artifacts,
    completionWarning: snapshot.completion_warning ?? undefined,
    citations: snapshot.citations,
    progress: snapshot.public_progress,
    activity: snapshot.activity ?? snapshot.public_progress.at(-1)?.code,
    delayed: snapshot.status === "running" && (snapshot.elapsed_ms ?? 0) >= 30000,
    error: failure?.message,
    failure,
    retryable: failure?.retryable,
  };
}

// Keep only cancellation handles while a view is detached, never persisted chat
// content. Auth disposal cancels old-account work; navigation does not.
const transports = new Set<{ owner: string; cancel: () => void }>();
export function trackChatTransport(owner: string, cancel: () => void): () => void {
  const entry = { owner, cancel };
  transports.add(entry);
  return () => transports.delete(entry);
}
export function disposeChatTransports(keepOwner?: string): void {
  for (const entry of transports)
    if (entry.owner !== keepOwner) {
      transports.delete(entry);
      entry.cancel();
    }
}
