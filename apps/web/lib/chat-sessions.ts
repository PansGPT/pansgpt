import { z } from "zod";
import type { ChatSessionMetadata, ChatSessionUpdateRequest } from "@pansgpt/types";
import type { ChatSearchResponse, ChatTrashResponse } from "@pansgpt/types";
import { env } from "@/env";

export const chatSessionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string(),
  is_pinned: z.boolean().default(false),
  archived_at: z.string().nullable().default(null),
  document_id: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  title_source: z.enum(["pending", "generated", "manual"]).default("pending"),
  last_message_at: z.string().nullable().default(null),
});
export const chatSessionSummarySchema = chatSessionSchema
  .pick({
    id: true,
    title: true,
    is_pinned: true,
    archived_at: true,
  })
  .extend({
    updated_at: z.string().optional(),
    title_source: z.enum(["pending", "generated", "manual"]).optional(),
    last_message_at: z.string().nullable().optional(),
  });
export type ChatSessionSummary = z.infer<typeof chatSessionSummarySchema>;
const base = `${env.NEXT_PUBLIC_API_URL}/api/v1/ai/chat/sessions`;

export async function requestSession(
  token: string | undefined,
  id: string,
  change?: ChatSessionUpdateRequest | "delete",
  signal?: AbortSignal
): Promise<ChatSessionMetadata | null> {
  if (!token) throw new Error("Sign in again before changing this conversation.");
  const response = await fetch(`${base}/${id}${change === undefined ? "/metadata" : ""}`, {
    method: change === undefined ? "GET" : change === "delete" ? "DELETE" : "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(typeof change === "object" ? { body: JSON.stringify(change) } : {}),
    signal,
  });
  if (!response.ok) {
    const failure = z
      .object({ detail: z.string() })
      .safeParse(await response.json().catch(() => null));
    throw new Error(
      failure.success
        ? failure.data.detail
        : "This conversation could not be updated. Please retry."
    );
  }
  if (change === "delete") return null;
  const saved = chatSessionSchema.parse(await response.json());
  if (saved.id !== id) throw new Error("Conversation identity mismatch.");
  return saved;
}

export async function listArchivedSessions(
  token: string | undefined,
  signal: AbortSignal
): Promise<ChatSessionSummary[]> {
  if (!token) throw new Error("Sign in again to view archived chats.");
  const response = await fetch(`${base}?archived=true&limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!response.ok) throw new Error("Archived chats could not be loaded. Please retry.");
  return z.object({ sessions: z.array(chatSessionSummarySchema) }).parse(await response.json())
    .sessions;
}

const searchResponseSchema = z.object({
  results: z.array(
    z.object({
      session_id: z.string().uuid(),
      title: z.string(),
      message_id: z.string().uuid().nullable(),
      snippet: z.string(),
      is_archived: z.boolean(),
      last_message_at: z.string().nullable(),
    })
  ),
  next_offset: z.number().int().nonnegative().nullable(),
});
export async function searchConversations(
  token: string | undefined,
  query: string,
  includeArchived: boolean,
  offset: number,
  signal: AbortSignal
): Promise<ChatSearchResponse> {
  if (!token) throw new Error("Sign in again to search conversations.");
  const params = new URLSearchParams({
    q: query,
    include_archived: String(includeArchived),
    offset: String(offset),
  });
  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1/ai/chat/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!response.ok) throw new Error("Conversation search is unavailable. Please retry.");
  return searchResponseSchema.parse(await response.json());
}
export async function listDeletedSessions(
  token: string | undefined,
  offset: number,
  signal: AbortSignal
): Promise<ChatTrashResponse> {
  if (!token) throw new Error("Sign in again to view deleted conversations.");
  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1/ai/chat/trash?offset=${offset}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!response.ok) throw new Error("Deleted conversations could not be loaded. Please retry.");
  return z
    .object({
      sessions: z.array(chatSessionSchema.extend({ deleted_at: z.string() })),
      next_offset: z.number().int().nullable(),
    })
    .parse(await response.json());
}
export async function restoreSession(
  token: string | undefined,
  id: string,
  signal: AbortSignal
): Promise<ChatSessionMetadata> {
  if (!token) throw new Error("Sign in again to restore this conversation.");
  const response = await fetch(`${base}/${encodeURIComponent(id)}/restore`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!response.ok)
    throw new Error(
      response.status === 404
        ? "The recovery period has ended or this chat is unavailable."
        : "This conversation could not be restored. Please retry."
    );
  const saved = chatSessionSchema.parse(await response.json());
  if (saved.id !== id) throw new Error("Conversation identity mismatch.");
  return saved;
}
