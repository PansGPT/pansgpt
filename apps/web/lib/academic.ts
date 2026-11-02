import { z } from "zod";
import type {
  HomeDashboardDto,
  StudentTaskCreateRequest,
  StudentTaskDto,
  StudentTaskUpdateRequest,
  TimetableCreateRequest,
  TimetableEntryDto,
  TimetableOccurrenceDto,
  TimetableUpdateRequest,
} from "@pansgpt/types";

const taskSchema: z.ZodType<StudentTaskDto> = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
  course_code: z.string().nullable(),
  task_type: z.enum(["class", "reading", "assignment", "lab", "presentation", "meeting", "custom"]),
  due_date: z.string(),
  due_time: z.string().nullable(),
  is_completed: z.boolean(),
  is_favorite: z.boolean(),
  completed_at: z.string().nullable(),
  source: z.enum(["custom", "timetable", "ai_generated"]),
  created_at: z.string(),
});

const validationErrorSchema = z.array(
  z.object({
    loc: z.array(z.union([z.string(), z.number()])),
    msg: z.string(),
  })
);

const occurrenceSchema: z.ZodType<TimetableOccurrenceDto> = z.object({
  id: z.string(),
  timetable_id: z.string(),
  date: z.string(),
  day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]),
  course_code: z.string(),
  course_title: z.string(),
  venue: z.string().nullable(),
  time_slot: z.string(),
  start_time: z.string().nullable(),
  start_time_local: z.string().nullable(),
  end_time_local: z.string().nullable(),
});

const entrySchema: z.ZodType<TimetableEntryDto> = z.object({
  id: z.string(),
  university_id: z.string(),
  level: z.enum(["100", "200", "300", "400", "500", "600"]),
  day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]),
  course_code: z.string(),
  course_title: z.string(),
  venue: z.string().nullable(),
  time_slot: z.string(),
  start_time: z.string().nullable(),
  start_time_local: z.string().nullable(),
  end_time_local: z.string().nullable(),
  effective_from: z.string().nullable(),
  effective_until: z.string().nullable(),
});

export const homeDashboardSchema: z.ZodType<HomeDashboardDto> = z.object({
  today: z.string(),
  activity_from: z.string(),
  current_streak_days: z.number().int().nonnegative(),
  daily_activity: z.array(
    z.object({ date: z.string(), tasks_completed: z.number().int().nonnegative() })
  ),
  tasks: z.array(taskSchema),
  timetable: z.array(occurrenceSchema),
});

export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Lagos";
  } catch {
    return "Africa/Lagos";
  }
}

async function request<T>(
  url: string,
  token: string,
  schema: z.ZodType<T>,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers,
  });
  if (!response.ok) {
    let message = "The request could not be completed.";
    try {
      const body: unknown = await response.json();
      if (typeof body === "object" && body !== null && "detail" in body) {
        const detail = body.detail;
        if (typeof detail === "string") message = detail;
        else {
          const validationErrors = validationErrorSchema.safeParse(detail);
          const firstError = validationErrors.success ? validationErrors.data[0] : undefined;
          if (firstError) {
            const field = firstError.loc.filter((part) => part !== "body").join(".");
            message = field ? `${field}: ${firstError.msg}` : firstError.msg;
          }
        }
      }
    } catch {
      // Keep the user-facing fallback for non-JSON proxy/server responses.
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return schema.parse(await response.json());
}

export async function getHomeDashboard(
  apiUrl: string,
  token: string,
  timezone: string,
  signal?: AbortSignal
): Promise<HomeDashboardDto> {
  const query = new URLSearchParams({ timezone });
  return request(
    `${apiUrl}/api/v1/home/dashboard?${query.toString()}`,
    token,
    homeDashboardSchema,
    { signal }
  );
}

export async function getTasks(
  apiUrl: string,
  token: string,
  includeCompleted = false,
  signal?: AbortSignal,
  timezone = browserTimezone()
): Promise<StudentTaskDto[]> {
  const query = new URLSearchParams({
    include_completed: String(includeCompleted),
    timezone,
  });
  return request(`${apiUrl}/api/v1/tasks?${query.toString()}`, token, z.array(taskSchema), {
    signal,
  });
}

export async function createTask(
  apiUrl: string,
  token: string,
  payload: StudentTaskCreateRequest
): Promise<StudentTaskDto> {
  return request(`${apiUrl}/api/v1/tasks`, token, taskSchema, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTask(
  apiUrl: string,
  token: string,
  taskId: string,
  payload: StudentTaskUpdateRequest
): Promise<StudentTaskDto> {
  return request(`${apiUrl}/api/v1/tasks/${encodeURIComponent(taskId)}`, token, taskSchema, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteTask(apiUrl: string, token: string, taskId: string): Promise<void> {
  return request(`${apiUrl}/api/v1/tasks/${encodeURIComponent(taskId)}`, token, z.undefined(), {
    method: "DELETE",
  });
}

export async function getTimetable(
  apiUrl: string,
  token: string,
  startDate: string,
  endDate: string,
  signal?: AbortSignal
): Promise<TimetableOccurrenceDto[]> {
  const query = new URLSearchParams({ start_date: startDate, end_date: endDate });
  return request(
    `${apiUrl}/api/v1/timetable?${query.toString()}`,
    token,
    z.array(occurrenceSchema),
    { signal }
  );
}

export async function getAdminTimetable(
  apiUrl: string,
  token: string,
  universityId?: string,
  level?: string,
  signal?: AbortSignal
): Promise<TimetableEntryDto[]> {
  const query = new URLSearchParams();
  if (universityId) query.set("university_id", universityId);
  if (level) query.set("level", level);
  return request(
    `${apiUrl}/api/v1/admin/timetables?${query.toString()}`,
    token,
    z.array(entrySchema),
    { signal }
  );
}

export async function createTimetableEntry(
  apiUrl: string,
  token: string,
  payload: TimetableCreateRequest
): Promise<TimetableEntryDto> {
  return request(`${apiUrl}/api/v1/admin/timetables`, token, entrySchema, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTimetableEntry(
  apiUrl: string,
  token: string,
  entryId: string,
  payload: TimetableUpdateRequest
): Promise<TimetableEntryDto> {
  return request(
    `${apiUrl}/api/v1/admin/timetables/${encodeURIComponent(entryId)}`,
    token,
    entrySchema,
    { method: "PATCH", body: JSON.stringify(payload) }
  );
}

export async function deleteTimetableEntry(
  apiUrl: string,
  token: string,
  entryId: string
): Promise<void> {
  return request(
    `${apiUrl}/api/v1/admin/timetables/${encodeURIComponent(entryId)}`,
    token,
    z.undefined(),
    { method: "DELETE" }
  );
}
