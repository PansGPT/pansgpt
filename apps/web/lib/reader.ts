import { z } from "zod";
import type {
  ReaderHighlight,
  ReaderResponse,
  ReaderHighlightsResponse,
  ReaderSelection,
  ReaderRect,
} from "@pansgpt/types";
import { libraryDocumentSchema } from "./library-catalog";

export const readerSchema: z.ZodType<ReaderResponse> = z.object({
  document: libraryDocumentSchema,
  chat_session_id: z.uuid().nullable(),
});
export const readerRectSchema: z.ZodType<ReaderRect> = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().positive().max(1),
    height: z.number().positive().max(1),
  })
  .refine((rect) => rect.x + rect.width <= 1.00001 && rect.y + rect.height <= 1.00001);
export const highlightSchema: z.ZodType<ReaderHighlight> = z.object({
  id: z.uuid(),
  document_id: z.uuid(),
  page_number: z.number().int().positive(),
  color: z.enum(["yellow", "green", "blue", "pink"]),
  selected_text: z.string().min(1).max(6000),
  rects: z.array(readerRectSchema).min(1).max(100),
  created_at: z.string(),
});
export const highlightsSchema: z.ZodType<ReaderHighlightsResponse> = z.object({
  items: z.array(highlightSchema),
  next_offset: z.number().int().nonnegative().nullable(),
});

export type SelectionAction =
  "ask" | "explain" | "define" | "example" | "summarize" | "answer" | "memory";
export const selectionActions: { id: SelectionAction; label: string; prompt: string }[] = [
  { id: "ask", label: "Ask AI", prompt: "Help me understand this passage." },
  { id: "explain", label: "Explain", prompt: "Explain this passage clearly, step by step." },
  { id: "define", label: "Define", prompt: "Define the key terms in this passage." },
  { id: "example", label: "Example", prompt: "Give an example that helps explain this passage." },
  { id: "summarize", label: "Summarize", prompt: "Summarize the key points in this passage." },
  {
    id: "answer",
    label: "Answer",
    prompt: "Answer the question in this passage using the document.",
  },
  {
    id: "memory",
    label: "Memory Aid",
    prompt: "Create a memorable study mnemonic for this passage.",
  },
];
export function selectionPrompt(selection: ReaderSelection, action: SelectionAction): string {
  return `${selectionActions.find((item) => item.id === action)!.prompt}\n\n${selection.text}`;
}

/** Clamp a screen rectangle to the page before normalizing; discard empty line fragments. */
export function normalizeRect(
  rect: { left: number; top: number; right: number; bottom: number },
  page: { left: number; top: number; width: number; height: number }
): ReaderRect | null {
  if (page.width <= 0 || page.height <= 0) return null;
  const left = Math.max(page.left, rect.left),
    top = Math.max(page.top, rect.top);
  const right = Math.min(page.left + page.width, rect.right),
    bottom = Math.min(page.top + page.height, rect.bottom);
  if (right - left < 1 || bottom - top < 1) return null;
  return {
    x: (left - page.left) / page.width,
    y: (top - page.top) / page.height,
    width: (right - left) / page.width,
    height: (bottom - top) / page.height,
  };
}
