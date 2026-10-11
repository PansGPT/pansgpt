"use client";
import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "../utils";
import { Button } from "./button";
import { Input } from "./field";
import { DatePickerCalendar, DatePickerListItem } from "./date-picker-calendar";
import {
  clampDateOnly,
  dateInBounds,
  defaultDatePresets,
  formatDateOnly,
  localTodayIso,
  normalizeDateRange,
  parseDateOnly,
  selectRangeDate,
  shiftDateMonth,
  startDateMonth,
  type DatePickerPreset,
  type DateRange,
} from "./date-utils";

export function parseDateField(value: string): string | undefined {
  if (parseDateOnly(value)) return value;
  const match = value
    .trim()
    .match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})$/i);
  if (!match) return undefined;
  const months = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];
  const date = `${match[3]}-${String(months.indexOf(match[1]!.toLowerCase()) + 1).padStart(2, "0")}-${match[2]!.padStart(2, "0")}`;
  return parseDateOnly(date) ? date : undefined;
}
function DateEntry({
  value,
  label,
  minimum,
  maximum,
  onCommit,
  onValidityChange,
  width,
}: {
  value: string | null;
  label: string;
  minimum?: string;
  maximum?: string;
  onCommit: (date: string) => void;
  onValidityChange: (valid: boolean) => void;
  width?: number;
}): React.ReactElement {
  const [text, setText] = useState(value ? formatDateOnly(value) : "");
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    setText(value ? formatDateOnly(value) : "");
    setInvalid(false);
    onValidityChange(true);
  }, [value, onValidityChange]);
  const commit = (): void => {
    const date = parseDateField(text);
    const valid = !!date && dateInBounds(date, minimum, maximum);
    setInvalid(!valid);
    onValidityChange(valid);
    if (valid) {
      setText(formatDateOnly(date));
      onCommit(date);
    }
  };
  return (
    <div className="p-date-entry" style={width ? { width } : undefined}>
      <Input
        aria-label={label}
        aria-invalid={invalid}
        placeholder="Select date"
        value={text}
        onChange={(event) => {
          const input = event.target.value;
          setText(input);
          setInvalid(false);
          const date = parseDateField(input);
          onValidityChange(!!date && dateInBounds(date, minimum, maximum));
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
        }}
      />
    </div>
  );
}
export type DatePickerMenuProps = Omit<ComponentProps<"div">, "onChange" | "defaultValue"> & {
  mode?: "single" | "range";
  breakpoint?: "desktop" | "mobile";
  value?: DateRange;
  defaultValue?: DateRange;
  onValueChange?: (range: DateRange) => void;
  onApply?: (range: DateRange) => void;
  onCancel?: () => void;
  initialMonth?: string;
  today?: string;
  minimum?: string;
  maximum?: string;
  isDateDisabled?: (date: string) => boolean;
  presets?: readonly DatePickerPreset[];
  showPresets?: boolean;
  showActions?: boolean;
  activeDates?: readonly string[];
  referenceHoverDate?: string;
  referencePreset?: string;
  header?: ReactNode;
  disableOutsideMonth?: boolean;
};
export function DatePickerMenu({
  mode = "single",
  breakpoint = "desktop",
  value,
  defaultValue = { start: null, end: null },
  onValueChange,
  onApply,
  onCancel,
  initialMonth,
  today = localTodayIso(),
  minimum,
  maximum,
  isDateDisabled,
  presets,
  showPresets = true,
  showActions = true,
  activeDates,
  referenceHoverDate,
  referencePreset,
  disableOutsideMonth = false,
  header,
  className,
  ...props
}: DatePickerMenuProps): React.ReactElement {
  const [internal, setInternal] = useState(normalizeDateRange(defaultValue));
  const range = normalizeDateRange(value ?? internal);
  const [month, setMonth] = useState(
    startDateMonth(initialMonth ?? range.start ?? clampDateOnly(today, minimum, maximum))
  );
  const [focusedDate, setFocusedDate] = useState(
    range.start ?? clampDateOnly(today, minimum, maximum)
  );
  const [presetId, setPresetId] = useState(referencePreset);
  const dual = mode === "range" && breakpoint === "desktop";
  const [startValid, setStartValid] = useState(true);
  const [endValid, setEndValid] = useState(true);
  const [fieldVersion, setFieldVersion] = useState(0);
  const choices = presets ?? defaultDatePresets(today);
  function change(next: DateRange): void {
    const normalized = normalizeDateRange(next);
    const result = mode === "single" ? { start: normalized.start, end: null } : normalized;
    if (value === undefined) setInternal(result);
    onValueChange?.(result);
    setPresetId(undefined);
  }
  function chooseDate(date: string): void {
    change(mode === "single" ? { start: date, end: null } : selectRangeDate(range, date));
    setFieldVersion((version) => version + 1);
  }
  const fields = (
    <div className="p-date-picker-fields">
      <DateEntry
        key={`start-${fieldVersion}`}
        value={range.start}
        label={mode === "range" ? "Start date" : "Selected date"}
        onValidityChange={setStartValid}
        minimum={minimum}
        maximum={maximum}
        width={dual ? 136 : undefined}
        onCommit={(date) => {
          change({ start: date, end: range.end });
          setMonth(startDateMonth(date));
        }}
      />
      {mode === "range" ? (
        <>
          <span aria-hidden="true">–</span>
          <DateEntry
            key={`end-${fieldVersion}`}
            value={range.end}
            label="End date"
            onValidityChange={setEndValid}
            minimum={minimum}
            maximum={maximum}
            width={dual ? 136 : undefined}
            onCommit={(date) => change({ start: range.start ?? date, end: date })}
          />
        </>
      ) : (
        <Button
          size="md"
          variant="secondary"
          leadingIcon={null}
          trailingIcon={null}
          disabled={!dateInBounds(today, minimum, maximum) || isDateDisabled?.(today)}
          onClick={() => {
            chooseDate(today);
            setMonth(startDateMonth(today));
          }}
        >
          Today
        </Button>
      )}
    </div>
  );
  function choosePreset(preset: DatePickerPreset): void {
    const next = normalizeDateRange(preset.range);
    if (
      !next.start ||
      !next.end ||
      !dateInBounds(next.start, minimum, maximum) ||
      !dateInBounds(next.end, minimum, maximum)
    )
      return;
    change(next);
    setFieldVersion((version) => version + 1);
    setPresetId(preset.id);
    setMonth(startDateMonth(next.start));
    setFocusedDate(next.start);
  }
  const shortcuts =
    mode === "range" && showPresets && !dual ? (
      <div className="p-date-picker-quick-presets">
        {choices
          .filter((item) => ["last-week", "last-month", "last-year"].includes(item.id))
          .map((item) => (
            <Button
              key={item.id}
              variant="link-color"
              leadingIcon={null}
              trailingIcon={null}
              onClick={() => choosePreset(item)}
            >
              {item.label}
            </Button>
          ))}
      </div>
    ) : null;
  const canApply =
    startValid &&
    endValid &&
    !!range.start &&
    (mode === "single" || !!range.end) &&
    dateInBounds(range.start, minimum, maximum) &&
    (!range.end || dateInBounds(range.end, minimum, maximum)) &&
    !isDateDisabled?.(range.start) &&
    (!range.end || !isDateDisabled?.(range.end));
  const displayedMonth = dual && month === "9999-12-01" ? "9999-11-01" : month;
  const calendar = (calendarMonth: string, right = false): ReactNode => (
    <DatePickerCalendar
      month={calendarMonth}
      onMonthChange={(next) => setMonth(right ? shiftDateMonth(next, -1) : next)}
      selection={range}
      onSelect={chooseDate}
      today={today}
      minimum={minimum}
      maximum={maximum}
      isDateDisabled={isDateDisabled}
      disableOutsideMonth={disableOutsideMonth}
      activeDates={activeDates}
      focusedDate={focusedDate}
      onFocusedDateChange={setFocusedDate}
      referenceHoverDate={referenceHoverDate}
      previous={!dual || !right}
      next={!dual || right}
      accessory={
        !dual ? (
          <>
            {fields}
            {shortcuts}
          </>
        ) : undefined
      }
    />
  );
  return (
    <div
      {...props}
      className={cn("p-date-picker-menu", className)}
      data-mode={mode}
      data-breakpoint={breakpoint}
      data-presets={dual && showPresets}
    >
      {dual && showPresets && (
        <aside className="p-date-picker-presets" aria-label="Date ranges">
          {choices.map((item) => (
            <DatePickerListItem
              key={item.id}
              selected={presetId === item.id}
              disabled={
                !item.range.start ||
                !item.range.end ||
                !dateInBounds(item.range.start, minimum, maximum) ||
                !dateInBounds(item.range.end, minimum, maximum)
              }
              onClick={() => choosePreset(item)}
            >
              {item.label}
            </DatePickerListItem>
          ))}
        </aside>
      )}
      <div className="p-date-picker-main">
        {header}
        <div className="p-date-picker-months">
          <div className="p-date-picker-month-wrap">{calendar(displayedMonth)}</div>
          {dual && (
            <div className="p-date-picker-month-wrap">
              {calendar(shiftDateMonth(displayedMonth, 1), true)}
            </div>
          )}
        </div>
        {showActions && (
          <div className="p-date-picker-bottom">
            {dual && fields}
            <div className="p-date-picker-actions">
              <Button
                size="md"
                variant="secondary"
                leadingIcon={null}
                trailingIcon={null}
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                size="md"
                leadingIcon={null}
                trailingIcon={null}
                disabled={!canApply}
                onClick={() => onApply?.(range)}
              >
                Apply
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
