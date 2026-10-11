"use client";

import { useId, type ComponentProps, type ReactNode, type KeyboardEvent } from "react";
import { RadioGroup as Primitive } from "radix-ui";
import { cn } from "../utils";
import { navigateRadioGroup } from "./radio-keyboard";
import { ReferenceAsset } from "./reference-assets";

export interface RadioOption {
  value: string;
  label: string;
  subtext?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}
export type RadioGroupProps = Omit<ComponentProps<typeof Primitive.Root>, "children"> & {
  label: string;
  options: RadioOption[];
  variant?: "cards" | "plain" | "plans";
  size?: "sm" | "md";
};
export function RadioGroup({
  label,
  options,
  className,
  orientation = "vertical",
  variant = "cards",
  size = "sm",
  ...props
}: RadioGroupProps): React.ReactElement {
  const groupId = useId();
  const navigate = (event: KeyboardEvent<HTMLButtonElement>): void =>
    navigateRadioGroup(event, { orientation, dir: props.dir, loop: props.loop });
  return (
    <Primitive.Root
      {...props}
      orientation={orientation}
      aria-label={label}
      className={cn("p-radio-group", className)}
      data-variant={variant}
      data-size={size}
    >
      {options.map((option, index) => (
        <div key={option.value} className="p-radio-option" data-actions={Boolean(option.actions)}>
          <Primitive.Item
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            aria-labelledby={groupId + "-label-" + index}
            aria-describedby={
              option.description != null ? groupId + "-description-" + index : undefined
            }
            className="p-radio-card"
            onKeyDown={navigate}
          >
            <span className="p-radio-content">
              {option.icon && (
                <span className="p-radio-featured" aria-hidden="true">
                  {option.icon}
                </span>
              )}
              <span className="p-radio-copy">
                <span className="p-radio-title-row">
                  <span id={groupId + "-label-" + index} className="p-radio-title">
                    {option.label}
                  </span>
                  {option.subtext != null && (
                    <span className="p-radio-subtext">{option.subtext}</span>
                  )}
                </span>
                {option.description != null && (
                  <span id={groupId + "-description-" + index} className="p-radio-description">
                    {option.description}
                  </span>
                )}
              </span>
            </span>
            <span className="p-radio-marker" aria-hidden="true">
              <Primitive.Indicator>
                {variant === "plain" ? (
                  <span className="p-radio-dot" />
                ) : (
                  <ReferenceAsset name="radioImgCheck" />
                )}
              </Primitive.Indicator>
            </span>
          </Primitive.Item>
          {option.actions && <div className="p-radio-option-actions">{option.actions}</div>}
        </div>
      ))}
    </Primitive.Root>
  );
}
