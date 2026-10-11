import type { ComponentProps, ReactNode } from "react";
import { cn } from "../utils";

export type ContentDividerProps = Omit<ComponentProps<"div">, "children"> & {
  variant?: "single" | "dual" | "filled";
  kind?: "heading" | "text" | "action";
  children: ReactNode;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  compact?: boolean;
};
export function ContentDivider({
  variant = "single",
  kind = "heading",
  children,
  headingLevel = 3,
  compact = false,
  className,
  ...props
}: ContentDividerProps): React.ReactElement {
  const Heading = `h${headingLevel}` as const;
  return (
    <div
      {...props}
      className={cn("p-content-divider", className)}
      data-variant={variant}
      data-kind={kind}
      data-compact={compact || undefined}
    >
      {variant === "single" && <span className="p-content-divider-line" aria-hidden="true" />}
      {kind === "heading" ? (
        <Heading className="p-content-divider-heading">{children}</Heading>
      ) : kind === "text" ? (
        <span className="p-content-divider-text">{children}</span>
      ) : (
        children
      )}
      {variant === "single" && <span className="p-content-divider-line" aria-hidden="true" />}
    </div>
  );
}
