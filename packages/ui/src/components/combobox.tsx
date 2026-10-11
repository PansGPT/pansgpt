"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Popover } from "radix-ui";
import { cn } from "../utils";
import { FieldLabel, FieldMessage, type FieldOptions } from "./field";
import { Tag } from "./badge";
import { FieldNativeAsset } from "./field-native-assets";
import type { SelectOption } from "./select";
export type ComboboxProps = FieldOptions & {
  options: readonly SelectOption[];
  value?: readonly string[];
  defaultValue?: readonly string[];
  onValueChange?: (value: string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  size?: "sm" | "md";
  "aria-label"?: string;
  leadingIcon?: ReactNode;
  shortcut?: boolean;
  emptyMessage?: ReactNode;
  referenceState?: "default" | "focused";
};
function searchKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}
export function Combobox({
  options,
  value,
  defaultValue = [],
  onValueChange,
  multiple = false,
  placeholder = "Search",
  disabled,
  required,
  name,
  id,
  size = "sm",
  label,
  hint,
  error,
  help,
  helpIcon,
  leadingIcon = <FieldNativeAsset name="source47_imgSearchLg" />,
  shortcut,
  emptyMessage = "No results found",
  referenceState,
  "aria-label": ariaLabel,
  className,
}: ComboboxProps): React.ReactElement {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listId = inputId + "-options";
  const messageId = inputId + "-message";
  const [internal, setInternal] = useState<readonly string[]>(defaultValue);
  const selected = multiple ? (value ?? internal) : (value ?? internal).slice(0, 1);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>();
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const selectedOptions = options.filter((option) => selected.includes(option.value));
  const selectedLabel = selectedOptions[0]?.label ?? "";
  const filtered = options.filter((option) =>
    searchKey(`${option.label} ${option.supportingText ?? ""}`).includes(searchKey(query))
  );
  const available = filtered.filter((option) => !option.disabled);
  const activeOption = available.find((option) => option.value === active) ?? available[0];
  const optionId = (option: SelectOption): string => `${listId}-${options.indexOf(option)}`;
  useEffect(() => {
    input.current?.setCustomValidity(required && selected.length === 0 ? "Choose an option." : "");
  }, [required, selected.length]);
  useEffect(() => {
    if (!open || !activeOption) return;
    list.current
      ?.querySelector<HTMLElement>(`[id="${optionId(activeOption)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  });
  useEffect(() => {
    if (!shortcut || disabled) return;
    const keydown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [shortcut, disabled]);
  const change = (next: string[]): void => {
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  };
  const choose = (option: SelectOption): void => {
    if (disabled || option.disabled) return;
    change(
      multiple
        ? selected.includes(option.value)
          ? selected.filter((item) => item !== option.value)
          : [...selected, option.value]
        : [option.value]
    );
    setQuery("");
    if (!multiple) setOpen(false);
    input.current?.focus();
  };
  return (
    <div
      className={cn("p-field", "p-combobox", className)}
      data-size={size}
      data-disabled={disabled || undefined}
      data-error={error != null || undefined}
      data-reference-state={referenceState}
    >
      <FieldLabel id={inputId} label={label} required={required} help={help} helpIcon={helpIcon} />
      <Popover.Root
        open={open && !disabled}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <Popover.Anchor asChild>
          <div className="p-field-control p-combobox-control">
            {leadingIcon && (
              <span className="p-field-icon" aria-hidden="true">
                {leadingIcon}
              </span>
            )}
            {multiple &&
              selectedOptions.map((option) => (
                <Tag
                  key={option.value}
                  size="md"
                  leading={option.leading}
                  onDismiss={() => {
                    if (!disabled && !option.disabled)
                      change(selected.filter((item) => item !== option.value));
                  }}
                  dismissDisabled={disabled || option.disabled}
                  dismissLabel={`Remove ${option.label}`}
                >
                  {option.label}
                </Tag>
              ))}
            <input
              ref={input}
              id={inputId}
              className="p-input"
              role="combobox"
              aria-label={ariaLabel}
              aria-expanded={open && !disabled}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={open && activeOption ? optionId(activeOption) : undefined}
              aria-invalid={error != null || undefined}
              aria-describedby={error != null || hint != null ? messageId : undefined}
              autoComplete="off"
              disabled={disabled}
              value={open || multiple ? query : selectedLabel}
              placeholder={placeholder}
              required={required && selected.length === 0}
              onFocus={() => {
                if (!disabled) setOpen(true);
              }}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
                setActive(undefined);
              }}
              onKeyDown={(event) => {
                if (
                  ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) &&
                  (open || event.key.startsWith("Arrow"))
                ) {
                  event.preventDefault();
                  setOpen(true);
                  const index = available.findIndex(
                    (option) => option.value === activeOption?.value
                  );
                  const next = !open
                    ? event.key === "ArrowUp"
                      ? available.length - 1
                      : 0
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? available.length - 1
                        : event.key === "ArrowDown"
                          ? (index + 1) % available.length
                          : (index - 1 + available.length) % available.length;
                  setActive(available[next]?.value);
                } else if (event.key === "Enter" && open) {
                  event.preventDefault();
                  if (activeOption) choose(activeOption);
                } else if (event.key === "Escape" && open) {
                  event.preventDefault();
                  setOpen(false);
                  setQuery("");
                } else if (
                  event.key === "Backspace" &&
                  multiple &&
                  query === "" &&
                  selected.length
                ) {
                  const removable = [...selected]
                    .reverse()
                    .find((item) => !options.find((option) => option.value === item)?.disabled);
                  if (removable) change(selected.filter((item) => item !== removable));
                }
              }}
            />
            {!multiple && !open && selectedOptions[0]?.supportingText && (
              <span className="p-combobox-selected-supporting">
                {selectedOptions[0].supportingText}
              </span>
            )}
            {shortcut && <kbd className="p-combobox-shortcut">⌘K</kbd>}
          </div>
        </Popover.Anchor>
        <Popover.Portal>
          <Popover.Content
            className="p-combobox-menu p-select-menu"
            data-size={size}
            sideOffset={4}
            align="start"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
            onInteractOutside={(event) => {
              if (
                event.target instanceof Node &&
                input.current?.parentElement?.contains(event.target)
              )
                event.preventDefault();
            }}
          >
            <div
              id={listId}
              ref={list}
              role="listbox"
              aria-label={label ? undefined : (ariaLabel ?? "Options")}
              aria-labelledby={label ? inputId + "-label" : undefined}
              aria-multiselectable={multiple || undefined}
            >
              {filtered.map((option) => (
                <button
                  type="button"
                  id={optionId(option)}
                  key={option.value}
                  role="option"
                  aria-selected={selected.includes(option.value)}
                  disabled={option.disabled}
                  tabIndex={-1}
                  className="p-select-item"
                  data-state={selected.includes(option.value) ? "checked" : "unchecked"}
                  data-highlighted={activeOption?.value === option.value || undefined}
                  onPointerMove={() => {
                    if (!option.disabled) setActive(option.value);
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option)}
                >
                  {option.leading}
                  <span>{option.label}</span>
                  {option.supportingText && (
                    <span className="p-select-supporting">{option.supportingText}</span>
                  )}
                  {selected.includes(option.value) && (
                    <FieldNativeAsset className="p-combobox-check" name="source40_imgCheck" />
                  )}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="p-combobox-empty" role="status">
                  {emptyMessage}
                </div>
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {name &&
        selected.map((item) => (
          <input type="hidden" key={item} name={name} value={item} disabled={disabled} />
        ))}
      <FieldMessage id={messageId} hint={hint} error={error} />
    </div>
  );
}
