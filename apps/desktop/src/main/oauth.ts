import { shell } from "electron";
import { createServer } from "node:http";
import { desktopEnv } from "../config/env";
import { clearToken, getToken, storeToken } from "../auth/keychain";
import { callbackCode, createAttempt } from "./oauth-protocol";

export interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}
let cancelAttempt: (() => void) | undefined;
let sessionVersion = 0;
let refreshVersion = -1;
let refreshing: Promise<OAuthTokens> | undefined;
async function authRequest(
  path: string,
  body?: Record<string, string>,
  token?: string
): Promise<unknown> {
  const response = await fetch(`${desktopEnv.supabaseUrl}/auth/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      apikey: desktopEnv.supabaseAnonKey,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("Authentication request failed");
  return response.status === 204 ? null : response.json();
}
async function persist(
  value: unknown,
  isCurrent: () => boolean = () => true
): Promise<OAuthTokens> {
  if (
    !value ||
    typeof value !== "object" ||
    !("access_token" in value) ||
    !("refresh_token" in value) ||
    typeof value.access_token !== "string" ||
    typeof value.refresh_token !== "string"
  )
    throw new Error("Invalid authentication response");
  await authRequest("user", undefined, value.access_token);
  if (!isCurrent()) throw new Error("Authentication attempt was cancelled");
  const expiresIn =
    "expires_in" in value && typeof value.expires_in === "number" ? value.expires_in : 3600;
  const tokens = {
    access_token: value.access_token,
    refresh_token: value.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
  };
  if (!storeToken("session", JSON.stringify(tokens)))
    throw new Error("Secure session storage is unavailable");
  return tokens;
}
export async function getSession(): Promise<OAuthTokens | null> {
  const raw = getToken("session");
  if (!raw) return null;
  const session = JSON.parse(raw) as OAuthTokens;
  if (session.expires_at > Date.now() / 1000 + 60) return session;
  const version = sessionVersion;
  if (refreshing && refreshVersion === version) return refreshing;
  refreshVersion = version;
  refreshing = (async () => {
    try {
      return await persist(
        await authRequest("token?grant_type=refresh_token", {
          refresh_token: session.refresh_token,
        }),
        () => sessionVersion === version
      );
    } catch (error) {
      if (sessionVersion === version) clearToken("session");
      throw error;
    } finally {
      if (refreshVersion === version) refreshing = undefined;
    }
  })();
  return refreshing;
}
export async function signOut(): Promise<void> {
  sessionVersion += 1;
  cancelAttempt?.();
  const raw = getToken("session");
  clearToken("session");
  if (raw) await authRequest("logout", {}, (JSON.parse(raw) as OAuthTokens).access_token);
}
export async function beginOAuth(
  provider: "google" | "apple",
  onSuccess: (tokens: OAuthTokens) => void
): Promise<void> {
  cancelAttempt?.();
  sessionVersion += 1;
  const attempt = createAttempt();
  let consumed = false;
  let cancelled = false;
  let stop: () => void;
  let redirect = "";
  const server = createServer(async (request, response) => {
    try {
      if (request.method !== "GET" || consumed) throw new Error("No active attempt");
      const code = callbackCode(
        new URL(request.url || "/", redirect).toString(),
        redirect,
        attempt.state,
        attempt.expiresAt
      );
      consumed = true;
      const result = await authRequest("token?grant_type=pkce", {
        auth_code: code,
        code_verifier: attempt.verifier,
      });
      if (cancelled) throw new Error("Attempt expired or superseded");
      const version = ++sessionVersion;
      const tokens = await persist(result, () => !cancelled && sessionVersion === version);
      onSuccess(tokens);
      response.writeHead(200, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
      response.end("Signed in. You may return to PansGPT.");
      stop();
    } catch {
      response.writeHead(400, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
      response.end("Authentication could not be completed. Start a new sign-in from PansGPT.");
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("OAuth callback could not be started");
  redirect = `http://127.0.0.1:${address.port}/auth/callback`;
  const timer = setTimeout(() => stop(), 5 * 60_000);
  timer.unref();
  stop = () => {
    cancelled = true;
    clearTimeout(timer);
    server.close();
    if (cancelAttempt === stop) cancelAttempt = undefined;
  };
  cancelAttempt = stop;
  const url = new URL(`${desktopEnv.supabaseUrl}/auth/v1/authorize`);
  url.search = new URLSearchParams({
    provider,
    redirect_to: `${redirect}?state=${attempt.state}`,
    code_challenge: attempt.challenge,
    code_challenge_method: "s256",
  }).toString();
  try {
    await shell.openExternal(url.toString());
  } catch (error) {
    stop();
    throw error;
  }
}
