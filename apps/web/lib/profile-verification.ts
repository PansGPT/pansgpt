import { z } from "zod";
import type { AuthProfileResponse, UpdateProfileRequest } from "@pansgpt/types";

export const PROFILE_REQUEST_TIMEOUT_MS = 15_000;
export const authProfileSchema: z.ZodType<AuthProfileResponse> = z.object({
  id: z.string().uuid(),
  email: z.string(),
  role: z.string(),
  roles: z.array(z.string()),
  university_id: z.string().uuid().nullable(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  current_level: z.string().nullable(),
  terms_accepted_at: z.string().nullable(),
  is_onboarded: z.boolean(),
  client_type: z.string(),
  dev_bypass: z.boolean(),
});

export type ProfileFailureCode =
  | "network"
  | "timeout"
  | "unavailable"
  | "session_expired"
  | "session_unavailable"
  | "forbidden"
  | "invalid_response";
export interface ProfileFailure {
  code: ProfileFailureCode;
  retryable: boolean;
}
export interface ProfileIdentity {
  userId: string;
  accessToken: string;
}
export type ProfileResult =
  { status: "ready"; profile: AuthProfileResponse } | { status: "error"; error: ProfileFailure };
export type ProfileSnapshot = ProfileIdentity & (ProfileResult | { status: "checking" });

/** Keep drafts mounted during same-account token renewal, never after a rejection. */
export function visibleVerifiedProfile(
  identity: ProfileIdentity | null,
  snapshot: ProfileSnapshot | null,
  previous: AuthProfileResponse | null
): AuthProfileResponse | null {
  if (!identity) return null;
  const owned =
    snapshot?.userId === identity.userId && snapshot.accessToken === identity.accessToken
      ? snapshot
      : null;
  if (owned?.status === "error") return null;
  if (owned?.status === "ready") return owned.profile.id === identity.userId ? owned.profile : null;
  return previous?.id === identity.userId ? previous : null;
}

export function profileFailureMessage(error: ProfileFailure): {
  title: string;
  description: string;
} {
  switch (error.code) {
    case "network":
      return {
        title: "We couldn't connect to your study service",
        description: "Check your connection and retry.",
      };
    case "timeout":
      return {
        title: "Your study service is taking too long",
        description: "It may be starting up or temporarily unavailable. Please retry shortly.",
      };
    case "unavailable":
      return {
        title: "Your study service is temporarily unavailable",
        description: "We couldn't load your profile right now. Please retry shortly.",
      };
    case "session_expired":
    case "session_unavailable":
      return {
        title: "Your session has expired",
        description: "Sign in again to continue with your materials.",
      };
    case "forbidden":
      return {
        title: "Your account does not have access",
        description: "Check your sign-in details or request access from your school admin.",
      };
    case "invalid_response":
      return {
        title: "We couldn't verify your profile",
        description: "Please retry shortly or sign in again if the issue persists.",
      };
    default:
      return {
        title: "We couldn't verify your profile",
        description: "Please retry before opening your workspace.",
      };
  }
}

export async function requestProfile(
  apiUrl: string,
  identity: ProfileIdentity,
  signal: AbortSignal
): Promise<ProfileResult> {
  const deadline = AbortSignal.timeout(PROFILE_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${apiUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${identity.accessToken}` },
      cache: "no-store",
      signal: AbortSignal.any([signal, deadline]),
    });
    if (!response.ok) {
      const code: ProfileFailureCode =
        response.status === 401
          ? "session_expired"
          : response.status === 403
            ? "forbidden"
            : response.status >= 500 || response.status === 429
              ? "unavailable"
              : "invalid_response";
      return {
        status: "error",
        error: { code, retryable: code === "unavailable" || code === "invalid_response" },
      };
    }
    const parsed = authProfileSchema.safeParse(await response.json());
    if (!parsed.success || parsed.data.id !== identity.userId)
      return { status: "error", error: { code: "invalid_response", retryable: true } };
    return { status: "ready", profile: parsed.data };
  } catch (error) {
    if (signal.aborted) throw error;
    return {
      status: "error",
      error: {
        code: deadline.aborted
          ? "timeout"
          : error instanceof SyntaxError
            ? "invalid_response"
            : "network",
        retryable: true,
      },
    };
  }
}

export async function updateProfile(
  apiUrl: string,
  identity: ProfileIdentity,
  payload: UpdateProfileRequest,
  signal?: AbortSignal
): Promise<AuthProfileResponse> {
  const deadline = AbortSignal.timeout(PROFILE_REQUEST_TIMEOUT_MS);
  const response = await fetch(`${apiUrl}/api/v1/auth/profile`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${identity.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, deadline]) : deadline,
  });

  if (!response.ok) {
    const errorBody: unknown = await response.json().catch(() => null);
    const detail =
      errorBody &&
      typeof errorBody === "object" &&
      "detail" in errorBody &&
      typeof errorBody.detail === "string"
        ? errorBody.detail
        : null;
    throw new Error(detail || `Failed to update profile (${response.status})`);
  }

  const data: unknown = await response.json();
  const parsed = authProfileSchema.safeParse(data);
  if (!parsed.success || parsed.data.id !== identity.userId) {
    throw new Error("Invalid response format when updating profile.");
  }
  return parsed.data;
}

/** Single-flight verification with cancellation and latest-request ownership. */
export function createProfileVerifier(
  lookup: (identity: ProfileIdentity, signal: AbortSignal) => Promise<ProfileResult>,
  publish: (snapshot: ProfileSnapshot) => void
) {
  let generation = 0;
  let pending: {
    identity: ProfileIdentity;
    controller: AbortController;
    promise: Promise<AuthProfileResponse | null>;
  } | null = null;
  function cancel(): void {
    generation++;
    pending?.controller.abort();
    pending = null;
  }
  function verify(identity: ProfileIdentity, force = false): Promise<AuthProfileResponse | null> {
    if (
      !force &&
      pending?.identity.userId === identity.userId &&
      pending.identity.accessToken === identity.accessToken
    )
      return pending.promise;
    cancel();
    const current = generation;
    const controller = new AbortController();
    publish({ ...identity, status: "checking" });
    const promise = Promise.resolve()
      .then(() => lookup(identity, controller.signal))
      .then((result) => {
        if (current !== generation || controller.signal.aborted) return null;
        // Keep ownership validation even if another lookup implementation is used.
        const owned: ProfileResult =
          result.status === "ready" && result.profile.id !== identity.userId
            ? { status: "error", error: { code: "invalid_response", retryable: true } }
            : result;
        publish({ ...identity, ...owned });
        return owned.status === "ready" ? owned.profile : null;
      })
      .catch(() => {
        if (current === generation && !controller.signal.aborted)
          publish({ ...identity, status: "error", error: { code: "network", retryable: true } });
        return null;
      })
      .finally(() => {
        if (current === generation) pending = null;
      });
    pending = { identity, controller, promise };
    return promise;
  }
  return { verify, cancel };
}
