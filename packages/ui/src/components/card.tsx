import type { ComponentProps } from "react";
import { cn } from "../utils";

/** A non-interactive surface. Compose CardHeader and actual links/buttons inside. */
export function Card({ className, ...props }: ComponentProps<"div">): React.ReactElement {
  return <div {...props} className={cn("p-card", className)} />;
}

export function CardContent({ className, ...props }: ComponentProps<"div">): React.ReactElement {
  return <div {...props} className={cn("p-card-content", className)} />;
}

export function CardFooter({ className, ...props }: ComponentProps<"div">): React.ReactElement {
  return <div {...props} className={cn("p-card-footer", className)} />;
}
