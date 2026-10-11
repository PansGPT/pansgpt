"use client";

import { DropdownMenu as Menu } from "radix-ui";
import { useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "../utils";
import { Avatar } from "./avatar";
import { ApplicationNavigationAsset } from "./application-navigation-assets";
export type NavigationAccount = {
  id: string;
  name: string;
  email: string;
  avatarSrc?: string;
  online?: boolean;
};
export type ApplicationNavAccountMenuItemProps = ComponentProps<"button"> & {
  account?: NavigationAccount;
  current?: boolean;
  icon?: ReactNode;
  shortcut?: ReactNode;
  state?: "default" | "hover";
};
export function ApplicationNavAccountMenuItem({
  account,
  current = false,
  icon,
  shortcut,
  state = "default",
  className,
  children,
  ...props
}: ApplicationNavAccountMenuItemProps): React.ReactElement {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      className={cn("p-app-nav-account-item", className)}
      data-account={account != null}
      data-current={current}
      data-state={state}
    >
      <span className="p-app-nav-account-item-content">
        {account ? (
          <>
            <Avatar
              size="md"
              src={account.avatarSrc}
              label={account.name}
              status={account.online ? "online" : "none"}
            />
            <span className="p-app-nav-account-copy">
              <strong>{account.name}</strong>
              <span>{account.email}</span>
            </span>
            <span className="p-app-nav-account-indicator" aria-hidden="true" />
          </>
        ) : (
          <>
            {icon}
            <span className="p-app-nav-account-label">{children}</span>
            {shortcut != null && <kbd className="p-app-nav-shortcut">{shortcut}</kbd>}
          </>
        )}
      </span>
    </button>
  );
}
export type NavigationAccountAction = {
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: ReactNode;
  disabled?: boolean;
  onSelect: () => void;
};
export type ApplicationNavAccountCardButtonProps = ComponentProps<"button"> & {
  account: NavigationAccount;
  breakpoint?: "desktop" | "mobile";
};
export function ApplicationNavAccountCardButton({
  account,
  breakpoint = "desktop",
  className,
  ...props
}: ApplicationNavAccountCardButtonProps): React.ReactElement {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      className={cn("p-app-nav-account-card", className)}
      data-type="card"
      data-breakpoint={breakpoint}
    >
      <Avatar
        size="md"
        src={account.avatarSrc}
        label={account.name}
        status={account.online ? "online" : "none"}
      />
      <span className="p-app-nav-account-copy">
        <strong>{account.name}</strong>
        <span>{account.email}</span>
      </span>
      <span className="p-app-nav-account-utility" aria-hidden="true">
        <ApplicationNavigationAsset
          name={
            props["aria-expanded"] === true
              ? "source3_imgChevronSelectorVertical1"
              : "source3_imgChevronSelectorVertical"
          }
        />
      </span>
    </button>
  );
}
export type ApplicationNavAccountCardProps = {
  account: NavigationAccount;
  accounts?: readonly NavigationAccount[];
  onAccountChange?: (id: string) => void;
  onAddAccount?: () => void;
  onSignOut: () => void;
  actions?: readonly NavigationAccountAction[];
  type?: "simple" | "card";
  breakpoint?: "desktop" | "mobile";
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};
export function ApplicationNavAccountCard({
  account,
  accounts = [],
  onAccountChange,
  onAddAccount,
  onSignOut,
  actions = [],
  type = "card",
  breakpoint = "desktop",
  open,
  defaultOpen = false,
  onOpenChange,
  className,
}: ApplicationNavAccountCardProps): React.ReactElement {
  const [internal, setInternal] = useState(defaultOpen);
  const expanded = open ?? internal;
  const changeOpen = (next: boolean): void => {
    if (open === undefined) setInternal(next);
    onOpenChange?.(next);
  };
  const copy = (
    <>
      <Avatar
        size="md"
        src={account.avatarSrc}
        label={account.name}
        status={account.online ? "online" : "none"}
      />
      <span className="p-app-nav-account-copy">
        <strong>{account.name}</strong>
        <span>{account.email}</span>
      </span>
    </>
  );
  if (type === "simple")
    return (
      <div
        className={cn("p-app-nav-account-card", className)}
        data-type="simple"
        data-breakpoint={breakpoint}
      >
        {copy}
        <button
          type="button"
          className="p-app-nav-account-utility"
          aria-label="Sign out"
          onClick={onSignOut}
        >
          <ApplicationNavigationAsset name="source3_imgLogOut01" />
        </button>
      </div>
    );
  return (
    <Menu.Root open={expanded} onOpenChange={changeOpen}>
      <Menu.Trigger asChild>
        <ApplicationNavAccountCardButton
          account={account}
          breakpoint={breakpoint}
          className={className}
          aria-label={`Account menu for ${account.name}`}
        />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          side={breakpoint === "mobile" ? "top" : "right"}
          align="end"
          sideOffset={8}
          collisionPadding={8}
          className="p-app-nav-account-menu"
          data-breakpoint={breakpoint}
          loop
          aria-label="Account menu"
        >
          <div className="p-app-nav-account-actions">
            {actions.map((action) => (
              <Menu.Item
                key={action.id}
                asChild
                disabled={action.disabled}
                onSelect={action.onSelect}
              >
                <ApplicationNavAccountMenuItem icon={action.icon} shortcut={action.shortcut}>
                  {action.label}
                </ApplicationNavAccountMenuItem>
              </Menu.Item>
            ))}
          </div>
          <Menu.Separator className="p-app-nav-account-divider" />
          <div className="p-app-nav-account-switch">
            <Menu.Label>Switch account</Menu.Label>
            <Menu.RadioGroup value={account.id} onValueChange={onAccountChange}>
              {accounts.map((item) => (
                <Menu.RadioItem key={item.id} value={item.id} asChild>
                  <ApplicationNavAccountMenuItem account={item} current={item.id === account.id} />
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </div>
          {onAddAccount && (
            <div className="p-app-nav-account-add-wrap">
              <Menu.Item asChild onSelect={onAddAccount}>
                <button type="button" className="p-app-nav-account-add">
                  <ApplicationNavigationAsset name="source3_imgPlus" />
                  Add account
                </button>
              </Menu.Item>
            </div>
          )}
          <Menu.Separator className="p-app-nav-account-divider" />
          <div className="p-app-nav-account-footer">
            <Menu.Item asChild onSelect={onSignOut}>
              <ApplicationNavAccountMenuItem
                icon={<ApplicationNavigationAsset name="source3_imgLogOut2" />}
                shortcut="⌥⇧Q"
              >
                Sign out
              </ApplicationNavAccountMenuItem>
            </Menu.Item>
          </div>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
