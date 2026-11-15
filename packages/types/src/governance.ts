/** Governance v1. FastAPI authorizes every request; these are public view DTOs. */
export type GovernanceRole = "super_admin" | "senior" | "standard" | "lecturer";
export type GovernanceResource =
  | "invitations"
  | "universities"
  | "students"
  | "lecturers"
  | "administrators"
  | "materials"
  | "timetable"
  | "exams"
  | "restrictions"
  | "knowledge"
  | "terms"
  | "support"
  | "audit"
  | "settings";
export type GovernanceAction =
  | "create"
  | "update"
  | "approve"
  | "reject"
  | "suspend"
  | "activate"
  | "archive"
  | "cancel"
  | "delete"
  | "restore"
  | "retry"
  | "resubmit"
  | "reply";
export interface GovernanceIdentity {
  user_id: string;
  name: string;
  role: GovernanceRole;
  university_id: string | null;
  university_name: string;
  resources: GovernanceResource[];
}
/** Explicit display projection, never a database row or a private student record. */
export interface GovernanceRecord {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  updated_at: string;
  fields: Record<string, string>;
  actions: GovernanceAction[];
}
export interface GovernancePage {
  items: GovernanceRecord[];
  total: number;
  page: number;
  page_size: number;
}
export interface GovernanceCommand {
  action: GovernanceAction;
  id?: string;
  expected_version?: string;
  reason: string;
  fields: Record<string, string>;
}
export interface GovernanceMutation {
  id: string;
  message: string;
  invite_url?: string | null;
}
export interface GovernanceBatchResult {
  items: { id: string; success: boolean; message: string }[];
}
export interface GovernanceMetric {
  label: string;
  value: number;
  unit: string;
}
export interface GovernanceAnalytics {
  metrics: GovernanceMetric[];
  daily: { date: string; requests: number; tokens: number }[];
  providers: {
    provider: string;
    requests: number;
    tokens: number;
    latency_ms: number;
    failures: number;
  }[];
}
