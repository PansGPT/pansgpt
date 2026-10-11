"use client";
import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "../utils";
import { CalendarDateAsset } from "./date-assets";
import {
  addDateDays,
  clampDateOnly,
  dateInBounds,
  dateMonthDays,
  formatDateOnly,
  localTodayIso,
  normalizeDateRange,
  parseDateOnly,
  shiftDateMonth,
  startDateMonth,
  startDateWeek,
  type DateRange,
} from "./date-utils";
export type DatePickerDayType = "default" | "today" | "selected" | "active";
export type DatePickerDayProps = ComponentProps<"button"> & {
  appearance?: DatePickerDayType;
  dot?: boolean;
  leftConnector?: boolean;
  rightConnector?: boolean;
  referenceState?: "default" | "hover" | "disabled";
};
export function DatePickerDay({
  appearance = "default",
  dot = false,
  leftConnector = false,
  rightConnector = false,
  referenceState = "default",
  disabled,
  children,
  className,
  ...props
}: DatePickerDayProps): React.ReactElement {
  const unavailable = disabled || referenceState === "disabled";
  return (
    <button
      {...props}
      type="button"
      disabled={unavailable}
      className={cn("p-date-picker-day", className)}
      data-appearance={appearance}
      data-state={referenceState}
    >
      {appearance !== "default" && rightConnector && (
        <CalendarDateAsset className="p-date-connector-right" name="source1_imgConnectorRight" />
      )}
      {appearance !== "default" && leftConnector && (
        <CalendarDateAsset className="p-date-connector-left" name="source1_imgConnectorLeft" />
      )}
      <span className="p-date-picker-day-label">{children}</span>
      {dot && (
        <CalendarDateAsset
          className="p-date-picker-day-dot"
          name={
            unavailable
              ? "source1_imgDot2"
              : appearance === "selected"
                ? "source1_imgDot1"
                : "source1_imgDot"
          }
        />
      )}
      {referenceState === "hover" && (
        <CalendarDateAsset className="p-date-picker-day-cursor" name="source1_imgCursor" />
      )}
    </button>
  );
}
export type DatePickerListItemProps = ComponentProps<"button"> & {
  selected?: boolean;
  referenceState?: "default" | "hover" | "focused";
};
export function DatePickerListItem({
  selected = false,
  referenceState = "default",
  children,
  className,
  ...props
}: DatePickerListItemProps): React.ReactElement {
  return (
    <button
      {...props}
      type="button"
      className={cn("p-date-picker-list-item", className)}
      data-selected={selected}
      data-state={referenceState}
      aria-pressed={selected}
    >
      {children}
    </button>
  );
}
export type DatePickerCalendarProps = Omit<ComponentProps<"div">, "onSelect"> & {
  month: string;
  onMonthChange?: (month: string) => void;
  selection?: DateRange;
  onSelect?: (date: string) => void;
  today?: string;
  minimum?: string;
  maximum?: string;
  isDateDisabled?: (date: string) => boolean;
  activeDates?: readonly string[];
  weekStartsOn?: 0 | 1;
  locale?: string;
  accessory?: ReactNode;
  previous?: boolean;
  next?: boolean;
  focusedDate?: string;
  onFocusedDateChange?: (date: string) => void;
  referenceHoverDate?: string;
  disableOutsideMonth?: boolean;
  renderDay?: (date: string) => ReactNode;
};
export function DatePickerCalendar({
  month,
  onMonthChange,
  selection = { start: null, end: null },
  onSelect,
  today = localTodayIso(),
  minimum,
  maximum,
  isDateDisabled,
  activeDates = [],
  weekStartsOn = 1,
  locale = "en-US",
  accessory,
  previous = true,
  next = true,
  focusedDate,
  onFocusedDateChange,
  referenceHoverDate,
  disableOutsideMonth = false,
  renderDay,
  className,
  ...props
}: DatePickerCalendarProps): React.ReactElement {
  const monthStart = startDateMonth(month);
  const range = normalizeDateRange(selection);
  const days = dateMonthDays(monthStart, weekStartsOn);
  const titleId = useId();
  const container = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);
  const fallback =
    [range.start, today, monthStart].find(
      (value) =>
        value &&
        value.slice(0, 7) === monthStart.slice(0, 7) &&
        dateInBounds(value, minimum, maximum) &&
        !isDateDisabled?.(value)
    ) ??
    days.find(
      (date) =>
        date.slice(0, 7) === monthStart.slice(0, 7) &&
        dateInBounds(date, minimum, maximum) &&
        !isDateDisabled?.(date)
    ) ??
    monthStart;
  const [internalFocus, setInternalFocus] = useState(fallback);
  const active = focusedDate ?? (days.includes(internalFocus) ? internalFocus : fallback);
  const unavailable = (date: string): boolean =>
    !dateInBounds(date, minimum, maximum) || !!isDateDisabled?.(date);
  function changeFocus(date: string): void {
    if (focusedDate === undefined) setInternalFocus(date);
    onFocusedDateChange?.(date);
  }
  useEffect(() => {
    if (!moveFocus.current) return;
    const button = container.current?.querySelector<HTMLButtonElement>(
      `button[data-date="${active}"]`
    );
    if (button && !button.disabled) {
      button.focus();
      moveFocus.current = false;
    }
  }, [active, monthStart]);
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    formatDateOnly(
      addDateDays(startDateWeek("2025-01-06", weekStartsOn), index),
      { weekday: "short" },
      locale
    )
  );
  const monthTitle = formatDateOnly(monthStart, { month: "long", year: "numeric" }, locale);
  return (
    <div {...props} className={cn("p-date-picker-calendar", className)} ref={container}>
      <div className="p-date-picker-month">
        <button
          type="button"
          className="p-date-picker-month-button"
          aria-label="Previous month"
          style={{ visibility: previous ? undefined : "hidden" }}
          disabled={
            monthStart === "0001-01-01" ||
            !previous ||
            !onMonthChange ||
            !!(minimum && parseDateOnly(minimum) && monthStart <= startDateMonth(minimum))
          }
          onClick={() => onMonthChange?.(shiftDateMonth(monthStart, -1))}
        >
          <CalendarDateAsset name="source2_imgChevronLeft" />
        </button>
        <strong id={titleId} aria-live="polite">
          {monthTitle}
        </strong>
        <button
          type="button"
          className="p-date-picker-month-button"
          aria-label="Next month"
          style={{ visibility: next ? undefined : "hidden" }}
          disabled={
            monthStart === "9999-12-01" ||
            !next ||
            !onMonthChange ||
            !!(maximum && parseDateOnly(maximum) && monthStart >= startDateMonth(maximum))
          }
          onClick={() => onMonthChange?.(shiftDateMonth(monthStart, 1))}
        >
          <CalendarDateAsset name="source2_imgChevronRight" />
        </button>
      </div>
      {accessory}
      <div
        className="p-date-picker-grid"
        role="grid"
        aria-labelledby={titleId}
        aria-multiselectable={!!range.end}
      >
        <div className="p-date-picker-weekdays" role="row">
          {weekdays.map((day, index) => (
            <span
              role="columnheader"
              key={index}
              aria-label={formatDateOnly(
                addDateDays(startDateWeek("2025-01-06", weekStartsOn), index),
                { weekday: "long" },
                locale
              )}
            >
              {day.slice(0, 2)}
            </span>
          ))}
        </div>
        {Array.from({ length: 6 }, (_, week) => (
          <div className="p-date-picker-week" role="row" key={week}>
            {days.slice(week * 7, week * 7 + 7).map((date, index) => {
              const inRange =
                !!range.start && !!range.end && date >= range.start && date <= range.end;
              const selected = date === range.start || date === range.end;
              const otherMonth = date.slice(0, 7) !== monthStart.slice(0, 7);
              return (
                <DatePickerDay
                  key={date}
                  role="gridcell"
                  aria-label={formatDateOnly(
                    date,
                    { weekday: "long", month: "long", day: "numeric", year: "numeric" },
                    locale
                  )}
                  aria-current={date === today ? "date" : undefined}
                  aria-selected={selected || inRange}
                  data-date={date}
                  data-outside-month={otherMonth}
                  tabIndex={date === active && !otherMonth && !unavailable(date) ? 0 : -1}
                  appearance={
                    selected
                      ? "selected"
                      : inRange
                        ? "active"
                        : date === today && !otherMonth
                          ? "today"
                          : "default"
                  }
                  disabled={unavailable(date) || (disableOutsideMonth && otherMonth)}
                  dot={activeDates.includes(date)}
                  referenceState={referenceHoverDate === date && !otherMonth ? "hover" : "default"}
                  leftConnector={inRange && date !== range.start && index > 0}
                  rightConnector={inRange && date !== range.end && index < 6}
                  onFocus={() => changeFocus(date)}
                  onClick={() => onSelect?.(date)}
                  onKeyDown={(event) => {
                    let candidate: string | undefined;
                    let step = 1;
                    try {
                      if (event.key === "ArrowLeft") {
                        candidate = addDateDays(date, -1);
                        step = -1;
                      } else if (event.key === "ArrowRight") candidate = addDateDays(date, 1);
                      else if (event.key === "ArrowUp") {
                        candidate = addDateDays(date, -7);
                        step = -1;
                      } else if (event.key === "ArrowDown") candidate = addDateDays(date, 7);
                      else if (event.key === "Home") candidate = startDateWeek(date, weekStartsOn);
                      else if (event.key === "End")
                        candidate = addDateDays(startDateWeek(date, weekStartsOn), 6);
                      else if (event.key === "PageUp") {
                        candidate = shiftDateMonth(date, event.shiftKey ? -12 : -1);
                        step = -1;
                      } else if (event.key === "PageDown")
                        candidate = shiftDateMonth(date, event.shiftKey ? 12 : 1);
                    } catch (error) {
                      if (error instanceof RangeError) {
                        event.preventDefault();
                        return;
                      }
                      throw error;
                    }
                    if (!candidate) return;
                    event.preventDefault();
                    candidate = clampDateOnly(candidate, minimum, maximum);
                    for (let attempt = 0; attempt < 366 && unavailable(candidate); attempt++) {
                      let proposed: string;
                      try {
                        proposed = addDateDays(candidate, step);
                      } catch (error) {
                        if (error instanceof RangeError) return;
                        throw error;
                      }
                      if (!dateInBounds(proposed, minimum, maximum)) return;
                      candidate = proposed;
                    }
                    if (unavailable(candidate)) return;
                    moveFocus.current = true;
                    changeFocus(candidate);
                    if (candidate.slice(0, 7) !== monthStart.slice(0, 7))
                      onMonthChange?.(startDateMonth(candidate));
                  }}
                >
                  {parseDateOnly(date) ? (renderDay?.(date) ?? Number(date.slice(-2))) : null}
                </DatePickerDay>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
