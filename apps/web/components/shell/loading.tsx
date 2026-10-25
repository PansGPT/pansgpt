import { Skeleton } from "@pansgpt/ui/shell";
export function WorkspaceLoading(): React.ReactElement {
  return (
    <div
      className="workspace-loading"
      role="status"
      aria-label="Loading your workspace"
      aria-busy="true"
    >
      <Skeleton variant="rectangle" className="workspace-loading-heading" />
      <Skeleton className="workspace-loading-copy" />
      <div className="workspace-loading-grid">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} variant="rectangle" className="workspace-loading-card" />
        ))}
      </div>
      <span className="shell-sr-only">Loading your workspace…</span>
    </div>
  );
}
