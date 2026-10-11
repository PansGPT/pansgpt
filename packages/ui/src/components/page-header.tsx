"use client";

import type { ComponentProps, ReactNode } from "react";
import { cn } from "../utils";
import divider from "../../assets/section-header-divider.svg";

export const pageHeaderStyles = [
  "simple",
  "avatar",
  "banner-simple",
  "banner-avatar",
  "banner-simple-centered",
  "banner-avatar-centered",
] as const;
export type PageHeaderStyle = (typeof pageHeaderStyles)[number];
export type PageHeaderProps = Omit<ComponentProps<"header">, "title" | "children" | "style"> & {
  title: ReactNode;
  supportingText?: ReactNode;
  variant?: PageHeaderStyle;
  breakpoint?: "auto" | "desktop" | "mobile";
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  breadcrumbs?: ReactNode;
  back?: ReactNode;
  avatar?: ReactNode;
  mobileAvatar?: ReactNode;
  actions?: ReactNode;
  mobileActions?: ReactNode;
  search?: ReactNode;
  banner?: ReactNode;
  divider?: boolean;
};

/** Application-owned navigation and controls compose into the twelve source layouts. */
export function PageHeader({
  title,
  supportingText,
  variant = "simple",
  breakpoint = "auto",
  headingLevel = 1,
  breadcrumbs,
  back,
  avatar,
  mobileAvatar = avatar,
  actions,
  mobileActions = actions,
  search,
  banner,
  divider: showDivider = true,
  className,
  ...props
}: PageHeaderProps): React.ReactElement {
  const Heading = `h${headingLevel}` as const;
  return (
    <header
      {...props}
      className={cn("p-page-header", className)}
      data-page-style={variant}
      data-page-breakpoint={breakpoint}
    >
      {variant.startsWith("banner-") && (
        <div className="p-page-header-banner-wrap">
          <div className="p-page-header-banner">{banner}</div>
        </div>
      )}
      <div className="p-page-header-container">
        <div className="p-page-header-layout">
          {avatar != null && variant.includes("avatar") && (
            <div className="p-page-header-avatar">
              <div className="p-page-header-desktop">{avatar}</div>
              <div className="p-page-header-mobile">{mobileAvatar}</div>
            </div>
          )}
          {breadcrumbs != null && (
            <div className="p-page-header-breadcrumbs p-page-header-desktop">{breadcrumbs}</div>
          )}
          {back != null && <div className="p-page-header-back p-page-header-mobile">{back}</div>}
          <div className="p-page-header-copy">
            <Heading>{title}</Heading>
            {supportingText != null && <p>{supportingText}</p>}
          </div>
          {actions != null && (
            <div className="p-page-header-actions p-page-header-desktop">{actions}</div>
          )}
          {mobileActions != null && (
            <div className="p-page-header-actions p-page-header-mobile">{mobileActions}</div>
          )}
          {search != null && <div className="p-page-header-search">{search}</div>}
        </div>
        {showDivider && (
          <div className="p-page-header-divider" aria-hidden="true">
            <img src={typeof divider === "string" ? divider : divider.src} alt="" />
          </div>
        )}
      </div>
    </header>
  );
}
