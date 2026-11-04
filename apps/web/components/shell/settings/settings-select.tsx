"use client";

import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { SelectPrimitive } from "@pansgpt/ui/shell";

interface SettingsSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export function SettingsSelect({
  label,
  value,
  options,
  onValueChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: readonly SettingsSelectOption[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
}): React.ReactElement {
  // Radix item values cannot be empty. Prefixing preserves the existing Not set choice.
  const encode = (optionValue: string): string => `option-${optionValue}`;
  return (
    <SelectPrimitive.Root
      value={encode(value)}
      disabled={disabled}
      onValueChange={(next) => {
        const option = options.find((item) => encode(item.value) === next);
        if (option) onValueChange(option.value);
      }}
    >
      <SelectPrimitive.Trigger className="settings-select-trigger" aria-label={label}>
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon className="settings-select-chevron">
          <ChevronDown size={14} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="settings-select-menu"
          position="popper"
          align="end"
          sideOffset={6}
          collisionPadding={12}
          aria-label={label}
        >
          <SelectPrimitive.ScrollUpButton className="settings-select-scroll">
            <ChevronUp size={14} />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="settings-select-viewport">
            {options.map((option) => (
              <SelectPrimitive.Item
                className="settings-select-option"
                key={option.value}
                value={encode(option.value)}
                disabled={option.disabled}
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <span className="settings-select-check">
                  <SelectPrimitive.ItemIndicator>
                    <Check size={14} />
                  </SelectPrimitive.ItemIndicator>
                </span>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="settings-select-scroll">
            <ChevronDown size={14} />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
