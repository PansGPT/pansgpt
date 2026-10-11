import type { HTMLAttributes } from "react";
import { cn } from "../utils";
import type { TypographyStyle } from "../typography-styles";

export type TypographyProps = HTMLAttributes<HTMLElement> & {
  as?: "span" | "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "div";
  variant?: TypographyStyle;
};

export function Typography({
  as: Element = "p",
  variant = "text-md-regular",
  className,
  ...props
}: TypographyProps): React.ReactElement {
  return <Element {...props} className={cn("p-type-" + variant, className)} />;
}
