"use client";

import { Fragment, type ComponentProps, type ReactNode } from "react";
import { DropdownMenu } from "radix-ui";
import { cn } from "../utils";
import { ReferenceAsset } from "./reference-assets";

export interface BreadcrumbItem {
  id: string;
  label: string;
  href?: string;
  icon?: ReactNode;
}
export type BreadcrumbsProps = Omit<ComponentProps<"nav">, "children"> & {
  items: BreadcrumbItem[];
  divider?: "chevron" | "slash";
  variant?: "text" | "line" | "button";
  collapseAfter?: number;
};
export function Breadcrumbs({
  items,
  divider = "chevron",
  variant = "text",
  collapseAfter = 4,
  className,
  "aria-label": ariaLabel = "Breadcrumb",
  ...props
}: BreadcrumbsProps): React.ReactElement {
  const collapse = items.length > Math.max(3, collapseAfter);
  const hidden = collapse ? items.slice(2, -1) : [];
  const visible = collapse ? [items[0], items[1], undefined, items.at(-1)] : items;
  return (
    <nav
      {...props}
      aria-label={ariaLabel}
      className={cn("p-breadcrumbs", className)}
      data-variant={variant}
    >
      <ol className="p-breadcrumb-list">
        {visible.map((item, index) => (
          <Fragment key={item?.id ?? "overflow"}>
            {index > 0 && (
              <li className="p-breadcrumb-divider" aria-hidden="true">
                <ReferenceAsset
                  name={
                    divider === "chevron"
                      ? "breadcrumbsImgChevronRight"
                      : "breadcrumbsImgSlashDivider"
                  }
                />
              </li>
            )}
            <li className="p-breadcrumb-item">
              {!item ? (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger
                    className="p-breadcrumb-link"
                    aria-label="Show hidden breadcrumbs"
                  >
                    ...
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content className="p-breadcrumb-menu" sideOffset={8}>
                      {hidden.map((link) => (
                        <DropdownMenu.Item key={link.id} asChild>
                          <a href={link.href} className="p-breadcrumb-menu-item">
                            {link.label}
                          </a>
                        </DropdownMenu.Item>
                      ))}
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              ) : index === visible.length - 1 ? (
                <span aria-current="page" className="p-breadcrumb-link">
                  {item.icon ?? item.label}
                </span>
              ) : (
                <a
                  className="p-breadcrumb-link"
                  href={item.href}
                  aria-label={item.icon ? item.label : undefined}
                >
                  {item.icon ?? item.label}
                </a>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
