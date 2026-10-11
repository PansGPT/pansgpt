import type { ComponentProps, CSSProperties } from "react";
import { cn } from "../utils";

/** Decorative Figma scrollbar specimen; use native overflow for live scrolling. */
export function ScrollbarReference({
  bottomPadding = 64,
  className,
  style,
  ...props
}: ComponentProps<"span"> & { bottomPadding?: number }): React.ReactElement {
  return (
    <span
      {...props}
      className={cn("p-scrollbar-reference", className)}
      style={
        {
          ...style,
          "--scrollbar-bottom-padding": `${Math.max(0, bottomPadding)}px`,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <span />
    </span>
  );
}
