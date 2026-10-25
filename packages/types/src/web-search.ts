/** Backend retrieval status; unavailable search must never become an invented answer. */
export type SearchScope = "general" | "biomedical";
export type WebSearchStatus =
  | "success"
  | "empty"
  | "disabled"
  | "not_configured"
  | "privacy_blocked"
  | "sensitive_query"
  | "quota_exceeded"
  | "quota_unavailable"
  | "timeout"
  | "provider_error"
  | "identity_required"
  | "tools_disabled";
export interface WebReference {
  title: string;
  url: string;
  content: string;
}
export interface WebSearchResponse {
  status: WebSearchStatus;
  results: WebReference[];
  source: string;
  cached: boolean;
  quota_used?: number | null;
  quota_limit?: number | null;
  message?: string | null;
}
