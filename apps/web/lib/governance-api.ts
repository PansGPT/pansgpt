import { z } from "zod";
import type {
  GovernanceAnalytics,
  GovernanceBatchResult,
  GovernanceCommand,
  GovernanceIdentity,
  GovernanceMutation,
  GovernancePage,
  GovernanceResource,
} from "@pansgpt/types";

const resource = z.enum([
  "invitations",
  "universities",
  "students",
  "lecturers",
  "administrators",
  "materials",
  "timetable",
  "exams",
  "restrictions",
  "knowledge",
  "terms",
  "support",
  "audit",
  "settings",
]);
const action = z.enum([
  "create",
  "update",
  "approve",
  "reject",
  "suspend",
  "activate",
  "archive",
  "cancel",
  "delete",
  "restore",
  "retry",
  "resubmit",
  "reply",
]);
const identity = z.object({
  user_id: z.string(),
  name: z.string(),
  role: z.enum(["super_admin", "senior", "standard", "lecturer"]),
  university_id: z.string().nullable(),
  university_name: z.string(),
  resources: z.array(resource),
});
const page = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      subtitle: z.string(),
      status: z.string(),
      updated_at: z.string(),
      fields: z.record(z.string(), z.string()),
      actions: z.array(action),
    })
  ),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
});
const analytics = z.object({
  metrics: z.array(z.object({ label: z.string(), value: z.number(), unit: z.string() })),
  daily: z.array(z.object({ date: z.string(), requests: z.number(), tokens: z.number() })),
  providers: z.array(
    z.object({
      provider: z.string(),
      requests: z.number(),
      tokens: z.number(),
      latency_ms: z.number(),
      failures: z.number(),
    })
  ),
});
export interface GovernanceAdapter {
  identity(signal: AbortSignal): Promise<GovernanceIdentity>;
  list(
    resource: GovernanceResource,
    query: URLSearchParams,
    signal: AbortSignal
  ): Promise<GovernancePage>;
  analytics(query: URLSearchParams, signal: AbortSignal): Promise<GovernanceAnalytics>;
  mutate(
    resource: GovernanceResource,
    query: URLSearchParams,
    command: GovernanceCommand,
    signal: AbortSignal
  ): Promise<GovernanceMutation>;
  upload(file: File, fields: Record<string, string>, signal: AbortSignal): Promise<string>;
  download(
    id: string,
    query: URLSearchParams,
    signal: AbortSignal
  ): Promise<{ blob: Blob; filename: string }>;
  batch(
    query: URLSearchParams,
    commands: GovernanceCommand[],
    signal: AbortSignal
  ): Promise<GovernanceBatchResult>;
}
export class GovernanceError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}
export function createGovernanceApi(token: string): GovernanceAdapter {
  async function request<T>(
    path: string,
    schema: z.ZodType<T>,
    signal: AbortSignal,
    body?: unknown
  ): Promise<T> {
    const response = await fetch(`/api/governance/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
      cache: "no-store",
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const error = z.object({ detail: z.string() }).safeParse(data);
      throw new GovernanceError(
        error.success ? error.data.detail : "Check the form values and try again.",
        response.status
      );
    }
    const parsed = schema.safeParse(data);
    if (!parsed.success)
      throw new GovernanceError(
        "The service returned an unexpected response. Please refresh and try again.",
        502
      );
    return parsed.data;
  }
  return {
    identity: (signal) => request("identity", identity, signal),
    async download(id, query, signal) {
      const response = await fetch(
        `/api/governance/materials/${encodeURIComponent(id)}/file?${query}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal }
      );
      if (!response.ok)
        throw new GovernanceError(
          "This material could not be downloaded. Please retry.",
          response.status
        );
      const encoded = response.headers
        .get("Content-Disposition")
        ?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
      let filename = "course-material";
      try {
        if (encoded) filename = decodeURIComponent(encoded);
      } catch {
        /* Use a safe default filename. */
      }
      return { blob: await response.blob(), filename };
    },
    list: (resource, query, signal) => request(`${resource}?${query}`, page, signal),
    analytics: (query, signal) => request(`analytics?${query}`, analytics, signal),
    mutate: (resource, query, command, signal) =>
      request(
        `${resource}?${query}`,
        z.object({
          id: z.string(),
          message: z.string(),
          invite_url: z.string().url().nullable().optional(),
        }),
        signal,
        command
      ),
    batch: (query, commands, signal) =>
      request(
        `students/batch?${query}`,
        z.object({
          items: z.array(z.object({ id: z.string(), success: z.boolean(), message: z.string() })),
        }),
        signal,
        { commands }
      ),
    async upload(file, fields, signal) {
      const mime: Record<string, string> = {
        pdf: "application/pdf",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ppt: "application/vnd.ms-powerpoint",
        pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      };
      const type = mime[file.name.split(".").pop()?.toLowerCase() ?? ""];
      if (!type || file.size === 0 || file.size > 50 * 1024 * 1024)
        throw new GovernanceError(
          "Choose a PDF, Word or PowerPoint file between 1 byte and 50 MB.",
          422
        );
      const upload = await request(
        `upload${fields.university_id ? `?university_id=${encodeURIComponent(fields.university_id)}` : ""}`,
        z.object({ document_id: z.string(), presigned_upload_url: z.string().url() }),
        signal,
        {
          title: fields.title,
          course_code: fields.course_code.toUpperCase(),
          course_title: fields.course_title,
          target_levels: [fields.target_level],
          academic_session: fields.academic_session,
          semester: fields.semester,
          file_name: file.name,
          mime_type: type,
          file_size_bytes: file.size,
        }
      );
      const target = new URL(upload.presigned_upload_url);
      if (target.protocol !== "https:")
        throw new GovernanceError("A secure upload URL was not available. Please retry.", 502);
      const put = await fetch(target, {
        method: "PUT",
        headers: { "Content-Type": type },
        body: file,
        signal,
        credentials: "omit",
        redirect: "error",
      });
      if (!put.ok)
        throw new GovernanceError("The file could not be uploaded. Please retry.", put.status);
      await request(
        `uploads/${upload.document_id}/confirm`,
        z.object({ document_id: z.string() }),
        signal,
        {}
      );
      return upload.document_id;
    },
  };
}
