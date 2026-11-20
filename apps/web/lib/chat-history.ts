import { z } from "zod";
import { messageContextSchema } from "./message-context.ts";
import { publicProgressLines } from "./chat-message.ts";
import type { ChatMessageView } from "@pansgpt/types";
import { parsePublicProgressUpdates } from "./public-progress.ts";
import { parseCitationGeometry } from "./citation-geometry.ts";
import { publicFailure } from "./chat-recovery.ts";

export const chatAttachmentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  content_type: z.string(),
  size: z.number().int().positive(),
});
const citationSchema = z.object({
  title: z.string(),
  chunk_id: z.string().nullable().optional(),
  document_id: z.string().nullable().optional(),
  source_type: z.enum(["document", "web", "attachment"]).optional(),
  attachment_id: z.string().uuid().nullable().optional(),
  url: z.string().nullable().optional(),
  course_code: z.string().nullable().optional(),
  page_start: z.number().int().positive().nullable().optional(),
  page_end: z.number().int().positive().nullable().optional(),
  snippet: z.string().optional(),
  confidence: z.string().optional(),
  bounding_box: z.unknown().transform(parseCitationGeometry).optional(),
});
const historySchema = z.object({
  session: z.object({ id: z.string().uuid(), user_id: z.string().uuid() }),
  messages: z.array(
    z.object({
      id: z.string().uuid(),
      role: z.enum(["user", "assistant", "system"]),
      context: messageContextSchema.nullish().catch(undefined),
      content: z.string(),
      parent_message_id: z.string().uuid().nullable().optional(),
      is_active_branch: z.boolean().optional(),
      thinking_text: z.string().nullable().optional(),
      completion_warning: z.literal("additional_work_incomplete").nullish().catch(undefined),
      public_progress: z.unknown().optional(),
      citations: z.array(citationSchema).nullable().optional(),
      feedback: z.enum(["positive", "negative"]).nullable().optional(),
      attachment_metadata: z
        .object({
          attachments: z.array(chatAttachmentSchema).optional(),
          message_context: messageContextSchema.optional().catch(undefined),
          chat_run: z
            .object({
              run_id: z.string().uuid(),
              assistant_message_id: z.string().uuid(),
              status: z.enum(["error", "cancelled"]),
              request_id: z.string().uuid().nullish(),
              error_code: z.string().nullish(),
              retryable: z.boolean(),
              tool_started: z.boolean(),
              retry_blocked: z.boolean().optional(),
            })
            .optional()
            .catch(undefined),
        })
        .nullable()
        .optional(),
      extra_parts: z
        .object({
          completion_warning: z.literal("additional_work_incomplete").nullish().catch(undefined),
          tools: z
            .array(
              z.object({
                call_id: z.string(),
                tool_name: z.string(),
                arguments: z.record(z.string(), z.unknown()).optional(),
                status: z.enum(["running", "success", "error"]),
                duration_ms: z.number().optional(),
                result: z.unknown().optional(),
              })
            )
            .optional(),
          artifacts: z
            .array(
              z.object({
                skill_name: z.string(),
                title: z.string().default("Generated artifact"),
                file_extension: z
                  .string()
                  .nullish()
                  .transform((value) => value ?? undefined),
                storage_key: z
                  .string()
                  .nullish()
                  .transform((value) => value ?? undefined),
                download_url: z
                  .string()
                  .nullish()
                  .transform((value) => value ?? undefined),
                content: z
                  .unknown()
                  .transform((value) =>
                    typeof value === "string" ||
                    (typeof value === "object" && value !== null && !Array.isArray(value))
                      ? (value as Record<string, unknown> | string)
                      : undefined
                  ),
              })
            )
            .optional(),
        })
        .nullable()
        .optional(),
    })
  ),
});

export function parseChatHistory(
  data: unknown,
  sessionId: string,
  ownerId: string
): ChatMessageView[] {
  const result = historySchema.parse(data);
  if (result.session.id !== sessionId || result.session.user_id !== ownerId)
    throw new Error("Conversation ownership mismatch.");
  let previous: string | null = null;
  return result.messages.flatMap((item): ChatMessageView[] => {
    if (item.role === "system") return [];
    // Older API fixtures omit tree fields; the live API returns explicit parents.
    const parentId = item.parent_message_id === undefined ? previous : item.parent_message_id;
    previous = item.id;
    const failedRun = item.attachment_metadata?.chat_run;
    const showFailure =
      item.role === "user" &&
      failedRun &&
      !result.messages.some((row) => row.role === "assistant" && row.parent_message_id === item.id);
    const failure = failedRun
      ? publicFailure(
          (failedRun.retry_blocked ?? failedRun.tool_started)
            ? "TOOL_RETRY_BLOCKED"
            : failedRun.error_code || "RUN_FAILED",
          "",
          failedRun.retryable && !(failedRun.retry_blocked ?? failedRun.tool_started)
        )
      : undefined;
    if (failure && failedRun?.request_id) failure.reference = failedRun.request_id;
    return [
      {
        id: item.id,
        parentId,
        isActive: item.is_active_branch ?? true,
        role: item.role,
        content: item.content,
        context: item.context ?? item.attachment_metadata?.message_context,
        status: "complete",
        isSaved: true,
        thinking: publicProgressLines(item.thinking_text ?? undefined).join("\n") || undefined,
        progress: parsePublicProgressUpdates(item.public_progress),
        citations: item.citations ?? undefined,
        tools: item.extra_parts?.tools,
        artifacts: item.extra_parts?.artifacts,
        completionWarning:
          item.completion_warning ?? item.extra_parts?.completion_warning ?? undefined,
        attachments: item.attachment_metadata?.attachments,
        feedback: item.feedback ?? undefined,
      },
      ...(showFailure
        ? [
            {
              id: failedRun.assistant_message_id,
              parentId: item.id,
              isActive: item.is_active_branch ?? true,
              role: "assistant" as const,
              content: "",
              status: failedRun.status,
              isSaved: false,
              error: failedRun.status === "error" ? failure?.message : undefined,
              failure: failedRun.status === "error" ? failure : undefined,
              retryable: failure?.retryable,
            },
          ]
        : []),
    ];
  });
}
