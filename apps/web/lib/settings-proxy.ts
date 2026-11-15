/** Fixed account endpoints, bounded bodies and server-held client identity only. */
export async function proxySettings(
  request: Request,
  path: string[],
  config: { apiUrl: string; apiKey?: string },
  transport: typeof fetch = fetch
): Promise<Response> {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  const fail = (status: number, code: string, message: string): Response =>
    Response.json({ detail: { code, message } }, { status, headers });
  const route = path.join("/");
  const allowed =
    request.method === "GET"
      ? route === "sessions"
      : request.method === "DELETE"
        ? /^sessions(?:\/[0-9a-f-]{36})?$/i.test(route)
        : request.method === "PUT"
          ? route === "password"
          : request.method === "POST" && ["feedback", "password/reauthenticate"].includes(route);
  if (!allowed) return fail(404, "NOT_FOUND", "This action is unavailable.");
  const authorization = request.headers.get("Authorization");
  if (!authorization || !/^Bearer [A-Za-z0-9._-]+$/.test(authorization))
    return fail(401, "SESSION_EXPIRED", "Sign in again to continue.");
  if (!config.apiKey) return fail(503, "UNAVAILABLE", "Something went wrong. Please try again.");
  let body: Uint8Array<ArrayBuffer> | undefined;
  if (request.body) {
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        length += chunk.value.byteLength;
        if (length > 20000) {
          await reader.cancel();
          return fail(413, "CONFLICT", "This request is too large.");
        }
        chunks.push(chunk.value);
      }
    } catch {
      return fail(400, "CONFLICT", "Couldn't read this request. Please try again.");
    } finally {
      reader.releaseLock();
    }
    body = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.length;
    }
  }
  try {
    const upstream = await transport(new URL(`/api/v1/settings/${route}`, config.apiUrl), {
      method: request.method,
      headers: {
        Authorization: authorization,
        "X-API-Key": config.apiKey,
        "Content-Type": "application/json",
      },
      body: body ? new Blob([body]) : undefined,
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(20000)]),
      redirect: "error",
      cache: "no-store",
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        ...headers,
        "Content-Type": "application/json",
        ...(upstream.headers.has("Retry-After")
          ? { "Retry-After": upstream.headers.get("Retry-After")! }
          : {}),
      },
    });
  } catch {
    return fail(503, "UNAVAILABLE", "Something went wrong. Please try again.");
  }
}
