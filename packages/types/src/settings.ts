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

// ─── Feedback history (read own submissions) ──────────────────────────────────

export interface FeedbackTicket {
  id: string;
  category: FeedbackCategory;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at: string;
  updated_at: string;
  /** The user's own first message in this ticket. Never an internal staff note. */
  first_message: string | null;
}

export interface FeedbackHistoryResponse {
  tickets: FeedbackTicket[];
  next_offset: number | null;
}

// ─── Uploaded chat attachments (personal files in settings) ──────────────────

export interface OwnedAttachment {
  id: string;
  name: string;
  content_type: string;
  size: number;
  created_at: string;
  /** The session this attachment was sent in, null if it was never sent. */
  session_id: string | null;
  /** True when this attachment is referenced by a chat message (cannot be deleted). */
  in_use: boolean;
}

export interface OwnedAttachmentsResponse {
  attachments: OwnedAttachment[];
  next_offset: number | null;
}
