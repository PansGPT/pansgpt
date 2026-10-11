"use client";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../utils";
import { FigmaAsset } from "./asset";
export type SelectMenuItemProps = Omit<ComponentProps<"button">, "children"> & {
  label: ReactNode;
  supportingText?: ReactNode;
  leading?: ReactNode;
  selected?: boolean;
  size?: "sm" | "md";
  checkIcon?: ReactNode;
  referenceState?: "default" | "hover";
};
export function SelectMenuItem({
  label,
  supportingText,
  leading,
  selected = false,
  size = "sm",
  checkIcon,
  referenceState,
  className,
  ...props
}: SelectMenuItemProps): React.ReactElement {
  return (
    <div className="p-select-row" data-size={size} data-reference-state={referenceState}>
      <button
        {...props}
        type={props.type ?? "button"}
        role="option"
        aria-selected={selected}
        className={cn("p-select-item", className)}
        data-state={selected ? "checked" : "unchecked"}
        data-disabled={props.disabled || undefined}
      >
        {leading}
        <span className="p-select-row-label">{label}</span>
        {supportingText != null && <span className="p-select-supporting">{supportingText}</span>}
        {selected && (
          <span className="p-select-indicator">
            {checkIcon ?? (
              <FigmaAsset
                name={
                  size === "sm"
                    ? props.disabled
                      ? "selectCheckSmallDisabled"
                      : "selectCheckSmall"
                    : props.disabled
                      ? "selectCheckMediumDisabled"
                      : "selectCheckMedium"
                }
              />
            )}
          </span>
        )}
      </button>
    </div>
  );
}
