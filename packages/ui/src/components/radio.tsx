"use client";
import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "../utils";
export type RadioProps = Omit<ComponentProps<"input">, "type" | "size"> & {
  size?: "sm" | "md";
  label?: ReactNode;
  supportingText?: ReactNode;
  referenceState?: "default" | "hover" | "focused";
};
/** Native single-choice input. Give related options the same name to share browser keyboard and form behavior. */
export function Radio({
  id,
  size = "sm",
  label,
  supportingText,
  className,
  referenceState,
  "aria-describedby": describedBy,
  ...props
}: RadioProps): React.ReactElement {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const descriptionId = `${controlId}-description`;
  return (
    <div
      className={cn("p-choice", className)}
      data-kind="radio"
      data-size={size}
      data-labelled={label != null || undefined}
      data-disabled={props.disabled || undefined}
      data-reference-state={referenceState}
    >
      <span className="p-native-radio">
        <input
          {...props}
          type="radio"
          id={controlId}
          aria-describedby={
            [describedBy, supportingText ? descriptionId : undefined].filter(Boolean).join(" ") ||
            undefined
          }
        />
        <span className="p-native-radio-marker" aria-hidden="true">
          <span />
        </span>
      </span>
      {(label != null || supportingText != null) && (
        <div className="p-choice-copy">
          {label != null && <label htmlFor={controlId}>{label}</label>}
          {supportingText && <span id={descriptionId}>{supportingText}</span>}
        </div>
      )}
    </div>
  );
}
