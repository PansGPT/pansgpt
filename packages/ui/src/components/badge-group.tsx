"use client";
import type { HTMLAttributes, ReactNode } from "react";
import { Badge } from "./badge";
import { Button } from "./button";
import { cn } from "../utils";
import imgArrowRight from "../../assets/badge-group-imgArrowRight.svg";
import imgArrowRight1 from "../../assets/badge-group-imgArrowRight1.svg";
import imgArrowRight2 from "../../assets/badge-group-imgArrowRight2.svg";
import imgArrowRight3 from "../../assets/badge-group-imgArrowRight3.svg";
import imgArrowRight4 from "../../assets/badge-group-imgArrowRight4.svg";
import imgArrowRight5 from "../../assets/badge-group-imgArrowRight5.svg";
import imgArrowRight6 from "../../assets/badge-group-imgArrowRight6.svg";
import imgArrowRight7 from "../../assets/badge-group-imgArrowRight7.svg";
import imgArrowRight8 from "../../assets/badge-group-imgArrowRight8.svg";
import imgArrowRight9 from "../../assets/badge-group-imgArrowRight9.svg";
import imgDot from "../../assets/badge-group-imgDot.svg";
import imgDot1 from "../../assets/badge-group-imgDot1.svg";
import imgDot2 from "../../assets/badge-group-imgDot2.svg";
import imgDot3 from "../../assets/badge-group-imgDot3.svg";
import imgDot4 from "../../assets/badge-group-imgDot4.svg";
import imgDot5 from "../../assets/badge-group-imgDot5.svg";
import imgDot6 from "../../assets/badge-group-imgDot6.svg";
import imgDot7 from "../../assets/badge-group-imgDot7.svg";
import imgDot8 from "../../assets/badge-group-imgDot8.svg";
import imgDot9 from "../../assets/badge-group-imgDot9.svg";
export const badgeGroupColors = ["gray", "brand", "error", "warning", "success"] as const;
export type BadgeGroupColor = (typeof badgeGroupColors)[number];
const arrows = {
  gray: [imgArrowRight4, imgArrowRight9],
  brand: [imgArrowRight, imgArrowRight5],
  error: [imgArrowRight1, imgArrowRight6],
  warning: [imgArrowRight2, imgArrowRight7],
  success: [imgArrowRight3, imgArrowRight8],
} as const;
const dots = {
  gray: [imgDot1, imgDot6],
  brand: [imgDot, imgDot5],
  error: [imgDot2, imgDot8],
  warning: [imgDot3, imgDot9],
  success: [imgDot1, imgDot6],
} as const;
function url(asset: string | { src: string }): string {
  return typeof asset === "string" ? asset : asset.src;
}
export type BadgeGroupProps = Omit<HTMLAttributes<HTMLElement>, "color" | "children"> & {
  badge: ReactNode;
  children: ReactNode;
  color?: BadgeGroupColor;
  size?: "md" | "lg";
  variant?: "pill" | "modern";
  placement?: "leading" | "trailing";
  arrow?: boolean;
  href?: string;
  onAction?: () => void;
  disabled?: boolean;
};
function BadgeGroupBase({
  badge,
  children,
  color = "gray",
  size = "md",
  variant = "pill",
  placement = "leading",
  arrow = true,
  href,
  onAction,
  disabled,
  className,
  state,
  ...props
}: BadgeGroupProps & { state?: "default" | "hover" }): React.ReactElement {
  const modern = variant === "modern";
  const leading = placement === "leading";
  const glyph = arrow ? (
    <img
      className="p-badge-group-arrow"
      src={url(arrows[modern ? "gray" : color][leading ? 0 : 1])}
      alt=""
      aria-hidden="true"
    />
  ) : null;
  const largeDot = !leading && size === "lg";
  const changesDot = !leading && color === "gray";
  const dot = modern ? (
    <span className="p-badge-group-dot" aria-hidden="true">
      <img className="p-badge-group-dot-normal" src={url(dots[color][largeDot ? 1 : 0])} alt="" />
      {changesDot && (
        <img className="p-badge-group-dot-hover" src={url(largeDot ? imgDot7 : imgDot4)} alt="" />
      )}
    </span>
  ) : null;
  const inner = (
    <Badge
      className="p-badge-group-badge"
      color={color}
      size={size === "md" ? "sm" : "md"}
      variant={modern ? "modern" : "pill"}
      leading={leading ? dot : undefined}
      trailing={!leading ? glyph : undefined}
    >
      <span className="p-badge-group-badge-text">{badge}</span>
    </Badge>
  );
  const content = (
    <span className="p-badge-group-content">
      {!leading && dot}
      <span className="p-badge-group-message">{children}</span>
      {leading && glyph}
    </span>
  );
  const composition = (
    <>
      {leading && inner}
      {content}
      {!leading && inner}
    </>
  );
  const common = {
    ...props,
    className: cn("p-badge-group", className),
    "data-color": color,
    "data-group-size": size,
    "data-group-variant": variant,
    "data-placement": placement,
    "data-reference-state": state,
  };
  if (onAction)
    return (
      <Button
        {...common}
        variant="secondary"
        leadingIcon={null}
        trailingIcon={null}
        onClick={onAction}
        disabled={disabled}
      >
        {composition}
      </Button>
    );
  if (href)
    return (
      <a {...common} href={href}>
        {composition}
      </a>
    );
  return <span {...common}>{composition}</span>;
}
export function BadgeGroup(props: BadgeGroupProps): React.ReactElement {
  return <BadgeGroupBase {...props} />;
}
export function BadgeGroupReference(
  props: BadgeGroupProps & { state: "default" | "hover" }
): React.ReactElement {
  return <BadgeGroupBase {...props} />;
}
