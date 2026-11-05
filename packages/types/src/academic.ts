/** Shared API contracts for student tasks, recurring classes and study activity. */

export type StudentTaskType =
  "class" | "reading" | "assignment" | "lab" | "presentation" | "meeting" | "custom";

export type StudentTaskSource = "custom" | "timetable" | "ai_generated";

export type UniversityLevel = "100" | "200" | "300" | "400" | "500" | "600";

export type Weekday = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";

export interface StudentTaskDto {
  id: string;
  title: string;
  subtitle: string | null;
  course_code: string | null;
  task_type: StudentTaskType;
  due_date: string | null;
  due_time: string | null;
  is_completed: boolean;
  is_favorite: boolean;
  completed_at: string | null;
  source: StudentTaskSource;
  created_at: string;
}

export interface StudentTaskCreateRequest {
  title: string;
  subtitle?: string | null;
  course_code?: string | null;
  task_type?: StudentTaskType;
  due_date?: string | null;
  due_time?: string | null;
}

export type StudentTaskUpdateRequest = Partial<StudentTaskCreateRequest> & {
  is_completed?: boolean;
  is_favorite?: boolean;
};

export type StudentTaskState = "active" | "completed";

/** Independent bounded pages; completed history never displaces active tasks. */
export interface StudentTaskPageDto {
  items: StudentTaskDto[];
  next_offset: number | null;
}

export interface TimetableEntryDto {
  id: string;
  university_id: string;
  level: UniversityLevel;
  day: Weekday;
  course_code: string;
  course_title: string;
  venue: string | null;
  time_slot: string;
  start_time: string | null;
  start_time_local: string | null;
  end_time_local: string | null;
  effective_from: string | null;
  effective_until: string | null;
}

export interface TimetableOccurrenceDto {
  id: string;
  timetable_id: string;
  date: string;
  day: Weekday;
  course_code: string;
  course_title: string;
  venue: string | null;
  time_slot: string;
  start_time: string | null;
  start_time_local: string | null;
  end_time_local: string | null;
}

export interface DailyStudyActivityDto {
  date: string;
  tasks_completed: number;
}

export interface HomeDashboardDto {
  today: string;
  activity_from: string;
  current_streak_days: number;
  daily_activity: DailyStudyActivityDto[];
  tasks: StudentTaskDto[];
  timetable: TimetableOccurrenceDto[];
}

export interface TimetableCreateRequest {
  university_id?: string;
  level: UniversityLevel;
  day: Weekday;
  course_code: string;
  course_title: string;
  venue?: string | null;
  time_slot?: string | null;
  start_time?: string | null;
  start_time_local?: string | null;
  end_time_local?: string | null;
  effective_from?: string | null;
  effective_until?: string | null;
}

export type TimetableUpdateRequest = Partial<Omit<TimetableCreateRequest, "university_id">>;
