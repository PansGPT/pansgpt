export type LibraryLocation = { kind: "recent" | "courses" } | { kind: "course"; code: string };

export function readLibraryLocation(params: Pick<URLSearchParams, "get">): LibraryLocation {
  const code = params.get("course")?.trim();
  if (code && code.length <= 100) return { kind: "course", code };
  return { kind: params.get("tab") === "courses" ? "courses" : "recent" };
}

export function libraryLocationUrl(params: URLSearchParams, location: LibraryLocation): string {
  const next = new URLSearchParams(params);
  next.set("tab", location.kind === "recent" ? "recent" : "courses");
  next.delete("q");
  if (location.kind === "course") next.set("course", location.code);
  else next.delete("course");
  return `/app/library?${next.toString()}`;
}
