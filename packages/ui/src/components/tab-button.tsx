"use client";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "./button";
import { Badge } from "./badge";
import { cn } from "../utils";
export const tabButtonVariants = [
  "brand",
  "gray",
  "underline",
  "line",
  "white",
  "minimal",
] as const;
export type TabButtonVariant = (typeof tabButtonVariants)[number];
export type TabButtonProps = ComponentProps<"button"> & {
  size?: "sm" | "md";
  variant?: TabButtonVariant;
  current?: boolean;
  badge?: ReactNode;
};
function TabButtonBase({
  size = "sm",
  variant = "brand",
  current = false,
  badge,
  children,
  className,
  state,
  role,
  ...props
}: TabButtonProps & { state?: "default" | "hover" | "focus" }): React.ReactElement {
  return (
    <Button
      {...props}
      role={role}
      aria-pressed={role === "tab" ? undefined : current}
      size={size}
      variant="tertiary"
      leadingIcon={null}
      trailingIcon={null}
      className={cn("p-tab", "p-tab-button", className)}
      data-tab-size={size}
      data-tab-variant={variant}
      data-tab-current={current}
      data-reference-state={state}
    >
      <span className="p-tab-button-label">{children}</span>
      {badge != null && (
        <Badge
          size={size}
          color={
            current && (variant === "brand" || variant === "underline" || variant === "line")
              ? "brand"
              : "gray"
          }
        >
          {badge}
        </Badge>
      )}
    </Button>
  );
}
export function TabButton(props: TabButtonProps): React.ReactElement {
  return <TabButtonBase {...props} />;
}
export function TabButtonReference(
  props: TabButtonProps & { state: "default" | "hover" | "focus" }
): React.ReactElement {
  return <TabButtonBase {...props} />;
}
