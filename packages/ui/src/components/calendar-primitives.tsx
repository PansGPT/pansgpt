"use client";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../utils";
import { CalendarDateAsset, type CalendarDateAssetName } from "./date-assets";
import { UtilityButton } from "./utility-button";
export type CalendarColor =
  "gray" | "brand" | "green" | "blue" | "indigo" | "purple" | "pink" | "orange" | "yellow";
export type CalendarDateState = "default" | "today" | "selected";
const monthDots: Record<CalendarColor, CalendarDateAssetName> = {
  gray: "source36_imgDot",
  brand: "source36_imgDot1",
  green: "source36_imgDot12",
  blue: "source36_imgDot13",
  indigo: "source36_imgDot14",
  purple: "source36_imgDot15",
  pink: "source36_imgDot11",
  orange: "source36_imgDot16",
  yellow: "source36_imgDot17",
};
const mobileDots: Record<CalendarColor, CalendarDateAssetName> = {
  gray: "source36_imgDot10",
  brand: "source36_imgDot2",
  green: "source36_imgDot4",
  blue: "source36_imgDot5",
  indigo: "source36_imgDot6",
  purple: "source36_imgDot7",
  pink: "source36_imgDot3",
  orange: "source36_imgDot8",
  yellow: "source36_imgDot9",
};
const dayDots: Record<CalendarColor, CalendarDateAssetName> = {
  gray: "source38_imgDot",
  brand: "source38_imgDot1",
  green: "source38_imgDot2",
  blue: "source38_imgDot3",
  indigo: "source38_imgDot4",
  purple: "source38_imgDot5",
  pink: "source38_imgDot6",
  orange: "source38_imgDot7",
  yellow: "source38_imgDot8",
};
export function CalendarDateIcon({
  month,
  day,
  className,
  ...props
}: ComponentProps<"div"> & { month: ReactNode; day: ReactNode }): React.ReactElement {
  return (
    <div {...props} className={cn("p-calendar-date-icon", className)}>
      <span>{month}</span>
      <strong>{day}</strong>
    </div>
  );
}
export function CalendarCellDate({
  appearance = "default",
  children,
  className,
  ...props
}: ComponentProps<"span"> & { appearance?: CalendarDateState }): React.ReactElement {
  return (
    <span {...props} className={cn("p-calendar-cell-date", className)} data-appearance={appearance}>
      {children}
    </span>
  );
}
export type CalendarEventProps = Omit<ComponentProps<"button">, "color"> & {
  color?: CalendarColor;
  time?: ReactNode;
  dot?: boolean;
  referenceState?: "default" | "hover";
  compact?: boolean;
  breakpoint?: "desktop" | "mobile";
};
export function CalendarMonthEvent({
  color = "gray",
  time,
  dot = true,
  breakpoint = "desktop",
  referenceState = "default",
  children,
  className,
  ...props
}: CalendarEventProps): React.ReactElement {
  return (
    <button
      {...props}
      type="button"
      className={cn("p-calendar-month-event", className)}
      data-color={color}
      data-breakpoint={breakpoint}
      data-state={referenceState}
    >
      {dot && (
        <CalendarDateAsset name={breakpoint === "mobile" ? mobileDots[color] : monthDots[color]} />
      )}
      {breakpoint === "desktop" && (
        <>
          <strong>{children}</strong>
          {time != null && <span>{time}</span>}
        </>
      )}
    </button>
  );
}
export function CalendarDayEvent({
  color = "gray",
  time,
  dot = true,
  compact = false,
  referenceState = "default",
  children,
  className,
  breakpoint: _breakpoint,
  ...props
}: CalendarEventProps): React.ReactElement {
  return (
    <button
      {...props}
      type="button"
      className={cn("p-calendar-day-event", className)}
      data-color={color}
      data-state={referenceState}
      data-compact={compact}
    >
      <span className="p-calendar-day-event-title">
        <strong>{children}</strong>
        {dot && <CalendarDateAsset name={dayDots[color]} />}
      </span>
      {!compact && time != null && <span className="p-calendar-day-event-time">{time}</span>}
    </button>
  );
}
export type CalendarMonthCellProps = ComponentProps<"div"> & {
  day: ReactNode;
  appearance?: CalendarDateState;
  breakpoint?: "desktop" | "mobile";
  more?: number;
  onMore?: () => void;
  onAdd?: () => void;
  disabled?: boolean;
  referenceState?: "default" | "hover" | "disabled";
};
export function CalendarMonthCell({
  day,
  appearance,
  breakpoint = "desktop",
  more = 0,
  onMore,
  onAdd,
  disabled,
  referenceState = "default",
  children,
  className,
  ...props
}: CalendarMonthCellProps): React.ReactElement {
  const unavailable = disabled || referenceState === "disabled";
  return (
    <div
      {...props}
      className={cn("p-calendar-month-cell", className)}
      data-breakpoint={breakpoint}
      data-state={referenceState}
      data-disabled={unavailable}
    >
      <CalendarCellDate appearance={appearance}>{day}</CalendarCellDate>
      <div className="p-calendar-month-cell-events">{children}</div>
      {more > 0 && (
        <button
          className="p-calendar-more"
          type="button"
          disabled={unavailable || !onMore}
          onClick={onMore}
          aria-label={`Show ${more} more events`}
        >
          {breakpoint === "mobile" ? `+${more}` : `${more} more…`}
        </button>
      )}
      {breakpoint === "desktop" && onAdd && (
        <UtilityButton
          className="p-calendar-cell-add"
          aria-label="Add event"
          disabled={unavailable}
          size="sm"
          icon={<CalendarDateAsset name="source37_imgPlus" />}
          onClick={onAdd}
        />
      )}
    </div>
  );
}
export type CalendarTimeCellProps = ComponentProps<"div"> & {
  minutes?: 30 | 60 | 90 | 120;
  onAdd?: () => void;
  referenceState?: "default" | "hover";
};
export function CalendarTimeCell({
  minutes = 30,
  onAdd,
  referenceState = "default",
  children,
  className,
  style,
  ...props
}: CalendarTimeCellProps): React.ReactElement {
  return (
    <div
      {...props}
      className={cn("p-calendar-time-cell", className)}
      style={{ ...style, height: (minutes / 30) * 48 }}
      data-state={referenceState}
    >
      {children}
      {onAdd && (
        <UtilityButton
          className="p-calendar-cell-add"
          aria-label="Add event"
          size="xs"
          icon={<CalendarDateAsset name="source39_imgPlus" />}
          onClick={onAdd}
        />
      )}
    </div>
  );
}
export function CalendarColumnHeader({
  weekday,
  day,
  appearance = "default",
  breakpoint = "desktop",
  className,
  ...props
}: ComponentProps<"div"> & {
  weekday: ReactNode;
  day?: ReactNode;
  appearance?: CalendarDateState;
  breakpoint?: "desktop" | "mobile";
}): React.ReactElement {
  return (
    <div
      {...props}
      className={cn("p-calendar-column-header", className)}
      data-breakpoint={breakpoint}
      data-appearance={appearance}
    >
      <span>{weekday}</span>
      {day != null && <CalendarCellDate appearance={appearance}>{day}</CalendarCellDate>}
    </div>
  );
}
export function CalendarRowLabel({
  children,
  className,
  ...props
}: ComponentProps<"div">): React.ReactElement {
  return (
    <div {...props} className={cn("p-calendar-row-label", className)}>
      {children}
    </div>
  );
}
export function CalendarTimeMarker({
  children,
  breakpoint = "desktop",
  className,
  ...props
}: ComponentProps<"div"> & { breakpoint?: "desktop" | "mobile" }): React.ReactElement {
  return (
    <div
      {...props}
      className={cn("p-calendar-time-marker", className)}
      data-breakpoint={breakpoint}
    >
      {breakpoint === "desktop" ? (
        <>
          <span>{children}</span>
          <CalendarDateAsset name="source42_imgDot" />
          <i />
        </>
      ) : (
        <>
          <CalendarDateAsset name="source42_imgDot" />
          <i />
          <span>{children}</span>
          <i />
        </>
      )}
    </div>
  );
}
