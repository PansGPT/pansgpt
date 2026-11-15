import { z } from "zod";
import type {
  AccountSessionsResponse,
  FeedbackRequest,
  FeedbackResponse,
  PasswordUpdateRequest,
  SettingsErrorCode,
} from "@pansgpt/types";

const errorMessages: Record<SettingsErrorCode, string> = {
  UNAVAILABLE: "Something went wrong. Please try again.",
  SESSION_EXPIRED: "Sign in again to continue.",
  INVALID_PASSWORD: "Check your password. It may need to be stronger.",
  INVALID_CURRENT_PASSWORD: "Your current password is incorrect.",
  SAME_PASSWORD: "Choose a different password.",
  CURRENT_PASSWORD_REQUIRED: "Enter your current password.",
  REAUTHENTICATION_REQUIRED: "Confirm your account to change your password.",
  INVALID_CONFIRMATION: "That confirmation code is invalid or expired.",
  RATE_LIMITED: "Please wait a moment and try again.",
  NOT_FOUND: "That session has already ended or is unavailable.",
  CURRENT_SESSION: "Use Log out to end your current session.",
  CONFLICT: "This action couldn't be completed. Please try again.",
};
export class SettingsError extends Error {
  public readonly code: SettingsErrorCode;
  constructor(code: SettingsErrorCode) {
    super(errorMessages[code]);
    this.code = code;
  }
}

async function request(
  path: string,
  token: string | undefined,
  method = "GET",
  body?: object,
  signal?: AbortSignal
): Promise<unknown> {
  if (!token) throw new SettingsError("SESSION_EXPIRED");
  let response: Response;
  try {
    response = await fetch(`/api/settings/${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(23000)])
        : AbortSignal.timeout(23000),
    });
  } catch {
    throw new SettingsError("UNAVAILABLE");
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new SettingsError("UNAVAILABLE");
  }
  if (!response.ok) {
    const parsed = z.object({ detail: z.object({ code: z.string() }) }).safeParse(data);
    const code = parsed.success ? parsed.data.detail.code : "";
    throw new SettingsError(
      Object.hasOwn(errorMessages, code)
        ? (code as SettingsErrorCode)
        : response.status === 401
          ? "SESSION_EXPIRED"
          : response.status === 429
            ? "RATE_LIMITED"
            : "UNAVAILABLE"
    );
  }
  return data;
}

const sessionSchema = z.object({
  id: z.string().uuid(),
  device: z.string(),
  device_type: z.enum(["mobile", "desktop", "unknown"]),
  ip_address: z.string().nullable(),
  created_at: z.string().nullable(),
  last_active_at: z.string().nullable(),
  is_current: z.boolean(),
});
export async function listAccountSessions(
  token: string | undefined,
  signal: AbortSignal
): Promise<AccountSessionsResponse> {
  return z
    .object({ sessions: z.array(sessionSchema).max(100), has_more: z.boolean() })
    .parse(await request("sessions", token, "GET", undefined, signal));
}
export async function revokeAccountSessions(token: string | undefined, id?: string): Promise<void> {
  if (id && !z.string().uuid().safeParse(id).success) throw new SettingsError("NOT_FOUND");
  z.object({ status: z.literal("revoked"), revoked_count: z.number().int().nonnegative() }).parse(
    await request(id ? `sessions/${id}` : "sessions", token, "DELETE")
  );
}
export async function updateAccountPassword(
  token: string | undefined,
  payload: PasswordUpdateRequest
): Promise<void> {
  z.object({ status: z.literal("updated") }).parse(
    await request("password", token, "PUT", payload)
  );
}
export async function sendPasswordConfirmation(token: string | undefined): Promise<void> {
  z.object({ status: z.literal("sent") }).parse(
    await request("password/reauthenticate", token, "POST")
  );
}
export async function submitFeedback(
  token: string | undefined,
  payload: FeedbackRequest
): Promise<FeedbackResponse> {
  const saved = z
    .object({ id: z.string().uuid(), status: z.literal("received") })
    .parse(await request("feedback", token, "POST", payload));
  if (saved.id !== payload.request_id) throw new SettingsError("UNAVAILABLE");
  return saved;
}

/** Stable idempotency identity for one draft; no user data is encoded. */
export function feedbackRequestId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let timestamp = BigInt(Date.now());
  for (let index = 5; index >= 0; index--) {
    bytes[index] = Number(timestamp & 255n);
    timestamp >>= 8n;
  }
  bytes[6] = (bytes[6]! & 15) | 112;
  bytes[8] = (bytes[8]! & 63) | 128;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
