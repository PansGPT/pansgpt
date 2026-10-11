"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { Dialog as Primitive } from "radix-ui";
import { cn } from "../utils";
import { ApplicationNavMenuButton } from "./application-navigation";

export type ApplicationNavBreakpoint = "desktop" | "mobile";
export type ApplicationNavPanelProps = ComponentProps<"div"> & {
  logo: ReactNode;
  search?: ReactNode;
  navigation: ReactNode;
  footerNavigation?: ReactNode;
  featured?: ReactNode;
  account?: ReactNode;
  label?: string;
};
/** Shared full-height panel; overflow stays inside navigation so the account remains reachable. */
export function ApplicationNavPanel({
  logo,
  search,
  navigation,
  footerNavigation,
  featured,
  account,
  label = "Primary navigation",
  children,
  className,
  ...props
}: ApplicationNavPanelProps): React.ReactElement {
  return (
    <div {...props} className={cn("p-app-nav-panel", className)}>
      <div className="p-app-nav-panel-top">
        <div className="p-app-nav-panel-header">
          {logo}
          {search}
        </div>
        <nav className="p-app-nav-panel-links" aria-label={label}>
          {navigation}
        </nav>
      </div>
      <div className="p-app-nav-panel-footer">
        {footerNavigation && <nav aria-label={`${label} utilities`}>{footerNavigation}</nav>}
        {featured}
        {account && <div className="p-app-nav-panel-account">{account}</div>}
        {children}
      </div>
    </div>
  );
}
type MobileNavigationProps = {
  logo: ReactNode;
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  reference?: boolean;
  className?: string;
};
/** Reference mode places the same drawer surface inline for the Figma workbench. */
export function ApplicationMobileNavigation({
  logo,
  children,
  open,
  onOpenChange,
  label,
  reference = false,
  className,
}: MobileNavigationProps): React.ReactElement {
  const id = useId();
  const close = (
    <ApplicationNavMenuButton
      expanded
      aria-label={`Close ${label}`}
      onClick={() => onOpenChange(false)}
      className="p-app-nav-mobile-close"
    />
  );
  if (reference && open)
    return (
      <div className={cn("p-app-nav-mobile-reference", className)}>
        <div className="p-app-nav-mobile-scrim" />
        <div className="p-app-nav-mobile-panel">{children}</div>
        {close}
      </div>
    );
  return (
    <Primitive.Root open={open} onOpenChange={onOpenChange}>
      <header className={cn("p-app-nav-mobile-header", className)}>
        {logo}
        <Primitive.Trigger asChild>
          <ApplicationNavMenuButton expanded={open} aria-controls={id} />
        </Primitive.Trigger>
      </header>
      <Primitive.Portal>
        <Primitive.Overlay className="p-app-nav-mobile-overlay" />
        <Primitive.Content id={id} className="p-app-nav-mobile-dialog" aria-describedby={undefined}>
          <Primitive.Title className="p-sr-only">{label}</Primitive.Title>
          <div className="p-app-nav-mobile-panel">{children}</div>
          <Primitive.Close asChild>{close}</Primitive.Close>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
type ControlledNavigation = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};
function useNavigationOpen({
  open,
  defaultOpen = false,
  onOpenChange,
}: ControlledNavigation): readonly [boolean, (next: boolean) => void] {
  const [internal, setInternal] = useState(defaultOpen);
  return [
    open ?? internal,
    (next) => {
      if (open === undefined) setInternal(next);
      onOpenChange?.(next);
    },
  ];
}
export type ApplicationHeaderNavigationProps = ComponentProps<"div"> &
  ControlledNavigation & {
    breakpoint?: ApplicationNavBreakpoint;
    variant?: "simple" | "dual-tier";
    logo: ReactNode;
    navigation: ReactNode;
    actions?: ReactNode;
    subnavigation?: ReactNode;
    search?: ReactNode;
    mobileNavigation?: ReactNode;
    label?: string;
    reference?: boolean;
  };
export function ApplicationHeaderNavigation({
  breakpoint = "desktop",
  variant = "simple",
  logo,
  navigation,
  actions,
  subnavigation,
  search,
  mobileNavigation,
  label = "Application navigation",
  reference,
  open,
  defaultOpen,
  onOpenChange,
  className,
  ...props
}: ApplicationHeaderNavigationProps): React.ReactElement {
  const [expanded, changeOpen] = useNavigationOpen({ open, defaultOpen, onOpenChange });
  if (breakpoint === "mobile")
    return (
      <div
        {...props}
        className={cn("p-app-header-navigation", className)}
        data-breakpoint={breakpoint}
      >
        <ApplicationMobileNavigation
          logo={logo}
          open={expanded}
          onOpenChange={changeOpen}
          label={label}
          reference={reference}
        >
          {mobileNavigation ?? (
            <ApplicationNavPanel
              logo={logo}
              search={search}
              navigation={navigation}
              label={label}
            />
          )}
        </ApplicationMobileNavigation>
      </div>
    );
  return (
    <div
      {...props}
      className={cn("p-app-header-navigation", className)}
      data-breakpoint={breakpoint}
      data-variant={variant}
    >
      <header className="p-app-header-container">
        <div className="p-app-header-main">
          {logo}
          <nav aria-label={label}>{navigation}</nav>
        </div>
        {actions && <div className="p-app-header-actions">{actions}</div>}
      </header>
      {variant === "dual-tier" && expanded && (
        <div className="p-app-header-subcontainer">
          <nav aria-label={`${label} secondary`}>{subnavigation}</nav>
          {search && <div className="p-app-header-search">{search}</div>}
        </div>
      )}
    </div>
  );
}
export type ApplicationSidebarNavigationProps = Omit<ApplicationNavPanelProps, "children"> &
  ControlledNavigation & {
    breakpoint?: ApplicationNavBreakpoint;
    variant?: "simple" | "dual-tier" | "slim" | "sections-dividers" | "sections-subheadings";
    subnavigation?: ReactNode;
    subheading?: ReactNode;
    subaccount?: ReactNode;
    reference?: boolean;
  };
export function ApplicationSidebarNavigation({
  breakpoint = "desktop",
  variant = "simple",
  subnavigation,
  subheading,
  subaccount,
  reference,
  open,
  defaultOpen,
  onOpenChange,
  className,
  style,
  ...panel
}: ApplicationSidebarNavigationProps): React.ReactElement {
  const [expanded, changeOpen] = useNavigationOpen({ open, defaultOpen, onOpenChange });
  const label = panel.label ?? "Application navigation";
  if (breakpoint === "mobile")
    return (
      <div
        className={cn("p-app-sidebar-navigation", className)}
        data-breakpoint={breakpoint}
        data-variant={variant}
      >
        <ApplicationMobileNavigation
          logo={panel.logo}
          open={expanded}
          onOpenChange={changeOpen}
          label={label}
          reference={reference}
        >
          <ApplicationNavPanel {...panel} />
        </ApplicationMobileNavigation>
      </div>
    );
  return (
    <div
      className={cn("p-app-sidebar-navigation", className)}
      style={style}
      data-breakpoint={breakpoint}
      data-variant={variant}
      data-open={expanded}
    >
      <ApplicationNavPanel {...panel} />
      {expanded && (variant === "dual-tier" || variant === "slim") && (
        <div className="p-app-sidebar-secondary">
          {subheading && <strong>{subheading}</strong>}
          <nav aria-label={`${label} secondary`}>{subnavigation}</nav>
          {subaccount && <div className="p-app-sidebar-subaccount">{subaccount}</div>}
        </div>
      )}
    </div>
  );
}
export function ApplicationNavSection({
  title,
  children,
  className,
  ...props
}: ComponentProps<"div"> & { title?: ReactNode }): React.ReactElement {
  const id = useId();
  return (
    <div
      {...props}
      className={cn("p-app-nav-section", className)}
      role="group"
      aria-labelledby={title ? id : undefined}
    >
      {title && <h3 id={id}>{title}</h3>}
      {children}
    </div>
  );
}
