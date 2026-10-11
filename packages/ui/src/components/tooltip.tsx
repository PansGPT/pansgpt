"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import { Tooltip as Primitive } from "radix-ui";
import { cn } from "../utils";
import { HelpIconGlyph, TooltipSurface } from "./tooltip-surface";

export * from "./tooltip-surface";

export interface TooltipProps {
  children: ReactElement;
  content: ReactNode;
  supportingText?: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
  delayDuration?: number;
  arrow?: boolean;
  align?: "start" | "center" | "end";
  alignOffset?: number;
  sideOffset?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Tooltip({
  children,
  content,
  supportingText,
  side = "top",
  className,
  delayDuration = 300,
  arrow = false,
  align = "center",
  alignOffset = 0,
  sideOffset = 8,
  open,
  defaultOpen,
  onOpenChange,
}: TooltipProps): ReactElement {
  return (
    <Primitive.Provider delayDuration={delayDuration}>
      <Primitive.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
        <Primitive.Trigger asChild>{children}</Primitive.Trigger>
        <Primitive.Portal>
          <Primitive.Content
            side={side}
            align={align}
            alignOffset={alignOffset}
            sideOffset={sideOffset}
            collisionPadding={8}
            data-arrow={arrow}
            className={cn("p-tooltip-positioner", className)}
          >
            <TooltipSurface content={content} supportingText={supportingText} />
          </Primitive.Content>
        </Primitive.Portal>
      </Primitive.Root>
    </Primitive.Provider>
  );
}

export const helpIconPlacements = [
  "top-no-arrow",
  "top-arrow",
  "top-left",
  "top-right",
  "bottom",
  "left",
  "right",
] as const;
export type HelpIconPlacement = (typeof helpIconPlacements)[number];
export type HelpIconProps = Omit<
  TooltipProps,
  "children" | "side" | "align" | "arrow" | "alignOffset" | "sideOffset"
> & {
  label?: string;
  placement?: HelpIconPlacement;
  disabled?: boolean;
};
export function HelpIcon({
  content,
  supportingText,
  label = "More information",
  placement = "top-no-arrow",
  disabled = false,
  open,
  defaultOpen = false,
  onOpenChange,
  className,
  ...props
}: HelpIconProps): ReactElement {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const visible = !disabled && (open ?? internalOpen);
  const side =
    placement === "bottom" || placement === "left" || placement === "right" ? placement : "top";
  const align = placement === "top-left" ? "end" : placement === "top-right" ? "start" : "center";
  return (
    <Tooltip
      {...props}
      content={content}
      supportingText={supportingText}
      side={side}
      align={align}
      alignOffset={align === "center" ? 0 : -12}
      sideOffset={4}
      arrow={placement !== "top-no-arrow"}
      open={visible}
      onOpenChange={(nextOpen) => {
        if (disabled) return;
        setInternalOpen(nextOpen);
        onOpenChange?.(nextOpen);
      }}
    >
      <button
        type="button"
        className={cn("p-help-icon", className)}
        aria-label={label}
        disabled={disabled}
      >
        <HelpIconGlyph open={visible} />
      </button>
    </Tooltip>
  );
}
