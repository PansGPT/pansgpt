/** Same-origin transport. FastAPI remains authoritative for identity, AI and grading. */
export async function proxyQuiz(
  request: Request,
  path: string[],
  config: { apiUrl: string; apiKey?: string },
  transport: typeof fetch = fetch
): Promise<Response> {
  const fail = (status: number, detail: string): Response =>
    Response.json({ detail }, { status, headers: { "Cache-Control": "private, no-store" } });
  const route = path.join("/");
  const uuid = "[0-9a-fA-F-]{36}";
  const allowed: Record<string, RegExp> = {
    GET: new RegExp(
      `^(courses|history|jobs/${uuid}(?:/events)?|attempts/${uuid}|results/${uuid})$`
    ),
    POST: new RegExp(
      `^(jobs|shared|jobs/${uuid}/(?:cancel|retry)|quizzes/${uuid}/attempts|attempts/${uuid}/submit|results/${uuid}/share)$`
    ),
    PUT: new RegExp(`^attempts/${uuid}/answers$`),
    DELETE: new RegExp(`^results/${uuid}/share$`),
  };
  if (
    !path.every((segment) => /^[a-z0-9-]+$/i.test(segment)) ||
    !allowed[request.method]?.test(route)
  )
    return fail(404, "Quiz endpoint not found.");
  if (!config.apiKey)
    return fail(503, "Quiz access is being configured. Please try again shortly.");
  const authorization = request.headers.get("Authorization");
  if (route !== "shared" && (!authorization || !/^Bearer [A-Za-z0-9._-]+$/.test(authorization)))
    return fail(401, "Sign in again to continue your quiz.");
  let body: Uint8Array | undefined;
  if (request.method !== "GET" && request.body) {
    const reader = request.body.getReader();
    const parts: Uint8Array[] = [];
    let length = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 524288) {
          await reader.cancel();
          return fail(413, "This quiz response is too large.");
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
  const query = new URL(request.url).searchParams;
  const target = new URL(`/api/v1/quiz/${route}`, config.apiUrl);
  // Only documented query parameters are forwarded, never a caller-supplied URL.
  for (const name of ["offset", "course"])
    if (query.has(name)) target.searchParams.set(name, query.get(name)!);
  try {
    const headers: Record<string, string> = {
      "X-API-Key": config.apiKey,
      "Content-Type": "application/json",
    };
    if (authorization) headers.Authorization = authorization;
    const upstream = await transport(target, {
      method: request.method,
      headers,
      body: body ? new Blob([body as Uint8Array<ArrayBuffer>]) : undefined,
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.any([
        request.signal,
        AbortSignal.timeout(route.endsWith("/events") ? 620000 : 120000),
      ]),
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
        "Cache-Control": "private, no-store",
        "X-Accel-Buffering": "no",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return fail(
      503,
      "The quiz service could not be reached. Your saved progress is safe; please retry."
    );
  }
}
