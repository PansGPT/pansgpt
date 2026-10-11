"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import {
  Checkbox as CheckboxPrimitive,
  Switch as SwitchPrimitive,
  Slider as SliderPrimitive,
} from "radix-ui";
import { cn } from "../utils";
import { checkboxAssets } from "./checkbox-assets";
import { SliderValueLabel, type SliderLabelPosition } from "./slider-handle";

export type CheckboxProps = ComponentProps<typeof CheckboxPrimitive.Root> & {
  label?: ReactNode;
  supportingText?: ReactNode;
  size?: "sm" | "md";
  referenceState?: "default" | "hover" | "focused";
};
export function Checkbox({
  id,
  label,
  supportingText,
  className,
  size = "sm",
  referenceState,
  ...props
}: CheckboxProps): React.ReactElement {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const descriptionId = controlId + "-description";
  return (
    <div
      className="p-choice"
      data-kind="checkbox"
      data-size={size}
      data-labelled={label != null || undefined}
      data-disabled={props.disabled || undefined}
      data-reference-state={referenceState}
    >
      <CheckboxPrimitive.Root
        {...props}
        id={controlId}
        aria-describedby={
          [props["aria-describedby"], supportingText ? descriptionId : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className={cn("p-checkbox", className)}
      >
        <CheckboxPrimitive.Indicator className="p-checkbox-indicator">
          {(["check", "minus"] as const).map((kind) => {
            const key =
              (kind === "check" ? "imgCheck" : "imgMinus") +
              (props.disabled ? (size === "sm" ? "2" : "3") : size === "md" ? "1" : "");
            const asset = checkboxAssets[key as keyof typeof checkboxAssets];
            return (
              <img
                key={kind}
                src={typeof asset === "string" ? asset : asset.src}
                alt=""
                className={kind === "check" ? "p-check-icon" : "p-minus-icon"}
              />
            );
          })}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {(label != null || supportingText != null) && (
        <div className="p-choice-copy">
          {label != null && <label htmlFor={controlId}>{label}</label>}
          {supportingText && <span id={descriptionId}>{supportingText}</span>}
        </div>
      )}
    </div>
  );
}

export type ToggleProps = ComponentProps<typeof SwitchPrimitive.Root> & {
  label?: ReactNode;
  supportingText?: ReactNode;
  size?: "sm" | "md";
  variant?: "default" | "slim";
  referenceState?: "default" | "hover" | "focused";
};
export function Toggle({
  id,
  label,
  supportingText,
  className,
  size = "sm",
  variant = "default",
  referenceState,
  ...props
}: ToggleProps): React.ReactElement {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const descriptionId = controlId + "-description";
  return (
    <div
      className="p-choice"
      data-kind="toggle"
      data-size={size}
      data-variant={variant}
      data-reference-state={referenceState}
      data-labelled={label != null || undefined}
      data-disabled={props.disabled || undefined}
    >
      <SwitchPrimitive.Root
        {...props}
        id={controlId}
        aria-describedby={
          [props["aria-describedby"], supportingText ? descriptionId : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className={cn("p-toggle", className)}
      >
        <SwitchPrimitive.Thumb className="p-toggle-thumb" />
      </SwitchPrimitive.Root>
      {(label != null || supportingText != null) && (
        <div className="p-choice-copy">
          {label != null && <label htmlFor={controlId}>{label}</label>}
          {supportingText && <span id={descriptionId}>{supportingText}</span>}
        </div>
      )}
    </div>
  );
}

export type SliderProps = Omit<ComponentProps<typeof SliderPrimitive.Root>, "children"> & {
  thumbLabels: string[];
  labelPosition?: SliderLabelPosition;
  formatValue?: (value: number) => string;
};
export function Slider({
  className,
  thumbLabels,
  value,
  defaultValue = [0, 25],
  onValueChange,
  labelPosition = "none",
  formatValue = (value) => `${value}%`,
  ...props
}: SliderProps): React.ReactElement {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const values = value ?? internalValue;
  return (
    <SliderPrimitive.Root
      {...props}
      value={values}
      onValueChange={(next) => {
        setInternalValue(next);
        onValueChange?.(next);
      }}
      className={cn("p-slider", className)}
      data-label-position={labelPosition}
    >
      <SliderPrimitive.Track className="p-slider-track">
        <SliderPrimitive.Range className="p-slider-range" />
      </SliderPrimitive.Track>
      {values.map((currentValue, index) => (
        <SliderPrimitive.Thumb
          key={index}
          className="p-slider-thumb"
          aria-label={thumbLabels[index] ?? "Value " + (index + 1)}
          aria-valuetext={formatValue(currentValue)}
          aria-disabled={props.disabled || undefined}
        >
          <SliderValueLabel position={labelPosition} value={formatValue(currentValue)} />
        </SliderPrimitive.Thumb>
      ))}
    </SliderPrimitive.Root>
  );
}
