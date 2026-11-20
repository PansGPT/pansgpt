import { z } from "zod";
import type { ChatMessageContext, ChatMessageView } from "@pansgpt/types";

export const actionModeSchema = z.enum([
  "create_document",
  "make_slides",
  "create_flashcards",
  "plot_graph",
  "create_study_notes",
  "make_revision_sheet",
  "create_mnemonics",
]);
export const messageContextSchema = z.object({
  action_mode: actionModeSchema.nullable().default(null),
  library_document: z
    .object({ id: z.string().uuid(), title: z.string().min(1).max(500) })
    .nullable()
    .default(null),
});
export const emptyMessageContext: ChatMessageContext = {
  action_mode: null,
  library_document: null,
};
export function parseMessageContext(value: unknown): ChatMessageContext | undefined {
  return messageContextSchema.safeParse(value).data;
}
export function contextAtParent(
  messages: readonly ChatMessageView[],
  parent: string | null
): ChatMessageContext | undefined {
  const seen = new Set<string>();
  while (parent && !seen.has(parent)) {
    seen.add(parent);
    const message = messages.find((item) => item.id === parent);
    if (!message) return undefined;
    if (message.role === "user") return message.context ?? undefined;
    parent = message.parentId ?? null;
  }
  return undefined;
}
