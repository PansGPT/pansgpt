import { z } from "zod";
import { publicProgressLines } from "./chat-message";
import type { ChatMessageView } from "@pansgpt/types";

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
  source_type: z.enum(["document", "web"]).optional(),
  url: z.string().nullable().optional(),
  course_code: z.string().nullable().optional(),
  page_start: z.number().int().positive().nullable().optional(),
  page_end: z.number().int().positive().nullable().optional(),
  snippet: z.string().optional(),
  confidence: z.string().optional(),
});
const historySchema = z.object({
  session: z.object({ id: z.string().uuid(), user_id: z.string().uuid() }),
  messages: z.array(
    z.object({
      id: z.string().uuid(),
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
      parent_message_id: z.string().uuid().nullable().optional(),
      is_active_branch: z.boolean().optional(),
      thinking_text: z.string().nullable().optional(),
      citations: z.array(citationSchema).nullable().optional(),
      feedback: z.enum(["positive", "negative"]).nullable().optional(),
      attachment_metadata: z
        .object({ attachments: z.array(chatAttachmentSchema).optional() })
        .nullable()
        .optional(),
      extra_parts: z
        .object({
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
                file_extension: z.string().optional(),
                storage_key: z.string().optional(),
                download_url: z.string().optional(),
                content: z.record(z.string(), z.unknown()).optional(),
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
    return [
      {
        id: item.id,
        parentId,
        isActive: item.is_active_branch ?? true,
        role: item.role,
        content: item.content,
        status: "complete",
        isSaved: true,
        thinking: publicProgressLines(item.thinking_text ?? undefined).join("\n") || undefined,
        citations: item.citations ?? undefined,
        tools: item.extra_parts?.tools,
        artifacts: item.extra_parts?.artifacts,
        attachments: item.attachment_metadata?.attachments,
        feedback: item.feedback ?? undefined,
      },
    ];
  });
}
