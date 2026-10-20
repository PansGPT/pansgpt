import { createHash, randomBytes } from "node:crypto";

export function createAttempt() {
  const verifier = randomBytes(48).toString("base64url");
  return {
    verifier,
    challenge: createHash("sha256").update(verifier).digest("base64url"),
    state: randomBytes(32).toString("base64url"),
    expiresAt: Date.now() + 5 * 60_000,
  };
}

export function callbackCode(
  raw: string,
  expected: string,
  state: string,
  expiresAt: number
): string {
  const actual = new URL(raw);
  const redirect = new URL(expected);
  if (
    Date.now() >= expiresAt ||
    actual.origin !== redirect.origin ||
    actual.pathname !== redirect.pathname ||
    actual.searchParams.get("state") !== state ||
    actual.searchParams.has("access_token") ||
    actual.hash
  )
    throw new Error("Invalid or expired OAuth callback");
  const code = actual.searchParams.get("code");
  if (!code) throw new Error("An authorization code is required");
  return code;
}
