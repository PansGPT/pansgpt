/** Deterministic synthetic data. Imported only by the explicit development preview. */
import type {
  GovernanceAction,
  GovernanceIdentity,
  GovernanceRecord,
  GovernanceResource,
  GovernanceRole,
} from "@pansgpt/types";
import type { GovernanceAdapter } from "./governance-api";

const universityId = "019a7b20-1000-7000-8000-000000000001";
const userId = "019a7b20-1000-7000-8000-000000000002";
const academic: GovernanceResource[] = [
  "materials",
  "timetable",
  "exams",
  "restrictions",
  "knowledge",
  "support",
  "audit",
];
const permitted: Record<GovernanceRole, GovernanceResource[]> = {
  super_admin: [
    "invitations",
    "universities",
    "students",
    "lecturers",
    "administrators",
    ...academic,
    "terms",
    "settings",
  ],
  senior: ["students", "lecturers", "administrators", "invitations", ...academic, "terms"],
  standard: academic,
  lecturer: ["materials", "restrictions", "support"],
};
export function createGovernanceDemo(role: GovernanceRole = "senior"): GovernanceAdapter {
  let sequence = 20;
  const data: Record<GovernanceResource, GovernanceRecord[]> = {
    invitations: [],
    universities: [],
    students: [],
    lecturers: [],
    administrators: [],
    materials: [],
    timetable: [],
    exams: [],
    restrictions: [],
    knowledge: [],
    terms: [],
    support: [],
    audit: [],
    settings: [],
  };
  function add(
    resource: GovernanceResource,
    title: string,
    subtitle: string,
    status: string,
    fields: Record<string, string>
  ): void {
    sequence++;
    data[resource].push({
      id: `019a7b20-1000-7000-8000-${String(sequence).padStart(12, "0")}`,
      title,
      subtitle,
      status,
      updated_at: "2026-11-13T09:20:00+00:00",
      fields,
      actions: [],
    });
  }
  add("universities", "Example University", "EXU · Sample State", "active", {
    name: "Example University",
    short_name: "EXU",
    slug: "example-university",
    country: "Nigeria",
    state: "Sample State",
    students: "28",
    max_storage_bytes: "16106127360",
    monthly_token_quota: "100000000",
  });
  data.universities[0].id = universityId;
  add("universities", "Sample College of Pharmacy", "SCP · Sample State", "active", {
    name: "Sample College of Pharmacy",
    short_name: "SCP",
    slug: "sample-college",
    country: "Nigeria",
    state: "Sample State",
    students: "16",
  });
  const materialFields = {
    course_code: "PCL 401",
    course_title: "Clinical Pharmacology",
    target_level: "400",
    academic_session: "2026/2027",
    semester: "first",
    processing: "pending",
    progress: "0",
    uploaded_by: userId,
  };
  add("materials", "Principles of clinical pharmacology", "PCL 401", "pending_review", {
    ...materialFields,
    title: "Principles of clinical pharmacology",
  });
  add("materials", "Drug absorption and distribution", "PCT 403", "pending_review", {
    ...materialFields,
    course_code: "PCT 403",
    title: "Drug absorption and distribution",
  });
  add("materials", "Foundations of pharmaceutical chemistry", "PCH 401", "pending_review", {
    ...materialFields,
    course_code: "PCH 401",
    title: "Foundations of pharmaceutical chemistry",
  });
  add("materials", "Introduction to pharmacokinetics", "PCL 401", "active", {
    ...materialFields,
    title: "Introduction to pharmacokinetics",
    processing: "completed",
    progress: "100",
  });
  add("materials", "Sample lecture handout", "PCL 401", "rejected", {
    ...materialFields,
    title: "Sample lecture handout",
    review_note: "Please add the course objectives and improve the scanned page quality.",
  });
  for (let i = 1; i <= 28; i++)
    add(
      "students",
      `Sample Student ${String(i).padStart(2, "0")}`,
      `student${i}@example.invalid`,
      i === 3 ? "suspended" : "active",
      {
        current_level: i % 2 ? "400" : "300",
        subscription_tier: i % 3 ? "free" : "pro",
        email: `student${i}@example.invalid`,
        university: "Example University",
      }
    );
  add("lecturers", "Dr. Example Lecturer", "faculty@example.invalid", "pending", {
    email: "faculty@example.invalid",
    course_codes: "PCL 401, PCT 403",
    academic_title: "Dr",
  });
  add("administrators", "Sample Academic Administrator", "admin@example.invalid", "active", {
    email: "admin@example.invalid",
    admin_level: "standard",
    university: "Example University",
  });
  add("timetable", "PCL 401", "Clinical Pharmacology", "published", {
    course_code: "PCL 401",
    course_title: "Clinical Pharmacology",
    level: "400",
    day: "Monday",
    start_time: "09:00",
    end_time: "11:00",
    venue: "Sample Lecture Theatre",
    academic_session: "2026/2027",
    semester: "first",
  });
  add("exams", "PCL 401", "Clinical Pharmacology", "published", {
    course_code: "PCL 401",
    course_title: "Clinical Pharmacology",
    target_level: "400",
    exam_date: "2026-11-20",
    start_time: "09:00",
    end_time: "11:00",
    venue: "Sample Examination Hall",
    academic_session: "2026/2027",
    semester: "first",
  });
  add("restrictions", "Clinical pharmacology assessment", "PCL 401", "scheduled", {
    title: "Clinical pharmacology assessment",
    course_code: "PCL 401",
    level: "400",
    start_time: "2026-11-20T08:00:00Z",
    end_time: "2026-11-20T10:00:00Z",
    created_by: userId,
  });
  add("knowledge", "PCL 401", "400 level", "published", {
    course_code: "PCL 401",
    level: "400",
    knowledge_text:
      "Sample curriculum context: introduce pharmacokinetic principles and evidence-based approaches to drug therapy.",
  });
  add("terms", "2026/2027", "First semester", "current", {
    academic_session: "2026/2027",
    semester: "first",
  });
  add("support", "Material processing question", "content", "open", {
    subject: "Material processing question",
    category: "content",
    status: "open",
    priority: "normal",
    conversation: "Sample Lecturer: How can I track processing after approval?",
  });
  for (const [title, subtitle] of [
    ["materials.approve", "Sample Academic Administrator"],
    ["timetable.create", "Sample Academic Administrator"],
    ["lecturers.approve", "Sample Senior Administrator"],
  ])
    add("audit", title, subtitle, "recorded", {
      target_type: title.split(".")[0],
      role: "university_admin",
      change: JSON.stringify(
        { reason: "Synthetic activity for the development preview." },
        null,
        2
      ),
    });
  add("settings", "Active configuration", "Current platform configuration", "active", {
    system_prompt: "Sample academic study guidance.",
    temperature: "0.7",
    rag_threshold: "0.5",
    maintenance_mode: "false",
    web_search_enabled: "true",
  });
  add(
    "settings",
    "Configuration proposal",
    "Improve the clarity of study explanations",
    "pending",
    {
      proposed_by: "019a7b20-1000-7000-8000-000000000099",
      before: "Sample original settings",
      proposed: "Sample proposed settings",
    }
  );
  const actor: GovernanceIdentity = {
    user_id: userId,
    name: "Sample Administrator",
    role,
    university_id: role === "super_admin" ? null : universityId,
    university_name: "Example University",
    resources: permitted[role],
  };
  function actions(resource: GovernanceResource, row: GovernanceRecord): GovernanceAction[] {
    if (resource === "invitations") return row.status === "pending" ? ["cancel"] : [];
    if (resource === "audit") return [];
    if (resource === "settings") return row.status === "pending" ? ["approve", "reject"] : [];
    if (resource === "materials")
      return role === "lecturer"
        ? row.status === "pending_review"
          ? ["cancel"]
          : row.status === "rejected" && !row.fields.replacement_id
            ? ["resubmit"]
            : []
        : row.status === "deleted"
          ? ["restore"]
          : [
              ...(row.status === "pending_review"
                ? (["approve", "reject"] as GovernanceAction[])
                : []),
              "update",
              "delete",
              ...(row.status === "active" ? (["retry"] as GovernanceAction[]) : []),
            ];
    if (resource === "restrictions")
      return ["active", "scheduled"].includes(row.status) ? ["cancel"] : [];
    if (["students", "lecturers", "administrators"].includes(resource))
      return row.status === "deleted"
        ? ["restore"]
        : [
            ...(row.status === "pending" ? (["approve", "reject"] as GovernanceAction[]) : []),
            "update",
            row.status === "active" ? "suspend" : "activate",
            "delete",
          ];
    if (resource === "universities")
      return ["update", row.status === "active" ? "suspend" : "activate", "archive"];
    if (resource === "terms") return ["update"];
    if (resource === "support") return role === "lecturer" ? ["reply"] : ["update", "reply"];
    return ["update", "delete"];
  }
  return {
    async identity() {
      return structuredClone(actor);
    },
    async download() {
      throw new Error(
        "Sample materials contain demonstration metadata. Upload a file in your live workspace to download it."
      );
    },
    async batch(_query, commands) {
      if (!["senior", "super_admin"].includes(role))
        throw new Error("Your role does not permit this action.");
      return {
        items: commands.map((command) => {
          const row = data.students.find((item) => item.id === command.id);
          if (!row || row.updated_at !== command.expected_version)
            return {
              id: command.id ?? "",
              success: false,
              message: "This record changed. Refresh before trying again.",
            };
          Object.assign(row.fields, command.fields);
          if (command.action === "suspend") row.status = "suspended";
          row.updated_at = new Date().toISOString();
          return { id: row.id, success: true, message: "Sample student updated." };
        }),
      };
    },
    async list(resource, query) {
      if (!actor.resources.includes(resource))
        throw new Error("This page is not available for your role.");
      const search = query.get("search")?.toLowerCase() ?? "";
      const status = query.get("status");
      const page = Number(query.get("page")) || 1;
      const items = data[resource].filter(
        (row) =>
          (!search || `${row.title} ${row.subtitle}`.toLowerCase().includes(search)) &&
          (!status || row.status === status)
      );
      return {
        items: structuredClone(
          items
            .slice((page - 1) * 20, page * 20)
            .map((row) => ({ ...row, actions: actions(resource, row) }))
        ),
        total: items.length,
        page,
        page_size: 20,
      };
    },
    async analytics() {
      return {
        metrics: [
          { label: "AI requests", value: 1248, unit: "requests" },
          { label: "Tokens used", value: 284100, unit: "tokens" },
          { label: "Average latency", value: 682, unit: "ms" },
          { label: "Failed requests", value: 3, unit: "requests" },
        ],
        daily: Array.from({ length: 14 }, (_, i) => ({
          date: `2026-11-${String(i + 1).padStart(2, "0")}`,
          requests: [44, 68, 53, 76, 65, 94, 81, 104, 93, 118, 101, 128, 112, 111][i],
          tokens: 12000 + i * 600,
        })),
        providers: [
          { provider: "google", requests: 1198, tokens: 267100, latency_ms: 690, failures: 2 },
          { provider: "groq", requests: 50, tokens: 17000, latency_ms: 480, failures: 1 },
        ],
      };
    },
    async mutate(resource, _query, command) {
      if (!actor.resources.includes(resource))
        throw new Error("Your role does not permit this action.");
      if (command.reason.trim().length < 3) throw new Error("Explain the reason for this change.");
      if (
        command.action === "create" &&
        ["students", "lecturers", "administrators"].includes(resource)
      ) {
        add(
          "invitations",
          command.fields.email,
          resource === "administrators"
            ? "University administrator"
            : resource === "lecturers"
              ? "Lecturer"
              : "Student",
          "pending",
          {
            email: command.fields.email,
            admin_level: command.fields.admin_level ?? "",
            expires_at: "2026-11-21T12:00:00Z",
          }
        );
        return {
          id: data.invitations.at(-1)!.id,
          message: "Sample invitation created. No live invitation was sent.",
          invite_url: "https://example.invalid/signup?invite=sample-preview-only",
        };
      }
      if (command.action === "create") {
        add(
          resource,
          command.fields.title ||
            command.fields.name ||
            command.fields.subject ||
            command.fields.course_code ||
            command.fields.academic_session ||
            "Sample record",
          command.fields.course_title || "Sample record",
          resource === "restrictions"
            ? "scheduled"
            : resource === "support"
              ? "open"
              : resource === "settings"
                ? "pending"
                : "published",
          command.fields
        );
        return {
          id: data[resource].at(-1)!.id,
          message: "Sample change saved. No live records were changed.",
          ...(resource === "universities"
            ? { invite_url: "https://example.invalid/signup?invite=sample-university-preview-only" }
            : {}),
        };
      }
      const row = data[resource].find((row) => row.id === command.id);
      if (!row) throw new Error("Record not found.");
      if (row.updated_at !== command.expected_version)
        throw new Error("This record changed. Refresh it before trying again.");
      if (!actions(resource, row).includes(command.action))
        throw new Error("This action is not available.");
      if (command.action === "update") Object.assign(row.fields, command.fields);
      else if (command.action === "reply")
        row.fields.conversation = `${row.fields.conversation ?? ""}\n\nSample Administrator: ${command.fields.message}`;
      else if (command.action === "resubmit")
        row.fields.replacement_id = command.fields.replacement_id;
      else
        row.status =
          (
            {
              approve: resource === "settings" ? "approved" : "active",
              reject: "rejected",
              suspend: "suspended",
              activate: "active",
              archive: "archived",
              cancel: "cancelled",
              delete: "deleted",
              restore: "active",
              retry: "active",
            } as Partial<Record<GovernanceAction, string>>
          )[command.action] ?? row.status;
      if (command.action === "reject") row.fields.review_note = command.reason;
      row.updated_at = new Date().toISOString();
      return { id: row.id, message: "Sample change saved. No live records were changed." };
    },
    async upload(file, fields) {
      add(
        "materials",
        fields.title,
        fields.course_code,
        role === "lecturer" ? "pending_review" : "active",
        { ...fields, processing: "pending", uploaded_by: userId, size_bytes: String(file.size) }
      );
      return data.materials.at(-1)!.id;
    },
  };
}
