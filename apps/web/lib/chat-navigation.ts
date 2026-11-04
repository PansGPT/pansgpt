export function chatSessionUrl(sessionId: string, isMobile: boolean): string {
  const encoded = encodeURIComponent(sessionId);
  return isMobile ? `/app?session=${encoded}` : `/app/chat?session=${encoded}`;
}

export function newChatUrl(isMobile: boolean): string {
  return isMobile ? "/app?chat=new" : "/app/chat";
}

export function cleanChatParams(search: string, pathname = "/app"): string {
  const params = new URLSearchParams(search);
  if (!params.has("session") && !params.has("chat")) return pathname;
  params.delete("session");
  params.delete("chat");
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
