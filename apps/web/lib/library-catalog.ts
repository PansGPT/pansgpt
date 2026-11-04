import { z } from "zod";
import type {
  LibraryCatalogResponse,
  LibraryPdfLinkResponse,
  LibraryOpenedResponse,
} from "@pansgpt/types";

export const libraryDocumentSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  course_code: z.string(),
  course_title: z.string(),
  topic: z.string().nullable(),
  lecturer_name: z.string().nullable(),
  page_count: z.number().int().nonnegative(),
  file_size_bytes: z.number().int().nonnegative(),
  mime_type: z.string(),
  status: z.enum(["pending_review", "active", "rejected", "archived"]),
  embedding_status: z.string(),
  target_levels: z.array(z.string()),
  academic_session: z.string().nullable(),
  semester: z.enum(["first", "second"]).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  last_opened_at: z.string().nullable(),
  last_page_read: z.number().int().positive().nullable(),
});

export const catalogSchema: z.ZodType<LibraryCatalogResponse> = z.object({
  items: z.array(libraryDocumentSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
  courses: z.array(
    z.object({
      code: z.string(),
      title: z.string(),
      document_count: z.number().int().nonnegative(),
    })
  ),
  academic_sessions: z.array(z.string()),
});

export const pdfLinkSchema: z.ZodType<LibraryPdfLinkResponse> = z.object({
  document_id: z.uuid(),
  presigned_url: z.url().refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  }),
  expires_in_seconds: z.number().int().positive().max(900),
});

export const openedSchema: z.ZodType<LibraryOpenedResponse> = z.object({
  document_id: z.uuid(),
  last_opened_at: z.string(),
  last_page_read: z.number().int().positive(),
  total_pages: z.number().int().nonnegative(),
});

export function fileSize(bytes: number): string {
  if (!bytes) return "Size unavailable";
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function materialDate(date: string): string {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? "Date unavailable"
    : parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function readingDateGroup(value: string | null, now: Date = new Date()): string {
  if (!value) return "Earlier";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Earlier";
  const day = (input: Date): number =>
    Date.UTC(input.getFullYear(), input.getMonth(), input.getDate());
  const days = (day(now) - day(date)) / 86400000;
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days > 1 && days <= 7) return "Previous 7 days";
  return days < 0 ? materialDate(value) : "Earlier";
}

export async function libraryError(response: Response, fallback: string): Promise<Error> {
  if (response.status === 401) return new Error("Your session has expired. Please sign in again.");
  if (response.status === 403)
    return new Error("Your account does not have access to this library.");
  if (response.status === 404) return new Error("This document is no longer available.");
  if (response.status === 409)
    return new Error("The PDF is still being prepared. Please try again shortly.");
  return new Error(fallback);
}
