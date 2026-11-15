/** Cosmetic session metadata only. Never forward cookies, credentials or IP headers. */
export function browserAuthHeaders(headers: Pick<Headers, "get">): Record<string, string> {
  const agent = headers.get("user-agent")?.trim();
  if (!agent || !/^[\x20-\x7e]{1,1024}$/.test(agent)) return {};
  return { "User-Agent": agent };
}
