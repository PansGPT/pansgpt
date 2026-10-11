"use client";

import { Toolbar, ToggleGroup } from "radix-ui";
import { useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "../utils";
import { GroupAsset } from "./group-assets";

export type ButtonGroupKind = "text" | "leading" | "icon" | "dot";
type GroupContentProps = {
  kind: ButtonGroupKind;
  icon?: ReactNode;
  children?: ReactNode;
  disabled?: boolean;
};
function GroupContent({ kind, icon, children, disabled }: GroupContentProps): React.ReactElement {
  return (
    <>
      {(kind === "leading" || kind === "icon") && (
        <span className="p-group-icon" aria-hidden="true">
          {icon ?? (
            <>
              <span className="p-group-placeholder-default">
                <GroupAsset name="buttonGroupBaseImgPlaceholder" />
              </span>
              <span className="p-group-placeholder-current">
                <GroupAsset name="buttonGroupBaseImgPlaceholder1" />
              </span>
              <span className="p-group-placeholder-disabled">
                <GroupAsset name="buttonGroupBaseImgPlaceholder2" />
              </span>
            </>
          )}
        </span>
      )}
      {kind === "dot" && (
        <GroupAsset
          name={disabled ? "buttonGroupBaseImgDot" : "buttonGroupBaseImgSizeMdOutlineFalse"}
        />
      )}
      {kind !== "icon" && children}
    </>
  );
}

export type ButtonGroupProps = Omit<ComponentProps<typeof Toolbar.Root>, "aria-label"> & {
  label: string;
};
export function ButtonGroup({ label, className, ...props }: ButtonGroupProps): React.ReactElement {
  return <Toolbar.Root {...props} aria-label={label} className={cn("p-button-group", className)} />;
}

export type ButtonGroupButtonProps = Omit<ComponentProps<"button">, "children"> & {
  current?: boolean;
  icon?: ReactNode;
} & (
    | { kind: "icon"; "aria-label": string; children?: never }
    | { kind?: Exclude<ButtonGroupKind, "icon">; children: ReactNode }
  );
export function ButtonGroupButton({
  kind = "text",
  current,
  icon,
  children,
  className,
  type = "button",
  disabled,
  ...props
}: ButtonGroupButtonProps): React.ReactElement {
  return (
    <Toolbar.Button asChild disabled={disabled}>
      <button
        {...props}
        type={type}
        disabled={disabled}
        aria-pressed={current}
        className={cn("p-group-button", className)}
        data-kind={kind}
        data-current={current || undefined}
      >
        <GroupContent kind={kind} icon={icon} disabled={disabled}>
          {children}
        </GroupContent>
      </button>
    </Toolbar.Button>
  );
}

export interface SegmentedControlItem {
  value: string;
  label: string;
  kind?: ButtonGroupKind;
  icon?: ReactNode;
  disabled?: boolean;
}
export type SegmentedControlProps = Omit<
  ComponentProps<typeof ToggleGroup.Root>,
  "type" | "value" | "defaultValue" | "onValueChange" | "children" | "aria-label"
> & {
  label: string;
  items: readonly SegmentedControlItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
};
export function SegmentedControl({
  label,
  items,
  value,
  defaultValue,
  onValueChange,
  name,
  className,
  disabled,
  ...props
}: SegmentedControlProps): React.ReactElement {
  const [internal, setInternal] = useState(
    defaultValue ?? items.find((item) => !item.disabled)?.value ?? ""
  );
  const selected = value ?? internal;
  return (
    <>
      <ToggleGroup.Root
        {...props}
        type="single"
        disabled={disabled}
        value={selected}
        aria-label={label}
        className={cn("p-button-group", className)}
        onValueChange={(next) => {
          if (!next) return;
          if (value === undefined) setInternal(next);
          onValueChange?.(next);
        }}
      >
        {items.map((item) => (
          <ToggleGroup.Item
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            aria-label={item.kind === "icon" ? item.label : undefined}
            className="p-group-button"
            data-kind={item.kind ?? "text"}
            data-current={selected === item.value || undefined}
          >
            <GroupContent
              kind={item.kind ?? "text"}
              icon={item.icon}
              disabled={disabled || item.disabled}
            >
              {item.label}
            </GroupContent>
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
      {name && <input type="hidden" name={name} value={selected} disabled={disabled} />}
    </>
  );
}
