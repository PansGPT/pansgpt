"use client";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../utils";
import { CloseButton } from "./close-button";
export const navFeaturedCardTypes = [
  "progress-bar",
  "image",
  "progress-circle",
  "cookies",
  "projects",
  "referral",
  "onboarding",
  "upgrade",
  "support",
  "event",
  "message",
  "trial",
  "qr-code",
] as const;
export type NavFeaturedCardType = (typeof navFeaturedCardTypes)[number];
export type NavFeaturedCardProps = ComponentProps<"aside"> & {
  type?: NavFeaturedCardType;
  onDismiss?: () => void;
  dismissLabel?: string;
};
export function NavFeaturedCard({
  type = "progress-bar",
  onDismiss,
  dismissLabel = "Dismiss card",
  className,
  children,
  ...props
}: NavFeaturedCardProps): React.ReactElement {
  return (
    <aside {...props} className={cn("p-nav-featured-card", className)} data-type={type}>
      {onDismiss && (
        <CloseButton
          className="p-nav-featured-card-close"
          size="sm"
          aria-label={dismissLabel}
          onClick={onDismiss}
        />
      )}
      {children}
    </aside>
  );
}
export function NavFeaturedCardText({
  title,
  supportingText,
  badge,
  meta,
  children,
  className,
  ...props
}: ComponentProps<"div"> & {
  title: ReactNode;
  supportingText?: ReactNode;
  badge?: ReactNode;
  meta?: ReactNode;
}): React.ReactElement {
  return (
    <div {...props} className={cn("p-nav-featured-card-text", className)}>
      <div className="p-nav-featured-card-title">
        <strong>{title}</strong>
        {badge}
        {meta && <span className="p-nav-featured-card-meta">{meta}</span>}
      </div>
      {supportingText != null && <p>{supportingText}</p>}
      {children}
    </div>
  );
}
export function NavFeaturedCardGroup({
  children,
  className,
  ...props
}: ComponentProps<"div">): React.ReactElement {
  return (
    <div {...props} className={cn("p-nav-featured-card-group", className)}>
      {children}
    </div>
  );
}
export function NavFeaturedCardActions({
  children,
  className,
  ...props
}: ComponentProps<"div">): React.ReactElement {
  return (
    <div {...props} className={cn("p-nav-featured-card-actions", className)}>
      {children}
    </div>
  );
}
export function NavFeaturedCardIcon({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <span className="p-nav-featured-card-icon" aria-hidden="true">
      {children}
    </span>
  );
}
