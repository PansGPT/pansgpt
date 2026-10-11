"use client";

import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { cn } from "../utils";
import { Input, type InputProps } from "./field";
import divider from "../../assets/section-header-divider.svg";
import mobileDivider from "../../assets/section-header-divider-mobile.svg";
import search from "../../assets/section-header-search.svg";

const assetUrl = (asset: string | { src: string }): string =>
  typeof asset === "string" ? asset : asset.src;
export type SectionHeaderProps = Omit<ComponentProps<"div">, "title" | "children"> & {
  title: ReactNode;
  leading?: ReactNode;
  badge?: ReactNode;
  supportingText?: ReactNode;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  breakpoint?: "auto" | "desktop" | "mobile";
  actions?: ReactNode;
  mobileActions?: ReactNode;
  control?: ReactNode;
  menu?: ReactNode;
  tabs?: ReactNode;
  divider?: boolean;
};

/** Compose source buttons, search or button-group controls in the header slots. */
export function SectionHeader({
  title,
  leading,
  badge,
  supportingText,
  headingLevel = 2,
  breakpoint = "auto",
  actions,
  mobileActions = actions,
  control,
  menu,
  tabs,
  divider: showDivider = true,
  className,
  ...props
}: SectionHeaderProps): React.ReactElement {
  const Heading = `h${headingLevel}` as const;
  return (
    <div
      {...props}
      className={cn("p-section-header", className)}
      data-header-breakpoint={breakpoint}
    >
      <div className="p-section-header-content">
        <div className="p-section-header-heading">
          {leading != null && <div className="p-section-header-leading">{leading}</div>}
          <div className="p-section-header-copy">
            <div className="p-section-header-title-row">
              <Heading className="p-section-header-title">{title}</Heading>
              {badge}
            </div>
            {supportingText != null && (
              <p className="p-section-header-supporting">{supportingText}</p>
            )}
          </div>
        </div>
        {control != null && <div className="p-section-header-control">{control}</div>}
        {actions != null && (
          <div className="p-section-header-actions p-section-header-desktop-actions">{actions}</div>
        )}
        {mobileActions != null && (
          <div className="p-section-header-actions p-section-header-mobile-actions">
            {mobileActions}
          </div>
        )}
        {menu != null && <div className="p-section-header-menu">{menu}</div>}
      </div>
      {tabs != null && <div className="p-section-header-tabs">{tabs}</div>}
      {showDivider && (
        <div className="p-section-header-divider" aria-hidden="true">
          <img className="p-section-header-divider-desktop" src={assetUrl(divider)} alt="" />
          <img className="p-section-header-divider-mobile" src={assetUrl(mobileDivider)} alt="" />
        </div>
      )}
    </div>
  );
}

export type SectionHeaderSearchProps = Omit<
  InputProps,
  "leadingIcon" | "trailingAddon" | "type"
> & {
  shortcut?: boolean;
  enableShortcut?: boolean;
};
export function SectionHeaderSearch({
  shortcut = true,
  enableShortcut = true,
  className,
  placeholder = "Search",
  disabled,
  ...props
}: SectionHeaderSearchProps): React.ReactElement {
  const wrapper = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!shortcut || !enableShortcut || disabled) return;
    const focusSearch = (event: KeyboardEvent): void => {
      if (
        event.key.toLowerCase() !== "k" ||
        !(event.metaKey || event.ctrlKey) ||
        event.altKey ||
        event.shiftKey
      )
        return;
      event.preventDefault();
      wrapper.current?.querySelector("input")?.focus();
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, [shortcut, enableShortcut, disabled]);
  return (
    <div className={cn("p-section-header-search", className)} ref={wrapper}>
      <Input
        {...props}
        disabled={disabled}
        type="search"
        placeholder={placeholder}
        aria-label={props["aria-label"] ?? "Search"}
        aria-keyshortcuts={shortcut && enableShortcut ? "Meta+K Control+K" : undefined}
        leadingIcon={<img src={assetUrl(search)} alt="" />}
        trailingAddon={
          shortcut ? (
            <kbd className="p-section-header-shortcut" aria-hidden="true">
              ⌘K
            </kbd>
          ) : undefined
        }
      />
    </div>
  );
}
