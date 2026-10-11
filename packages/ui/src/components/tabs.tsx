"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { Tabs as Primitive } from "radix-ui";
import { cn } from "../utils";
import { TabButton } from "./tab-button";
import { Select } from "./select";
import mobileChevron from "../../assets/horizontal-tabs-1119-3699-imgChevronDown.svg";

export interface TabItem {
  value: string;
  label: ReactNode;
  content: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
  mobileLabel?: string;
}
export const horizontalTabVariants = ["brand", "gray", "underline", "border", "minimal"] as const;
export type HorizontalTabVariant = (typeof horizontalTabVariants)[number];
export type TabsProps = ComponentProps<typeof Primitive.Root> & {
  items: TabItem[];
  label: string;
  size?: "sm" | "md";
  variant?: HorizontalTabVariant;
  fullWidth?: boolean;
  breakpoint?: "auto" | "desktop" | "mobile";
};
export function Tabs({
  items,
  label,
  className,
  size = "sm",
  variant = "brand",
  fullWidth = false,
  breakpoint = "auto",
  value,
  defaultValue,
  onValueChange,
  ...props
}: TabsProps): React.ReactElement {
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
      value={selected}
      onValueChange={changeValue}
      className={cn("p-tabs", className)}
      data-tab-size={size}
      data-tab-variant={variant}
      data-full-width={fullWidth}
      data-breakpoint={breakpoint}
    >
      <div className="p-tabs-navigation">
        <Primitive.List aria-label={label} className="p-tabs-list">
          {items.map((item) => (
            <Primitive.Trigger key={item.value} value={item.value} disabled={item.disabled} asChild>
              <TabButton
                size={size}
                variant={variant === "border" ? "white" : variant}
                current={selected === item.value}
                badge={item.badge}
              >
                {item.label}
              </TabButton>
            </Primitive.Trigger>
          ))}
        </Primitive.List>
      </div>
      <div className="p-tabs-mobile">
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
          options={items.map((item) => ({
            value: item.value,
            label: item.mobileLabel ?? (typeof item.label === "string" ? item.label : item.value),
            disabled: item.disabled,
          }))}
        />
      </div>
      {items.map((item) => (
        <Primitive.Content key={item.value} value={item.value} className="p-tab-content">
          {item.content}
        </Primitive.Content>
      ))}
    </Primitive.Root>
  );
}
