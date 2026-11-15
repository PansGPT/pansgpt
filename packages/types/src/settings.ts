export type SettingsErrorCode =
  | "UNAVAILABLE"
  | "SESSION_EXPIRED"
  | "INVALID_PASSWORD"
  | "INVALID_CURRENT_PASSWORD"
  | "SAME_PASSWORD"
  | "CURRENT_PASSWORD_REQUIRED"
  | "REAUTHENTICATION_REQUIRED"
  | "INVALID_CONFIRMATION"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "CURRENT_SESSION"
  | "CONFLICT";

export interface PasswordUpdateRequest {
  password: string;
  current_password?: string;
  nonce?: string;
}
export interface PasswordUpdateResponse {
  status: "updated";
}
export interface PasswordConfirmationResponse {
  status: "sent";
}
export interface AccountSession {
  id: string;
  device: string;
  device_type: "mobile" | "desktop" | "unknown";
  ip_address: string | null;
  created_at: string | null;
  last_active_at: string | null;
  is_current: boolean;
}
export interface AccountSessionsResponse {
  sessions: AccountSession[];
  has_more: boolean;
}
export interface RevokeSessionsResponse {
  status: "revoked";
  revoked_count: number;
}
export type FeedbackCategory = "bug" | "account" | "content" | "billing" | "other";
export interface FeedbackRequest {
  request_id: string;
  category: FeedbackCategory;
  description: string;
}
export interface FeedbackResponse {
  id: string;
  status: "received";
}
