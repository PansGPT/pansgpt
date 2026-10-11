"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "../utils";
import { FigmaAsset } from "./asset";
import { Tooltip } from "./tooltip";
import { FieldNativeAsset } from "./field-native-assets";

export interface FieldOptions {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  help?: string;
  helpIcon?: ReactNode;
  className?: string;
}

export function FieldLabel({
  id,
  label,
  required,
  help,
  helpIcon,
}: {
  id: string;
  label?: ReactNode;
  required?: boolean;
  help?: string;
  helpIcon?: ReactNode;
}): React.ReactElement | null {
  if (!label) return null;
  return (
    <div className="p-field-label-row">
      <label id={id + "-label"} className="p-field-label" htmlFor={id}>
        {label}
        {required && (
          <span className="p-required" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {help && (
        <Tooltip content={help}>
          <button type="button" className="p-help" aria-label={help}>
            {helpIcon ?? <FigmaAsset name="help" />}
          </button>
        </Tooltip>
      )}
    </div>
  );
}

export function FieldMessage({
  id,
  hint,
  error,
}: {
  id: string;
  hint?: ReactNode;
  error?: ReactNode;
}): React.ReactElement | null {
  const message = error ?? hint;
  return message == null ? null : (
    <div id={id} className="p-field-message" data-error={error != null || undefined}>
      {message}
    </div>
  );
}

export type InputProps = Omit<ComponentProps<"input">, "size"> &
  FieldOptions & {
    size?: "sm" | "md";
    leadingIcon?: ReactNode;
    leadingAddon?: ReactNode;
    trailingAddon?: ReactNode;
    trailingAction?: ReactNode;
    layout?:
      | "default"
      | "leading-dropdown"
      | "trailing-dropdown"
      | "leading-text"
      | "payment"
      | "tags"
      | "trailing-button";
    errorIcon?: ReactNode;
    referenceState?: "default" | "focused";
    requiredIndicator?: boolean;
    helpPlacement?: "control" | "label";
  };

export function Input({
  id,
  label,
  hint,
  error,
  help,
  helpIcon,
  className,
  size = "sm",
  leadingIcon,
  leadingAddon,
  trailingAddon,
  trailingAction,
  layout = "default",
  errorIcon = <FieldNativeAsset name="source0_imgAlertCircle" />,
  referenceState,
  required,
  requiredIndicator,
  helpPlacement = "control",
  "aria-describedby": describedBy,
  ...props
}: InputProps): React.ReactElement {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = inputId + "-message";
  return (
    <div
      className={cn("p-field", className)}
      data-size={size}
      data-error={error != null || undefined}
      data-disabled={props.disabled || undefined}
      data-layout={layout}
      data-reference-state={referenceState}
    >
      <FieldLabel
        id={inputId}
        label={label}
        required={requiredIndicator ?? required}
        help={helpPlacement === "label" ? help : undefined}
        helpIcon={helpIcon}
      />
      <div className="p-field-control">
        {leadingAddon != null && <span className="p-field-addon">{leadingAddon}</span>}
        <div className="p-field-input-area">
          {leadingIcon && (
            <span className="p-field-icon" aria-hidden="true">
              {leadingIcon}
            </span>
          )}
          <input
            {...props}
            id={inputId}
            required={required}
            aria-invalid={error != null ? true : props["aria-invalid"]}
            aria-describedby={
              [describedBy, error != null || hint != null ? messageId : null]
                .filter(Boolean)
                .join(" ") || undefined
            }
            className="p-input"
          />
          {error != null
            ? errorIcon != null && (
                <span className="p-field-icon" aria-hidden="true">
                  {errorIcon}
                </span>
              )
            : help &&
              helpPlacement === "control" && (
                <Tooltip content={help}>
                  <button type="button" className="p-help" aria-label={help}>
                    {helpIcon ?? <FigmaAsset name="help" />}
                  </button>
                </Tooltip>
              )}
        </div>
        {trailingAddon != null && <span className="p-field-addon">{trailingAddon}</span>}
        {trailingAction}
      </div>
      <FieldMessage id={messageId} hint={hint} error={error} />
    </div>
  );
}

export type TextareaProps = ComponentProps<"textarea"> &
  FieldOptions & { resizable?: boolean; referenceState?: "default" | "focused" };
export function Textarea({
  id,
  label,
  hint,
  error,
  help,
  helpIcon,
  className,
  required,
  resizable = true,
  referenceState,
  "aria-describedby": describedBy,
  ...props
}: TextareaProps): React.ReactElement {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = inputId + "-message";
  return (
    <div
      className={cn("p-field", "p-textarea-field", className)}
      data-reference-state={referenceState}
      data-error={error != null || undefined}
      data-disabled={props.disabled || undefined}
    >
      <FieldLabel id={inputId} label={label} required={required} help={help} helpIcon={helpIcon} />
      <div className="p-textarea-control">
        <textarea
          {...props}
          id={inputId}
          required={required}
          data-resizable={resizable}
          aria-invalid={error != null ? true : props["aria-invalid"]}
          aria-describedby={
            [describedBy, error != null || hint != null ? messageId : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className="p-textarea"
        />
        {resizable && <FigmaAsset name="resize" className="p-resize-handle" />}
      </div>
      <FieldMessage id={messageId} hint={hint} error={error} />
    </div>
  );
}
