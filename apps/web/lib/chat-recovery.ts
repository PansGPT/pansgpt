import type { ChatFailureView } from "@pansgpt/types";

export type FailureContext =
  "response" | "upload" | "voice" | "history" | "download" | "preview" | "mutation";
const generic = "Something went wrong. Please try again.";

export class ChatFailure extends Error {
  readonly view: ChatFailureView;
  constructor(view: ChatFailureView) {
    super(view.message);
    this.name = "ChatFailure";
    this.view = view;
  }
}

export function publicFailure(
  code = "UNKNOWN",
  detail = "",
  retryable = true,
  context: FailureContext = "response"
): ChatFailureView {
  const text = detail.toLowerCase();
  const result = (
    message: string,
    action: ChatFailureView["action"],
    retry = false
  ): ChatFailureView => ({ code, message, action, retryable: retry });
  if (code === "OFFLINE")
    return result("You're offline. Check your connection and try again.", "retry", true);
  if (code === "401" || text.includes("token has expired") || text.includes("sign in again"))
    return result("Your session has expired. Sign in again to continue.", "sign_in");
  if (code === "402" || text.includes("insufficient credits"))
    return result("You don't have enough credits to continue. Check your usage.", "usage");
  if (code === "403") return result("You don't have access to this item.", "review");
  if (text.includes("retry_blocked") || text.includes("started a study tool"))
    return result(
      "This request already started a study tool. Check its results before making a new request.",
      "review"
    );
  if (text.includes("already running") || text.includes("stop the current response"))
    return result("A response is still running. Wait for it to finish, then try again.", "wait");
  if (text.includes("already has a saved answer"))
    return result("Your answer is already saved. Reopen this chat to view it.", "review");
  if (
    code.includes("QUOTA_EXCEEDED") ||
    text.includes("limit reached") ||
    text.includes("daily limit")
  )
    return result(
      context === "upload"
        ? "You've reached the upload limit. Try again in an hour."
        : "You've reached your usage limit. Try again after it resets.",
      "wait"
    );
  if (code === "429")
    return result("We're receiving a lot of requests. Please try again shortly.", "wait");
  if (text.includes("conversation is full"))
    return result("This conversation is full. Start a new chat to continue.", "review");
  if (text.includes("policy") || code.includes("PRIVACY") || code.includes("SENSITIVE"))
    return result(
      "This request couldn't be completed. Please change your question or remove private details.",
      "edit"
    );
  if (code === "413")
    return result(
      context === "voice"
        ? "The recording is too large. Try a shorter question."
        : "This file or message is too large. Use a smaller file or shorter question.",
      "edit"
    );
  if (code === "415" || code === "422")
    return result(
      context === "upload"
        ? "This file couldn't be read. Choose a supported file up to 10 MB."
        : "Check your message and attachments, then try again.",
      "edit"
    );
  if (code === "404")
    return result("This item is no longer available or you don't have access to it.", "review");
  if (code.startsWith("WEB_SEARCH_") && /DISABLED|CONFIGURED|TOOLS_DISABLED/.test(code))
    return result("Search isn't available for this request. Try again later.", "review");
  if (code === "409")
    return result("This chat has changed. Reopen it before trying again.", "review");
  const labels: Partial<Record<FailureContext, string>> = {
    upload: "We couldn't upload this file. Please try again.",
    voice: "We couldn't transcribe that recording. Please try again.",
    history: "We couldn't load your conversations. Please try again.",
    download: "We couldn't download this file. Please try again.",
    preview: "The preview isn't available. Retry, or download the file.",
    mutation: "Your change wasn't saved. Please try again.",
  };
  return result(labels[context] ?? generic, retryable ? "retry" : "review", retryable);
}

export function failureFrom(error: unknown, context: FailureContext = "response"): ChatFailureView {
  if (error instanceof ChatFailure) return error.view;
  if (typeof navigator !== "undefined" && navigator.onLine === false)
    return publicFailure("OFFLINE");
  return publicFailure("UNKNOWN", "", true, context);
}

export async function responseFailure(
  response: Response,
  context: FailureContext = "response"
): Promise<ChatFailure> {
  const body: unknown = await response.json().catch(() => null);
  const detail =
    body && typeof body === "object" && "detail" in body && typeof body.detail === "string"
      ? body.detail
      : "";
  return new ChatFailure(
    publicFailure(
      String(response.status),
      detail,
      response.status >= 500 || response.status === 408,
      context
    )
  );
}

export function retryDelay(
  attempt: number,
  hint: string | null = null,
  random = Math.random()
): number {
  if (hint) {
    const seconds = Number(hint);
    const millis = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(hint) - Date.now();
    if (Number.isFinite(millis)) return Math.max(0, millis);
  }
  return Math.min(4000, 500 * 2 ** (attempt - 1)) + random * 250;
}

export function waitForRetry(delay: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const cancel = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", cancel);
      resolve();
    }, delay);
    signal?.addEventListener("abort", cancel, { once: true });
  });
}

/** Only safe reads replay by default. Opt in solely for transcription of an in-memory recording. */
export async function fetchWithRecovery(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: { safeTranscription?: boolean; timeoutMs?: number; retries?: number } = {}
): Promise<Response> {
  const safe =
    ["GET", "HEAD"].includes((init.method ?? "GET").toUpperCase()) ||
    options.safeTranscription === true;
  const attempts = safe ? Math.min(2, options.retries ?? 2) + 1 : 1;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const signal = AbortSignal.any([
      ...(init.signal ? [init.signal] : []),
      AbortSignal.timeout(options.timeoutMs ?? 15000),
    ]);
    let response: Response;
    try {
      response = await fetch(input, { ...init, signal });
    } catch (error) {
      if (
        init.signal?.aborted ||
        attempt === attempts ||
        (typeof navigator !== "undefined" && navigator.onLine === false)
      )
        throw error;
      if (
        !(error instanceof TypeError) &&
        !(error instanceof DOMException && error.name === "TimeoutError")
      )
        throw error;
      await waitForRetry(retryDelay(attempt), init.signal ?? undefined);
      continue;
    }
    if (![408, 429, 500, 502, 503, 504].includes(response.status) || attempt === attempts)
      return response;
    const delay = retryDelay(attempt, response.headers.get("Retry-After"));
    if (delay > 30000) return response;
    await response.body?.cancel();
    await waitForRetry(delay, init.signal ?? undefined);
  }
  throw new ChatFailure(publicFailure());
}
