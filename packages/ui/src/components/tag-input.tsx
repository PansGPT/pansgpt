"use client";
import { useEffect, useRef, useState } from "react";
import { Tag } from "./badge";
import { Input, type InputProps } from "./field";
import type { SelectOption } from "./select";

export type TagInputProps = Omit<
  InputProps,
  "value" | "defaultValue" | "onChange" | "leadingAddon" | "layout" | "name"
> & {
  value?: readonly SelectOption[];
  defaultValue?: readonly SelectOption[];
  onValueChange?: (value: SelectOption[]) => void;
  defaultQuery?: string;
  name?: string;
};
/** A free-text tag field. Enter or comma commits a value; empty Backspace removes the last editable tag. */
export function TagInput({
  value,
  defaultValue = [],
  onValueChange,
  defaultQuery = "",
  name,
  disabled,
  required,
  ...props
}: TagInputProps): React.ReactElement {
  const [internal, setInternal] = useState<readonly SelectOption[]>(defaultValue);
  const selected = value ?? internal;
  const [query, setQuery] = useState(defaultQuery);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    root.current
      ?.querySelector("input")
      ?.setCustomValidity(required && selected.length === 0 ? "Add at least one value." : "");
  }, [required, selected.length]);
  const change = (next: SelectOption[]): void => {
    if (disabled) return;
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  };
  const commit = (): void => {
    const label = query.trim();
    if (!label) return;
    if (!selected.some((item) => item.value.toLocaleLowerCase() === label.toLocaleLowerCase()))
      change([...selected, { value: label, label }]);
    setQuery("");
  };
  return (
    <div ref={root} className="p-tag-input">
      <Input
        {...props}
        layout="tags"
        disabled={disabled}
        requiredIndicator={required}
        required={required && selected.length === 0}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        leadingAddon={
          selected.length
            ? selected.map((item) => (
                <Tag
                  key={item.value}
                  size="md"
                  leading={item.leading}
                  onDismiss={
                    disabled || item.disabled
                      ? undefined
                      : () => change(selected.filter((tag) => tag.value !== item.value))
                  }
                  dismissLabel={`Remove ${item.label}`}
                >
                  {item.label}
                </Tag>
              ))
            : undefined
        }
        onKeyDown={(event) => {
          props.onKeyDown?.(event);
          if (event.defaultPrevented || disabled) return;
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            commit();
          } else if (event.key === "Backspace" && query === "") {
            const last =
              selected
                .map((item, index) => (item.disabled ? -1 : index))
                .filter((index) => index >= 0)
                .pop() ?? -1;
            if (last >= 0) change(selected.filter((_, index) => index !== last));
          }
        }}
      />
      {name &&
        selected.map((item) => (
          <input
            key={item.value}
            type="hidden"
            name={name}
            value={item.value}
            disabled={disabled}
          />
        ))}
    </div>
  );
}
