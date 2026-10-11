"use client";

import { useState, type ComponentProps } from "react";
import { Tabs as Primitive } from "radix-ui";
import { Badge } from "./badge";
import { Select } from "./select";
import type { TabItem } from "./tabs";
import { cn } from "../utils";
import mobileChevron from "../../assets/vertical-tabs-chevron-down.svg";

export const verticalTabVariants = ["primary", "gray", "line", "border", "minimal"] as const;
export type VerticalTabVariant = (typeof verticalTabVariants)[number];
export interface VerticalTabItem extends Omit<TabItem, "label"> {
  label: string;
}
export type VerticalTabsProps = Omit<ComponentProps<typeof Primitive.Root>, "orientation"> & {
  items: VerticalTabItem[];
  label: string;
  size?: "sm" | "md";
  variant?: VerticalTabVariant;
  responsive?: boolean;
};
export function VerticalTabs({
  items,
  label,
  size = "sm",
  variant = "primary",
  responsive = true,
  value,
  defaultValue,
  onValueChange,
  className,
  ...props
}: VerticalTabsProps): React.ReactElement {
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? items.find((item) => !item.disabled)?.value
  );
  const selected = value ?? internalValue;
  const changeValue = (next: string): void => {
    if (value === undefined) setInternalValue(next);
    onValueChange?.(next);
  };
  return (
    <Primitive.Root
      {...props}
      orientation="vertical"
      value={selected}
      onValueChange={changeValue}
      className={cn("p-vertical-tabs", className)}
      data-size={size}
      data-variant={variant}
      data-responsive={responsive || undefined}
    >
      <Primitive.List aria-label={label} className="p-vertical-tabs-list">
        {items.map((item) => (
          <Primitive.Trigger
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            className="p-vertical-tab"
          >
            {item.label}
            {item.badge != null && <Badge size={size}>{item.badge}</Badge>}
          </Primitive.Trigger>
        ))}
      </Primitive.List>
      {responsive && (
        <div className="p-vertical-tabs-mobile">
          <Select
            aria-label={label}
            size="md"
            value={selected}
            onValueChange={changeValue}
            trailingIcon={
              <img
                src={typeof mobileChevron === "string" ? mobileChevron : mobileChevron.src}
                alt=""
              />
            }
            options={items.map(({ value: itemValue, label: itemLabel, disabled }) => ({
              value: itemValue,
              label: itemLabel,
              disabled,
            }))}
          />
        </div>
      )}
      <div className="p-vertical-tabs-panels">
        {items.map((item) => (
          <Primitive.Content key={item.value} value={item.value} className="p-tab-content">
            {item.content}
          </Primitive.Content>
        ))}
      </div>
    </Primitive.Root>
  );
}
