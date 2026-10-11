"use client";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../utils";
import { HelpIcon } from "./tooltip";
import { CommandAsset } from "./command-assets";

export function CommandShortcut({
  first = "⌘C",
  second,
  supportingText = true,
  arrow = true,
  className,
  ...props
}: ComponentProps<"span"> & {
  first?: string;
  second?: string;
  supportingText?: boolean;
  arrow?: boolean;
}): React.ReactElement {
  return (
    <span {...props} className={cn("p-command-shortcut", className)}>
      <kbd>{first}</kbd>
      {second && (
        <>
          {supportingText && <span>then</span>}
          {arrow && <CommandAsset name="shortcut_imgArrowRight" />}
          <kbd>{second}</kbd>
        </>
      )}
    </span>
  );
}
export type CommandInputProps = Omit<ComponentProps<"input">, "size"> & {
  help?: ReactNode;
  shortcut?: ReactNode;
  referenceState?: "placeholder" | "filled" | "focus";
};
export function CommandInput({
  help = <CommandHelp />,
  shortcut = <CommandShortcut first="/" />,
  referenceState,
  className,
  ...props
}: CommandInputProps): React.ReactElement {
  return (
    <div className={cn("p-command-input", className)} data-reference-state={referenceState}>
      <CommandAsset name="input_imgSearchLg" />
      <input
        {...props}
        type={props.type ?? "search"}
        aria-label={props["aria-label"] ?? "Search commands"}
        placeholder={props.placeholder ?? "Search"}
      />
      {help}
      {shortcut}
    </div>
  );
}
export type CommandMenuItemProps = Omit<ComponentProps<"button">, "children"> & {
  label: ReactNode;
  supportingText?: ReactNode;
  leading?: ReactNode;
  shortcut?: ReactNode;
  size?: "sm" | "md";
  textLayout?: "inline" | "stacked";
  active?: boolean;
  referenceState?: "default" | "hover" | "focus";
};
export function CommandMenuItem({
  label,
  supportingText,
  leading,
  shortcut,
  size = "sm",
  textLayout = "inline",
  active = false,
  referenceState,
  className,
  ...props
}: CommandMenuItemProps): React.ReactElement {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      className={cn("p-command-item", className)}
      data-size={size}
      data-text-layout={textLayout}
      data-active={active}
      data-reference-state={referenceState}
    >
      <span className="p-command-item-content">
        {leading != null && <span className="p-command-item-leading">{leading}</span>}
        <span className="p-command-item-copy">
          <span className="p-command-item-label">{label}</span>
          {supportingText != null && (
            <span className="p-command-item-supporting">{supportingText}</span>
          )}
        </span>
        {shortcut}
      </span>
    </button>
  );
}
export function CommandMenuHeader({
  size = "sm",
  className,
  children,
  ...props
}: ComponentProps<"div"> & { size?: "sm" | "md" }): React.ReactElement {
  return (
    <div {...props} className={cn("p-command-menu-header", className)} data-size={size}>
      {children}
    </div>
  );
}
export function CommandMenuSection({
  label,
  size = "sm",
  scrollable = false,
  className,
  children,
  ...props
}: ComponentProps<"div"> & {
  label?: ReactNode;
  size?: "sm" | "md";
  scrollable?: boolean;
}): React.ReactElement {
  return (
    <div
      {...props}
      className={cn("p-command-section", className)}
      data-size={size}
      data-scrollable={scrollable}
    >
      {label != null && <CommandMenuHeader size={size}>{label}</CommandMenuHeader>}
      <div className="p-command-section-items">{children}</div>
    </div>
  );
}
export function CommandNavigationKey({
  children,
  className,
  ...props
}: ComponentProps<"kbd">): React.ReactElement {
  return (
    <kbd {...props} className={cn("p-command-navigation-key", className)}>
      {children}
    </kbd>
  );
}
export function CommandFooter({
  onSettings,
  onBack,
  className,
  ...props
}: ComponentProps<"div"> & { onSettings?: () => void; onBack?: () => void }): React.ReactElement {
  return (
    <div {...props} className={cn("p-command-footer", className)}>
      <div className="p-command-footer-hints">
        <span>
          <CommandNavigationKey>
            <CommandAsset name="footer_imgArrowUp" />
          </CommandNavigationKey>
          <CommandNavigationKey>
            <CommandAsset name="footer_imgArrowDown" />
          </CommandNavigationKey>
          to navigate
        </span>
        <span>
          <CommandNavigationKey>
            <CommandAsset name="footer_imgCornerDownLeft" />
          </CommandNavigationKey>
          to select
        </span>
        <span>
          <CommandNavigationKey>esc</CommandNavigationKey>to close
        </span>
        {onBack && (
          <span>
            <button
              type="button"
              className="p-command-back"
              onClick={onBack}
              aria-label="Return to parent"
            >
              <CommandNavigationKey>
                <CommandAsset name="footer_imgArrowLeft" />
              </CommandNavigationKey>
            </button>
            return to parent
          </span>
        )}
      </div>
      {onSettings && (
        <button
          type="button"
          className="p-command-settings"
          onClick={onSettings}
          aria-label="Command settings"
        >
          <CommandAsset name="footer_imgSettings01" />
        </button>
      )}
    </div>
  );
}
export function CommandHelp({
  content = "Search and choose a command",
}: {
  content?: ReactNode;
}): React.ReactElement {
  return <HelpIcon content={content} label="Command search help" />;
}
export function CommandFeaturedIcon({
  children,
  size = "sm",
  className,
  ...props
}: ComponentProps<"span"> & { size?: "sm" | "md" }): React.ReactElement {
  return (
    <span {...props} className={cn("p-command-featured-icon", className)} data-size={size}>
      {children}
    </span>
  );
}
