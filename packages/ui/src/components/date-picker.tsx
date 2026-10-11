"use client";
import { useState, type ComponentProps, type ReactElement } from "react";
import { Popover, Dialog as Primitive } from "radix-ui";
import { Button } from "./button";
import { CalendarDateAsset } from "./date-assets";
import { DatePickerMenu, type DatePickerMenuProps } from "./date-picker-menu";
import { formatDateOnly, normalizeDateRange, type DateRange } from "./date-utils";
import { cn } from "../utils";

export type DatePickerProps = Omit<
  DatePickerMenuProps,
  "value" | "defaultValue" | "onValueChange" | "onApply" | "onCancel"
> & {
  value?: DateRange;
  defaultValue?: DateRange;
  onValueChange?: (range: DateRange) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  onApply?: (range: DateRange) => void;
  onCancel?: () => void;
  reference?: boolean;
};
function useDatePickerState({
  value,
  defaultValue = { start: null, end: null },
  onValueChange,
  open,
  defaultOpen = false,
  onOpenChange,
  onApply,
  onCancel,
}: DatePickerProps): {
  selection: DateRange;
  expanded: boolean;
  changeOpen: (next: boolean) => void;
  apply: (range: DateRange) => void;
  cancel: () => void;
} {
  const [internal, setInternal] = useState(normalizeDateRange(defaultValue));
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const changeOpen = (next: boolean): void => {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };
  return {
    selection: normalizeDateRange(value ?? internal),
    expanded: open ?? internalOpen,
    changeOpen,
    apply: (range) => {
      if (value === undefined) setInternal(range);
      onValueChange?.(range);
      onApply?.(range);
      changeOpen(false);
    },
    cancel: () => {
      onCancel?.();
      changeOpen(false);
    },
  };
}
export function datePickerLabel(
  selection: DateRange,
  mode: "single" | "range",
  placeholder?: string
): string {
  if (!selection.start || (mode === "range" && !selection.end))
    return placeholder ?? (mode === "range" ? "Select dates" : "Select date");
  if (mode === "single") return formatDateOnly(selection.start);
  return `${formatDateOnly(selection.start)} – ${formatDateOnly(selection.end!)}`;
}
export function DatePickerDropdown(props: DatePickerProps): React.ReactElement {
  const {
    mode = "single",
    breakpoint = "desktop",
    label = "Choose date",
    placeholder,
    disabled,
    reference = false,
    className,
    value: _value,
    defaultValue: _default,
    onValueChange: _change,
    open: _open,
    defaultOpen: _defaultOpen,
    onOpenChange: _openChange,
    onApply: _apply,
    onCancel: _cancel,
    ...menu
  } = props;
  const state = useDatePickerState(props);
  const text = datePickerLabel(state.selection, mode, placeholder);
  const trigger = (
    <Button
      size="md"
      variant="secondary"
      className="p-date-picker-trigger"
      leadingIcon={<CalendarDateAsset name="source17_imgCalendar" />}
      trailingIcon={null}
      disabled={disabled}
      aria-label={label}
      data-placeholder={!state.selection.start}
      data-open={state.expanded}
    >
      {text}
    </Button>
  );
  const panel = (
    <DatePickerMenu
      {...menu}
      mode={mode}
      breakpoint={breakpoint}
      defaultValue={state.selection}
      onApply={state.apply}
      onCancel={state.cancel}
    />
  );
  if (reference)
    return (
      <div className={cn("p-date-picker-dropdown-reference", className)}>
        {
          <Button
            size="md"
            variant="secondary"
            className="p-date-picker-trigger"
            leadingIcon={<CalendarDateAsset name="source17_imgCalendar" />}
            trailingIcon={null}
            aria-label={label}
            aria-expanded={state.expanded}
            data-placeholder={!state.selection.start}
            data-open={state.expanded}
            onClick={() => state.changeOpen(!state.expanded)}
          >
            {text}
          </Button>
        }
        {state.expanded && <div className="p-date-picker-reference-panel">{panel}</div>}
      </div>
    );
  return (
    <Popover.Root open={state.expanded} onOpenChange={state.changeOpen}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={cn("p-date-picker-popover", className)}
          align="end"
          sideOffset={8}
          collisionPadding={16}
          aria-label={label}
        >
          {panel}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
export type DatePickerModalProps = DatePickerProps & { trigger?: ReactElement; title?: string };
export function DatePickerModal(props: DatePickerModalProps): React.ReactElement {
  const {
    trigger,
    title = "Choose dates",
    mode = "single",
    breakpoint = "desktop",
    reference = false,
    className,
    value: _value,
    defaultValue: _default,
    onValueChange: _change,
    open: _open,
    defaultOpen: _defaultOpen,
    onOpenChange: _openChange,
    onApply: _apply,
    onCancel: _cancel,
    disabled: _disabled,
    label: _label,
    placeholder: _placeholder,
    ...menu
  } = props;
  const state = useDatePickerState(props);
  const panel = (
    <DatePickerMenu
      {...menu}
      mode={mode}
      breakpoint={breakpoint}
      defaultValue={state.selection}
      onApply={state.apply}
      onCancel={state.cancel}
    />
  );
  if (reference)
    return (
      <div className={cn("p-date-picker-modal-reference", className)} data-breakpoint={breakpoint}>
        <div className="p-date-picker-modal-backdrop" />
        {panel}
      </div>
    );
  return (
    <Primitive.Root open={state.expanded} onOpenChange={state.changeOpen}>
      {trigger && <Primitive.Trigger asChild>{trigger}</Primitive.Trigger>}
      <Primitive.Portal>
        <Primitive.Overlay className="p-date-picker-modal-overlay" />
        <Primitive.Content
          className={cn("p-date-picker-modal", className)}
          aria-describedby={undefined}
        >
          <Primitive.Title className="p-sr-only">{title}</Primitive.Title>
          {panel}
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
export type DatePickerTriggerProps = ComponentProps<typeof Button>;
