const AUTH_DESTINATION_ORIGIN = "https://pansgpt.invalid";

/** Only internal application destinations can follow an auth callback. */
export function safeAuthNext(value: string | null | undefined, fallback = "/app"): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u001f\u007f]/.test(value)
  )
    return fallback;
  try {
    const url = new URL(value, AUTH_DESTINATION_ORIGIN);
    const path = url.pathname;
    const decoded = decodeURIComponent(path);
    if (url.origin !== AUTH_DESTINATION_ORIGIN || decoded.includes("\\") || decoded.includes("//"))
      return fallback;
    if (!(
      path === "/app" ||
      path.startsWith("/app/") ||
      path === "/onboarding" ||
      path === "/update-password"
    ))
      return fallback;
    return path + url.search + url.hash;
  } catch {
    return fallback;
  }
}

export function signupDestination(invite: string | null): string {
  return invite ? `/onboarding?invite=${encodeURIComponent(invite)}` : "/onboarding";
}

export function authMessage(
  code: string | null | undefined,
  fallback = "We couldn't complete that request. Please try again."
): string {
  const messages: Record<string, string> = {
    invalid_credentials: "The email or password is incorrect. Please try again.",
    email_not_confirmed:
      "Confirm your email before signing in. Check your inbox for the verification link.",
    over_email_send_rate_limit: "Please wait a little before requesting another email.",
    over_request_rate_limit: "Too many attempts. Please wait a little and try again.",
    otp_expired: "This link has expired or has already been used. Request a new email below.",
    link_expired:
      "This link has expired or could not be verified in this browser. Request a new email below.",
    recovery_required: "Request a reset link and open it in this browser to choose a new password.",
    weak_password: "Choose a stronger password with at least eight characters.",
    same_password: "Choose a password you haven't used for this account before.",
    provider_error: "That sign-in option couldn't be completed. Please try again or use email.",
    auth_failed: "We couldn't verify that sign-in link. Please try again.",
    reauthentication_needed:
      "Please sign in again or request a fresh reset link before changing your password.",
  };
  return (code && messages[code]) || fallback;
}
