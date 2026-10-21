import type { ComponentProps } from "react";
import { cn } from "../utils";

export type SkeletonProps = Omit<ComponentProps<"span">, "children" | "role" | "aria-hidden"> & {
  variant?: "text" | "rectangle" | "circle";
  animated?: boolean;
};

/** Decorative only: the loading region owns aria-busy and its accessible label. */
export function Skeleton({
  variant = "text",
  animated = true,
  className,
  ...props
}: SkeletonProps): React.ReactElement {
  return (
    <span
      {...props}
      className={cn("p-skeleton", className)}
      aria-hidden="true"
      data-variant={variant}
      data-animated={animated}
    />
  );
}
