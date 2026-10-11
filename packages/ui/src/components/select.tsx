"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { Select as Primitive } from "radix-ui";
import { cn } from "../utils";
import { FieldLabel, FieldMessage, type FieldOptions } from "./field";
import { FigmaAsset } from "./asset";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  leading?: ReactNode;
  supportingText?: string;
}
export type SelectProps = ComponentProps<typeof Primitive.Root> &
  FieldOptions & {
    options: SelectOption[];
    placeholder?: string;
    leadingIcon?: ReactNode;
    trailingIcon?: ReactNode;
    id?: string;
    size?: "sm" | "md";
    "aria-label"?: string;
  };
export function Select({
  id,
  label,
  hint,
  error,
  help,
  helpIcon,
  options,
  placeholder,
  leadingIcon,
  trailingIcon = <FigmaAsset name="chevronDown" />,
  className,
  size = "sm",
  "aria-label": ariaLabel,
  ...props
}: SelectProps): React.ReactElement {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const messageId = controlId + "-message";
  const [internalValue, setInternalValue] = useState(props.defaultValue);
  const selectedValue = props.value ?? internalValue;
  const selectedOption = options.find((option) => option.value === selectedValue);
  const selectedLeading = leadingIcon ?? selectedOption?.leading;
  return (
    <div
      className={cn("p-field", className)}
      data-size={size}
      data-error={error != null || undefined}
      data-disabled={props.disabled || undefined}
    >
      <FieldLabel
        id={controlId}
        label={label}
        required={props.required}
        help={help}
        helpIcon={helpIcon}
      />
      <Primitive.Root
        {...props}
        onValueChange={(value) => {
          setInternalValue(value);
          props.onValueChange?.(value);
        }}
      >
        <Primitive.Trigger
          id={controlId}
          aria-label={ariaLabel}
          aria-invalid={error != null || undefined}
          aria-describedby={error != null || hint != null ? messageId : undefined}
          className="p-select-trigger"
        >
          {selectedLeading && (
            <span className="p-select-leading" aria-hidden="true">
              {selectedLeading}
            </span>
          )}
          <span className="p-select-value">
            <Primitive.Value placeholder={placeholder} />
            {selectedOption?.supportingText && (
              <span className="p-select-supporting">{selectedOption.supportingText}</span>
            )}
          </span>
          <Primitive.Icon>{trailingIcon}</Primitive.Icon>
        </Primitive.Trigger>
        <Primitive.Portal>
          <Primitive.Content
            position="popper"
            sideOffset={4}
            className="p-select-menu"
            data-size={size}
          >
            <Primitive.Viewport>
              {options.map((option) => (
                <Primitive.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className="p-select-item"
                >
                  {option.leading}
                  <Primitive.ItemText>{option.label}</Primitive.ItemText>
                  {option.supportingText && (
                    <span className="p-select-supporting">{option.supportingText}</span>
                  )}
                  <Primitive.ItemIndicator className="p-select-indicator">
                    <FigmaAsset
                      name={
                        size === "sm"
                          ? option.disabled
                            ? "selectCheckSmallDisabled"
                            : "selectCheckSmall"
                          : option.disabled
                            ? "selectCheckMediumDisabled"
                            : "selectCheckMedium"
                      }
                    />
                  </Primitive.ItemIndicator>
                </Primitive.Item>
              ))}
            </Primitive.Viewport>
          </Primitive.Content>
        </Primitive.Portal>
      </Primitive.Root>
      <FieldMessage id={messageId} hint={hint} error={error} />
    </div>
  );
}
