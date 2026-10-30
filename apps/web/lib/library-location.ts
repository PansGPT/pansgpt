export type LibraryLocation =
  { kind: "recent" | "courses" | "all" } | { kind: "course"; code: string };

export function readLibraryLocation(params: Pick<URLSearchParams, "get">): LibraryLocation {
  const code = params.get("course")?.trim();
  if (code && code.length <= 100) return { kind: "course", code };
  const tab = params.get("tab");
  if (tab === "courses") return { kind: "courses" };
  if (tab === "all") return { kind: "all" };
  return { kind: "recent" };
}

export function libraryLocationUrl(params: URLSearchParams, location: LibraryLocation): string {
  const next = new URLSearchParams(params);
  if (location.kind === "course") {
    next.set("tab", "courses");
    next.set("course", location.code);
  } else {
    next.set("tab", location.kind);
    next.delete("course");
  }
  next.delete("q");
  return `/app/library?${next.toString()}`;
}
