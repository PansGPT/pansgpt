import { BrandMark } from "@/components/auth/brand-art";

/**
 * Centered minimalist loading screen with the green pulsing brand logo.
 */
export function WorkspaceLoading({ message }: { message?: string } = {}): React.ReactElement {
  return (
    <div
      className="workspace-loading"
      role="status"
      aria-label={message ?? "Loading PansGPT"}
      aria-busy="true"
    >
      <div className="workspace-loading-brand" aria-hidden="true">
        <BrandMark />
      </div>
      <span className="shell-sr-only">{message ?? "Loading PansGPT…"}</span>
    </div>
  );
}
