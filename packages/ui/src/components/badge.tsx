"use client";

import type { ComponentProps, ReactNode } from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { ReferenceAsset, type ReferenceAssetName } from "./reference-assets";
import { cn } from "../utils";
import { badgeDots } from "./badge-assets";
import { BadgeCloseButton } from "./badge-close-button";
import { BadgeFinalAsset } from "./badge-final-assets";
import { badgeDecorationGlyphs, badgeDecorationStyles } from "./badge-decoration-data";

export const badgeColors = [
  "gray",
  "brand",
  "error",
  "warning",
  "success",
  "gray-blue",
  "blue-light",
  "blue",
  "indigo",
  "purple",
  "pink",
  "orange",
] as const;
export type BadgeColor = (typeof badgeColors)[number];
export type BadgeSize = "sm" | "md" | "lg";
export type BadgeVariant = "pill" | "color" | "modern";
export type BadgeDecoration =
  "none" | "dot" | "leading" | "trailing" | "only" | "country" | "avatar" | "close";
export type BadgeProps = Omit<ComponentProps<"span">, "color"> & {
  leading?: ReactNode;
  trailing?: ReactNode;
  color?: BadgeColor;
  size?: BadgeSize;
  variant?: BadgeVariant;
  dot?: boolean;
  decoration?: BadgeDecoration;
  decorationContent?: ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
  dismissDisabled?: boolean;
};
export function Badge({
  children,
  leading,
  trailing,
  className,
  color = "gray",
  size = "sm",
  variant = "pill",
  dot = false,
  decoration = "none",
  decorationContent,
  onDismiss,
  dismissLabel = "Remove badge",
  dismissDisabled = false,
  style,
  ...props
}: BadgeProps): React.ReactElement {
  const dotAsset = badgeDots[color];
  const kind = decoration === "none" && dot ? "dot" : decoration;
  const decorated = kind !== "none" && kind !== "dot";
  const source =
    badgeDecorationGlyphs[`${variant}:${size}:${kind}:${color}`] ??
    badgeDecorationGlyphs[`pill:sm:${kind}:${color}`] ??
    badgeDecorationGlyphs[`${variant}:${size}:${kind}:gray`];
  const graphic =
    decorated && kind !== "close" ? (
      <span className="p-badge-decoration" data-kind={kind}>
        {decorationContent ?? (source && <BadgeFinalAsset name={source} />)}
      </span>
    ) : null;
  return (
    <span
      {...props}
      className={cn("p-badge", className)}
      data-color={color}
      data-size={size}
      data-variant={variant}
      data-dot={kind === "dot" || undefined}
      data-decoration={kind}
      style={{
        ...(decorated ? badgeDecorationStyles[`${variant}:${size}:${kind}`] : {}),
        ...style,
      }}
    >
      {kind === "dot" && (
        <img
          className="p-badge-dot"
          src={typeof dotAsset === "string" ? dotAsset : dotAsset.src}
          alt=""
        />
      )}
      {["leading", "country", "avatar", "only"].includes(kind) && graphic}
      {leading}
      {kind !== "only" && children}
      {trailing}
      {kind === "trailing" && graphic}
      {kind === "close" && (
        <BadgeCloseButton
          color={color}
          shape={variant === "pill" ? "rounded" : "square"}
          aria-label={dismissLabel}
          onClick={onDismiss}
          disabled={dismissDisabled}
        />
      )}
    </span>
  );
}

export type TagSize = "sm" | "md" | "lg";
export type TagProps = ComponentProps<"span"> & {
  decoration?: "none" | "dot" | "country" | "avatar";
  dismissDisabled?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  size?: TagSize;
  count?: number;
  onDismiss?: () => void;
  dismissLabel?: string;
  selectable?: boolean;
  checkboxLabel?: string;
  name?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};
const checks: Record<TagSize, [ReferenceAssetName, ReferenceAssetName]> = {
  sm: ["tagCheckboxImgCheck", "tagCheckboxImgCheck1"],
  md: ["tagCheckboxImgCheck2", "tagCheckboxImgCheck4"],
  lg: ["tagCheckboxImgCheck3", "tagCheckboxImgCheck5"],
};
const closeIcons: Record<TagSize, [ReferenceAssetName, ReferenceAssetName]> = {
  sm: ["tagCloseAllImgXClose", "tagCloseAllImgXClose3"],
  md: ["tagCloseAllImgXClose1", "tagCloseAllImgXClose4"],
  lg: ["tagCloseAllImgXClose2", "tagCloseAllImgXClose5"],
};
export function Tag({
  children,
  leading,
  trailing,
  className,
  size = "sm",
  count,
  onDismiss,
  dismissLabel,
  selectable = false,
  checkboxLabel,
  name,
  checked,
  defaultChecked,
  disabled,
  decoration,
  dismissDisabled = disabled,
  onCheckedChange,
  ...props
}: TagProps): React.ReactElement {
  const label = typeof children === "string" ? children : "tag";
  const ornament = leading;
  return (
    <span
      {...props}
      className={cn("p-tag", className)}
      data-size={size}
      data-selectable={selectable || undefined}
      data-action={onDismiss ? "dismiss" : count != null ? "count" : "text"}
      data-decoration={decoration ?? (leading != null ? "avatar" : "none")}
    >
      <span className="p-tag-content">
        {selectable && (
          <CheckboxPrimitive.Root
            name={name}
            checked={checked}
            defaultChecked={defaultChecked}
            disabled={disabled}
            onCheckedChange={(value) => onCheckedChange?.(value === true)}
            aria-label={checkboxLabel ?? "Select " + label}
            className="p-tag-checkbox"
          >
            <CheckboxPrimitive.Indicator>
              <ReferenceAsset name={checks[size][disabled ? 1 : 0]} />
            </CheckboxPrimitive.Indicator>
          </CheckboxPrimitive.Root>
        )}
        {ornament}
        {children}
        {count != null && <span className="p-tag-count">{count}</span>}
        {trailing}
      </span>
      {onDismiss && (
        <button
          type="button"
          className="p-tag-dismiss"
          aria-label={dismissLabel ?? "Remove " + label}
          onClick={onDismiss}
          disabled={dismissDisabled}
        >
          <ReferenceAsset name={closeIcons[size][0]} className="p-tag-close-default" />
          <ReferenceAsset name={closeIcons[size][1]} className="p-tag-close-hover" />
        </button>
      )}
    </span>
  );
}
