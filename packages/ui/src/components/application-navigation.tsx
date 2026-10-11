"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "../utils";
import { ApplicationNavigationAsset } from "./application-navigation-assets";
import { Badge } from "./badge";

export type ApplicationNavState = "default" | "hover" | "focused";
export type ApplicationNavMenuButtonProps = ComponentProps<"button"> & {
  expanded: boolean;
  state?: ApplicationNavState;
};
export function ApplicationNavMenuButton({
  expanded,
  state = "default",
  className,
  "aria-label": label,
  ...props
}: ApplicationNavMenuButtonProps): React.ReactElement {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      aria-label={label ?? (expanded ? "Close navigation" : "Open navigation")}
      aria-expanded={expanded}
      className={cn("p-app-nav-menu-button", className)}
      data-expanded={expanded}
      data-state={state}
    >
      <span className="p-app-nav-icon-default">
        <ApplicationNavigationAsset name={expanded ? "source0_imgXClose" : "source0_imgMenu02"} />
      </span>
      <span className="p-app-nav-icon-hover">
        <ApplicationNavigationAsset name={expanded ? "source0_imgXClose1" : "source0_imgMenu3"} />
      </span>
    </button>
  );
}
export type ApplicationNavIconButtonProps = ComponentProps<"button"> & {
  current?: boolean;
  size?: "md" | "lg";
  state?: ApplicationNavState;
  icon?: ReactNode;
};
export function ApplicationNavIconButton({
  current = false,
  size = "md",
  state = "default",
  icon,
  className,
  "aria-label": label = "Notifications",
  ...props
}: ApplicationNavIconButtonProps): React.ReactElement {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      aria-label={label}
      aria-current={current ? "page" : undefined}
      className={cn("p-app-nav-icon-button", className)}
      data-current={current}
      data-size={size}
      data-state={state}
    >
      {icon ?? (
        <>
          <span className="p-app-nav-icon-default">
            <ApplicationNavigationAsset
              name={
                size === "lg"
                  ? current
                    ? "source1_imgBell3"
                    : "source1_imgBell01"
                  : current
                    ? "source1_imgBell4"
                    : "source1_imgBell2"
              }
            />
          </span>
          <span className="p-app-nav-icon-hover">
            <ApplicationNavigationAsset
              name={size === "lg" ? "source1_imgBell3" : "source1_imgBell4"}
            />
          </span>
        </>
      )}
    </button>
  );
}
export type ApplicationNavItemProps = ComponentProps<"a"> & {
  current?: boolean;
  state?: ApplicationNavState;
  icon?: ReactNode;
  dot?: ReactNode;
  badge?: ReactNode;
  trailing?: ReactNode;
};
export function ApplicationNavItem({
  current = false,
  state = "default",
  icon,
  dot,
  badge,
  trailing,
  children,
  className,
  ...props
}: ApplicationNavItemProps): React.ReactElement {
  return (
    <a
      {...props}
      className={cn("p-app-nav-item", className)}
      aria-current={current ? "page" : props["aria-current"]}
      data-current={current}
      data-state={state}
    >
      <span className="p-app-nav-item-content">
        <span className="p-app-nav-item-main">
          {dot}
          {icon && <span className="p-app-nav-item-icon">{icon}</span>}
          <span className="p-app-nav-item-label">{children}</span>
        </span>
        {badge}
        {trailing}
      </span>
    </a>
  );
}
export type ApplicationNavDropdownProps = Omit<ComponentProps<"div">, "children" | "onToggle"> & {
  label: ReactNode;
  icon?: ReactNode;
  current?: boolean;
  badge?: ReactNode;
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  contentId: string;
};
export function ApplicationNavDropdown({
  label,
  icon,
  current = false,
  badge,
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  contentId,
  className,
  ...props
}: ApplicationNavDropdownProps): React.ReactElement {
  const [internal, setInternal] = useState(defaultOpen);
  const expanded = open ?? internal;
  const toggle = (): void => {
    if (open === undefined) setInternal(!expanded);
    onOpenChange?.(!expanded);
  };
  return (
    <div {...props} className={cn("p-app-nav-dropdown", className)}>
      <button
        className="p-app-nav-item"
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        data-current={current}
        onClick={toggle}
      >
        <span className="p-app-nav-item-content">
          <span className="p-app-nav-item-main">
            {icon && <span className="p-app-nav-item-icon">{icon}</span>}
            <span className="p-app-nav-item-label">{label}</span>
          </span>
          {badge}
          <span className="p-app-nav-dropdown-chevron">
            <ApplicationNavigationAsset
              name={expanded ? "source5_imgChevronUp" : "source5_imgChevronDown"}
            />
          </span>
        </span>
      </button>
      <div id={contentId} className="p-app-nav-subitems" hidden={!expanded}>
        {children}
      </div>
    </div>
  );
}
/** Default source item; applications should supply their own label, destination and icon. */
export function ApplicationNavItemReference({
  current = false,
  state = "default",
}: {
  current?: boolean;
  state?: ApplicationNavState;
}): React.ReactElement {
  return (
    <ApplicationNavItem
      href="#dashboard"
      current={current}
      state={state}
      dot={<ApplicationNavigationAsset name="source4_imgSizeMdOutlineFalse" />}
      icon={
        <ApplicationNavigationAsset
          name={
            current && state === "focused"
              ? "source4_imgBarChartSquare3"
              : "source4_imgBarChartSquare02"
          }
        />
      }
      badge={<Badge>10</Badge>}
      trailing={<ApplicationNavigationAsset name="source4_imgChevronDown" />}
    >
      Dashboard
    </ApplicationNavItem>
  );
}
