import type { GovernanceAction, GovernanceResource, GovernanceRole } from "@pansgpt/types";

export interface FormField {
  key: string;
  label: string;
  type?: "text" | "email" | "number" | "date" | "time" | "datetime-local" | "textarea" | "select";
  options?: string[];
  hint?: string;
  optional?: boolean;
}
export interface ResourceConfig {
  title: string;
  description: string;
  singular: string;
  create?: string;
  fields: FormField[];
  columns: { key: string; label: string }[];
  statuses: string[];
}
const level = (key = "level"): FormField => ({
  key,
  label: "Academic level",
  type: "select",
  options: ["100", "200", "300", "400", "500", "600"],
});
const term: FormField[] = [
  { key: "academic_session", label: "Academic session", hint: "For example, 2026/2027" },
  { key: "semester", label: "Semester", type: "select", options: ["first", "second"] },
];
const course: FormField[] = [
  { key: "course_code", label: "Course code", hint: "For example, PCL 401" },
  { key: "course_title", label: "Course title" },
];
const times: FormField[] = [
  { key: "start_time", label: "Start time", type: "time" },
  { key: "end_time", label: "End time", type: "time" },
];
export const resources: Record<GovernanceResource, ResourceConfig> = {
  invitations: {
    title: "Invitations",
    singular: "invitation",
    description:
      "Manage access invitations. Revoking a link stops new acceptances; manage existing account access in the appropriate directory.",
    statuses: ["pending", "accepted", "expired", "cancelled"],
    columns: [
      { key: "admin_level", label: "Access level" },
      { key: "expires_at", label: "Expires" },
    ],
    fields: [],
  },
  universities: {
    title: "Universities",
    singular: "university",
    description: "Manage institutions, access and resource allocations across PansGPT.",
    create: "Add university",
    statuses: ["active", "provisioning", "read_only", "suspended", "archived"],
    columns: [
      { key: "students", label: "Students" },
      { key: "state", label: "Location" },
    ],
    fields: [
      { key: "name", label: "University name" },
      { key: "short_name", label: "Short name" },
      { key: "slug", label: "URL slug" },
      { key: "state", label: "State", optional: true },
      { key: "country", label: "Country" },
      {
        key: "admin_email",
        label: "Initial senior administrator",
        type: "email",
        hint: "A seven-day invitation will be issued to this email address.",
      },
      ...term,
      { key: "max_storage_bytes", label: "Storage allocation (GiB)", type: "number" },
      { key: "monthly_token_quota", label: "Monthly token quota", type: "number" },
      {
        key: "status",
        label: "Access mode",
        type: "select",
        options: ["active", "read_only", "suspended", "archived", "provisioning"],
      },
    ],
  },
  students: {
    title: "Students",
    singular: "student",
    create: "Invite student",
    description: "Manage student access, academic levels and subscription entitlements.",
    statuses: ["active", "pending_verification", "suspended", "banned", "deleted"],
    columns: [
      { key: "current_level", label: "Level" },
      { key: "subscription_tier", label: "Plan" },
    ],
    fields: [
      level("current_level"),
      { key: "subscription_tier", label: "Subscription", type: "select", options: ["free", "pro"] },
    ],
  },
  lecturers: {
    title: "Lecturers",
    singular: "lecturer",
    description: "Review faculty accounts and manage their assigned courses.",
    create: "Invite lecturer",
    statuses: ["active", "pending", "suspended", "rejected", "deleted"],
    columns: [
      { key: "course_codes", label: "Assigned courses" },
      { key: "academic_title", label: "Title" },
    ],
    fields: [
      { key: "email", label: "Lecturer email", type: "email" },
      {
        key: "course_codes",
        label: "Assigned course codes",
        hint: "Separate course codes with commas. Only assigned courses can be restricted.",
      },
    ],
  },
  administrators: {
    title: "Administrators",
    singular: "administrator",
    description: "Give the right people the right access to your institution.",
    create: "Invite administrator",
    statuses: ["active", "suspended", "deleted"],
    columns: [
      { key: "admin_level", label: "Access level" },
      { key: "university", label: "University" },
    ],
    fields: [
      { key: "email", label: "Administrator email", type: "email" },
      {
        key: "admin_level",
        label: "Access level",
        type: "select",
        options: ["standard", "senior"],
      },
    ],
  },
  materials: {
    title: "Materials",
    singular: "material",
    description: "Review submissions and keep your academic library accurate and ready to use.",
    create: "Upload material",
    statuses: ["pending_review", "active", "rejected", "cancelled", "deleted", "archived"],
    columns: [
      { key: "target_level", label: "Level" },
      { key: "processing", label: "Processing" },
    ],
    fields: [{ key: "title", label: "Material title" }, ...course, level("target_level"), ...term],
  },
  timetable: {
    title: "Class timetable",
    singular: "class",
    description: "Publish a clear weekly schedule for each academic level.",
    create: "Add class",
    statuses: ["published"],
    columns: [
      { key: "day", label: "Day" },
      { key: "start_time", label: "Starts" },
      { key: "level", label: "Level" },
    ],
    fields: [
      ...course,
      level(),
      {
        key: "day",
        label: "Day",
        type: "select",
        options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      },
      ...times,
      { key: "venue", label: "Venue" },
      ...term,
    ],
  },
  exams: {
    title: "Examinations",
    singular: "examination",
    description: "Organize examination dates, times and venues without scheduling conflicts.",
    create: "Add examination",
    statuses: ["published"],
    columns: [
      { key: "exam_date", label: "Exam date" },
      { key: "start_time", label: "Starts" },
      { key: "target_level", label: "Level" },
    ],
    fields: [
      ...course,
      level("target_level"),
      { key: "exam_date", label: "Exam date", type: "date" },
      ...times,
      { key: "venue", label: "Venue" },
      ...term,
    ],
  },
  restrictions: {
    title: "Exam restrictions",
    singular: "restriction",
    description:
      "Pause AI assistance for a defined assessment window. All times use your local timezone.",
    create: "Schedule restriction",
    statuses: ["scheduled", "active", "completed", "cancelled"],
    columns: [
      { key: "level", label: "Level" },
      { key: "start_time", label: "Starts" },
      { key: "end_time", label: "Ends" },
    ],
    fields: [
      { key: "title", label: "Assessment title" },
      {
        key: "course_code",
        label: "Course code",
        optional: true,
        hint: "Leave blank for all courses. Lecturers must select an assigned course.",
      },
      level(),
      { key: "start_time", label: "Starts", type: "datetime-local" },
      {
        key: "end_time",
        label: "Ends",
        type: "datetime-local",
        hint: "Maximum restriction length: 24 hours.",
      },
    ],
  },
  knowledge: {
    title: "Course knowledge",
    singular: "course context",
    description: "Maintain the academic context available to your institution’s AI assistant.",
    create: "Add course context",
    statuses: ["published"],
    columns: [{ key: "level", label: "Level" }],
    fields: [
      { key: "course_code", label: "Course code", optional: true },
      level(),
      {
        key: "knowledge_text",
        label: "Academic context",
        type: "textarea",
        hint: "Shared course outlines and syllabus information are used by your university’s AI assistant through the platform’s configured providers. Do not include private student, patient or account details.",
      },
    ],
  },
  terms: {
    title: "Academic session",
    singular: "academic session",
    description:
      "Set the current session and semester. Previous materials and student levels are preserved.",
    create: "Set academic session",
    statuses: ["current"],
    columns: [
      { key: "academic_session", label: "Session" },
      { key: "semester", label: "Semester" },
    ],
    fields: term,
  },
  support: {
    title: "Support inbox",
    singular: "support request",
    description: "Keep questions, faculty issues and follow-ups in one place.",
    create: "New request",
    statuses: ["open", "in_progress", "resolved", "closed"],
    columns: [
      { key: "priority", label: "Priority" },
      { key: "category", label: "Category" },
    ],
    fields: [
      { key: "subject", label: "Subject" },
      {
        key: "category",
        label: "Category",
        type: "select",
        options: ["account", "content", "bug", "billing", "other"],
      },
      { key: "message", label: "Message", type: "textarea" },
    ],
  },
  audit: {
    title: "Activity log",
    singular: "event",
    description: "A permanent record of administrative changes and their reasons.",
    statuses: ["recorded"],
    columns: [
      { key: "target_type", label: "Area" },
      { key: "role", label: "Actor role" },
    ],
    fields: [],
  },
  settings: {
    title: "AI configuration",
    singular: "configuration proposal",
    description: "Propose platform changes for independent review by a second administrator.",
    create: "Propose change",
    statuses: ["pending", "approved", "rejected"],
    columns: [{ key: "proposed_by", label: "Proposed by" }],
    fields: [
      { key: "system_prompt", label: "System prompt", type: "textarea" },
      { key: "temperature", label: "Temperature", type: "number" },
      { key: "rag_threshold", label: "Retrieval threshold", type: "number" },
      {
        key: "maintenance_mode",
        label: "Maintenance mode",
        type: "select",
        options: ["false", "true"],
      },
      {
        key: "web_search_enabled",
        label: "Web search",
        type: "select",
        options: ["true", "false"],
      },
    ],
  },
};
export const roleLabels: Record<GovernanceRole, string> = {
  super_admin: "Platform administrator",
  senior: "Senior university administrator",
  standard: "University administrator",
  lecturer: "Lecturer workspace",
};
export const actionLabels: Record<GovernanceAction, string> = {
  create: "Create",
  update: "Edit details",
  approve: "Approve",
  reject: "Reject",
  suspend: "Suspend access",
  activate: "Activate",
  archive: "Archive",
  cancel: "Cancel",
  delete: "Remove",
  restore: "Restore",
  retry: "Reprocess",
  resubmit: "Submit correction",
  reply: "Reply",
};
export function label(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
export function actionText(resource: GovernanceResource, action: GovernanceAction): string {
  if (action === "cancel")
    return resource === "invitations"
      ? "Revoke invitation"
      : resource === "materials"
        ? "Cancel submission"
        : "Cancel restriction";
  return actionLabels[action];
}
export function defaults(resource: GovernanceResource): Record<string, string> {
  return {
    country: "Nigeria",
    max_storage_bytes: "16106127360",
    monthly_token_quota: "100000000",
    academic_session: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
    semester: "first",
    admin_level: "standard",
    level: "400",
    target_level: "400",
    current_level: "400",
    subscription_tier: "free",
    temperature: "0.7",
    rag_threshold: "0.5",
    maintenance_mode: "false",
    web_search_enabled: "true",
    ...Object.fromEntries(
      resources[resource].fields.filter((f) => f.options).map((f) => [f.key, f.options![0]])
    ),
  };
}
export function formFields(
  resource: GovernanceResource,
  action: GovernanceAction,
  role: GovernanceRole
): FormField[] {
  if (action === "reply")
    return [
      { key: "message", label: "Reply", type: "textarea" },
      ...(role !== "lecturer"
        ? [
            {
              key: "is_internal_note",
              label: "Visibility",
              type: "select" as const,
              options: ["false", "true"],
              hint: "Internal notes are visible only to administrators.",
            },
          ]
        : []),
    ];
  if (action === "resubmit") return resources.materials.fields;
  if (resource === "students" && action === "create")
    return [{ key: "email", label: "Email address", type: "email" }, level("current_level")];
  if (resource === "lecturers" && action === "create")
    return [
      {
        key: "email",
        label: "Lecturer email",
        type: "email",
        hint: "Assign courses from the lecturer directory after this invitation is accepted.",
      },
    ];
  if (action !== "create" && action !== "update") return [];
  if (resource === "support" && action === "update")
    return [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["open", "in_progress", "resolved", "closed"],
      },
      {
        key: "priority",
        label: "Priority",
        type: "select",
        options: ["low", "normal", "high", "urgent"],
      },
    ];
  return resources[resource].fields
    .filter((f) => !(resource === "universities" && action === "create" && f.key === "status"))
    .filter(
      (f) =>
        !(action === "update" && ["email", "admin_email"].includes(f.key)) &&
        !(
          resource === "universities" &&
          action === "update" &&
          ["academic_session", "semester"].includes(f.key)
        )
    )
    .map((f) =>
      f.key === "admin_level" && role !== "super_admin" ? { ...f, options: ["standard"] } : f
    );
}
