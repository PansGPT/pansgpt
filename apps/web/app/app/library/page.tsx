import { WorkspaceLibrary } from "@/components/shell/library";
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}): Promise<React.ReactElement> {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.slice(0, 200) : "";
  return <WorkspaceLibrary key={query} initialQuery={query} />;
}
