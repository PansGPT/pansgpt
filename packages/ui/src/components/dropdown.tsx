"use client";

import { DropdownMenu as Menu } from "radix-ui";
import { type ComponentProps, type ReactNode } from "react";
import { cn } from "../utils";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { NavigationAsset } from "./navigation-asset";
import { navigationAssetUrl } from "./navigation-assets";
import { checkboxAssets } from "./checkbox-assets";

export const Dropdown = Menu.Root;
export const DropdownTrigger = Menu.Trigger;

export type DropdownButtonProps = ComponentProps<typeof Menu.Trigger> & {
  variant?: "button" | "icon" | "avatar";
  avatarSrc?: string;
  label?: string;
};

export function DropdownButton({
  variant = "button",
  avatarSrc = navigationAssetUrl("dropdownImgSizeMdPlaceholderFalseTextFalseStatusIconFalse"),
  label = "Account",
  "aria-label": ariaLabel,
  className,
  children,
  ...props
}: DropdownButtonProps): React.ReactElement {
  return (
    <Menu.Trigger {...props} asChild>
      {variant === "button" ? (
        <Button
          variant="secondary"
          size="md"
          leadingIcon={null}
          aria-label={ariaLabel}
          trailingIcon={<NavigationAsset name="dropdownImgChevronDown" />}
          className={cn("p-dropdown-trigger", className)}
          data-trigger-variant="button"
        >
          {children ?? label}
        </Button>
      ) : (
        <button
          type="button"
          aria-label={ariaLabel ?? label}
          className={cn("p-dropdown-trigger", className)}
          data-trigger-variant={variant}
        >
          {variant === "avatar" ? (
            <Avatar size="md" label={label} src={avatarSrc} />
          ) : (
            <span className="p-dropdown-trigger-dots" aria-hidden="true">
              <span className="p-dropdown-dots-closed">
                <NavigationAsset name="dropdownImgDotsVertical1" />
              </span>
              <span className="p-dropdown-dots-open">
                <NavigationAsset name="dropdownImgDotsVertical" />
              </span>
            </span>
          )}
        </button>
      )}
    </Menu.Trigger>
  );
}

export function DropdownContent({
  className,
  children,
  align = "end",
  sideOffset = 8,
  loop = true,
  ...props
}: ComponentProps<typeof Menu.Content>): React.ReactElement {
  return (
    <Menu.Portal>
      <Menu.Content
        {...props}
        {...(props["aria-label"] && !props["aria-labelledby"]
          ? { "aria-labelledby": undefined }
          : {})}
        loop={loop}
        align={align}
        sideOffset={sideOffset}
        className={cn("p-dropdown-menu", className)}
      >
        {children}
      </Menu.Content>
    </Menu.Portal>
  );
}

export type DropdownHeaderProps = ComponentProps<"div"> & {
  title: string;
  description?: string;
  avatar?: ReactNode;
};
export function DropdownHeader({
  title,
  description,
  avatar,
  className,
  ...props
}: DropdownHeaderProps): React.ReactElement {
  return (
    <div
      {...props}
      className={cn("p-dropdown-header", className)}
      data-avatar={Boolean(avatar) || undefined}
    >
      {avatar}
      <div className="p-dropdown-header-copy">
        <span className="p-dropdown-header-title">{title}</span>
        {description && <span className="p-dropdown-header-description">{description}</span>}
      </div>
    </div>
  );
}

export function DropdownGroup({
  className,
  ...props
}: ComponentProps<typeof Menu.Group>): React.ReactElement {
  return <Menu.Group {...props} className={cn("p-dropdown-group", className)} />;
}

type ItemContentProps = { children: ReactNode; icon?: ReactNode; shortcut?: ReactNode };
function ItemContent({ children, icon, shortcut }: ItemContentProps): React.ReactElement {
  return (
    <>
      {icon && (
        <span className="p-dropdown-item-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="p-dropdown-item-label">{children}</span>
      {shortcut && (
        <span className="p-dropdown-shortcut" aria-hidden="true">
          {shortcut}
        </span>
      )}
    </>
  );
}

export type DropdownItemProps = Omit<ComponentProps<typeof Menu.Item>, "asChild"> &
  ItemContentProps & { href?: string };
export function DropdownItem({
  children,
  icon,
  shortcut,
  href,
  className,
  disabled,
  ...props
}: DropdownItemProps): React.ReactElement {
  const content = (
    <ItemContent icon={icon} shortcut={shortcut}>
      {children}
    </ItemContent>
  );
  return (
    <Menu.Item
      {...props}
      disabled={disabled}
      className={cn("p-dropdown-item", className)}
      asChild={Boolean(href && !disabled)}
    >
      {href && !disabled ? <a href={href}>{content}</a> : content}
    </Menu.Item>
  );
}

export type DropdownCheckboxItemProps = ComponentProps<typeof Menu.CheckboxItem> & {
  shortcut?: ReactNode;
  keepOpen?: boolean;
};
export function DropdownCheckboxItem({
  children,
  shortcut,
  className,
  keepOpen = true,
  onSelect,
  disabled,
  ...props
}: DropdownCheckboxItemProps): React.ReactElement {
  const asset = checkboxAssets[disabled ? "imgCheck2" : "imgCheck"];
  const mixed = checkboxAssets[disabled ? "imgMinus2" : "imgMinus"];
  return (
    <Menu.CheckboxItem
      {...props}
      disabled={disabled}
      className={cn("p-dropdown-item p-dropdown-checkbox-item", className)}
      onSelect={(event) => {
        onSelect?.(event);
        if (keepOpen) event.preventDefault();
      }}
    >
      <span className="p-dropdown-checkbox" aria-hidden="true">
        <Menu.ItemIndicator>
          <img
            src={typeof asset === "string" ? asset : asset.src}
            alt=""
            className="p-dropdown-check"
          />
          <img
            src={typeof mixed === "string" ? mixed : mixed.src}
            alt=""
            className="p-dropdown-mixed"
          />
        </Menu.ItemIndicator>
      </span>
      <ItemContent shortcut={shortcut}>{children}</ItemContent>
    </Menu.CheckboxItem>
  );
}

export function DropdownSeparator({
  className,
  ...props
}: ComponentProps<typeof Menu.Separator>): React.ReactElement {
  return (
    <Menu.Separator {...props} className={cn("p-dropdown-separator", className)}>
      <NavigationAsset name="dropdownImgDropdownListItem" />
    </Menu.Separator>
  );
}
