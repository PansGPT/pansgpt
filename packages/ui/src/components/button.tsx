"use client";

import type { ComponentProps, ReactNode } from "react";
import { cn } from "../utils";
import { ButtonPlaceholder } from "./button-placeholder";

export type ButtonSize = "sm" | "md" | "lg" | "xl";
export type ButtonVariant = "primary" | "secondary" | "tertiary" | "link-color" | "link-gray";
type IconOnly =
  | { iconOnly: true; "aria-label": string; children?: never }
  | { iconOnly?: false; children: ReactNode };
export type ButtonProps = Omit<ComponentProps<"button">, "children"> &
  IconOnly & {
    size?: ButtonSize;
    variant?: ButtonVariant;
    destructive?: boolean;
    loading?: boolean;
    loadingText?: ReactNode;
    showLoadingText?: boolean;
    leadingIcon?: ReactNode;
    trailingIcon?: ReactNode;
  };

export function Button({
  children,
  className,
  size = "sm",
  variant = "primary",
  destructive = false,
  loading = false,
  loadingText,
  showLoadingText = true,
  leadingIcon,
  trailingIcon,
  iconOnly = false,
  disabled,
  type = "button",
  ...props
}: ButtonProps): React.ReactElement {
  const leading =
    leadingIcon === undefined ? (
      <ButtonPlaceholder variant={variant} destructive={destructive} disabled={disabled} />
    ) : (
      leadingIcon
    );
  const trailing =
    trailingIcon === undefined ? (
      <ButtonPlaceholder variant={variant} destructive={destructive} disabled={disabled} trailing />
    ) : (
      trailingIcon
    );
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn("p-button", className)}
      data-size={size}
      data-variant={variant}
      data-destructive={destructive || undefined}
      data-icon-only={iconOnly || undefined}
    >
      {(loading || leading) && (
        <span className="p-button-icon" aria-hidden="true">
          {loading ? (
            <ButtonPlaceholder variant={variant} destructive={destructive} loading />
          ) : (
            leading
          )}
        </span>
      )}
      {!iconOnly && (!loading || showLoadingText) && (
        <span className="p-button-text">{loading ? (loadingText ?? children) : children}</span>
      )}
      {!iconOnly && trailing && !loading && (
        <span className="p-button-icon" aria-hidden="true">
          {trailing}
        </span>
      )}
    </button>
  );
}
