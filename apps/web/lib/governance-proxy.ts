/** Fixed upstream routes only. The client identification key never reaches the browser. */
export async function proxyGovernance(
  request: Request,
  path: string[],
  config: { apiUrl: string; apiKey?: string },
  transport: typeof fetch = fetch
): Promise<Response> {
  const fail = (status: number, detail: string): Response =>
    Response.json({ detail }, { status, headers: { "Cache-Control": "private, no-store" } });
  const route = path.join("/");
  const resources =
    "universities|students|lecturers|administrators|invitations|materials|timetable|exams|restrictions|knowledge|terms|support|audit|settings";
  const allowed =
    request.method === "GET"
      ? new RegExp(`^(identity|analytics|${resources}|materials/[0-9a-f-]{36}/file)$`, "i")
      : request.method === "POST"
        ? new RegExp(`^(${resources}|students/batch|upload|uploads/[0-9a-f-]{36}/confirm)$`, "i")
        : null;
  if (!allowed?.test(route)) return fail(404, "Administrative endpoint not found.");
  if (!config.apiKey)
    return fail(503, "Administrative access is being configured. Please try again shortly.");
  const authorization = request.headers.get("Authorization");
  if (!authorization || !/^Bearer [A-Za-z0-9._-]+$/.test(authorization))
    return fail(401, "Sign in again to continue.");
  let body: Uint8Array | undefined;
  if (request.body) {
    const reader = request.body.getReader();
    const parts: Uint8Array[] = [];
    let length = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 65536) {
          await reader.cancel();
          return fail(413, "This request is too large.");
        }
        parts.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    body = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) {
      body.set(part, offset);
      offset += part.length;
    }
  }
  const upstreamPath =
    route === "upload"
      ? "library/upload"
      : route.startsWith("uploads/")
        ? `governance/uploads/${path[1]}/confirm`
        : `governance/${route}`;
  const target = new URL(`/api/v1/${upstreamPath}`, config.apiUrl);
  const query = new URL(request.url).searchParams;
  for (const key of ["university_id", "search", "status", "page"])
    if (query.has(key)) target.searchParams.set(key, query.get(key)!);
  try {
    const upstream = await transport(target, {
      method: request.method,
      headers: {
        Authorization: authorization,
        "X-API-Key": config.apiKey,
        "Content-Type": "application/json",
      },
      body: body ? new Blob([body as Uint8Array<ArrayBuffer>]) : undefined,
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(45000)]),
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
        ...(upstream.headers.has("Content-Disposition")
          ? { "Content-Disposition": upstream.headers.get("Content-Disposition")! }
          : {}),
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return fail(503, "The administrative service could not be reached. Please retry.");
  }
}
