"use client";
import { useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "../utils";
import { CalendarHeader, type CalendarView } from "./calendar-header";
import {
  CalendarCellDate,
  CalendarColumnHeader,
  CalendarDayEvent,
  CalendarMonthEvent,
  CalendarRowLabel,
  CalendarTimeMarker,
} from "./calendar-primitives";
import {
  addDateDays,
  dateMonthDays,
  dateOnlyIso,
  dateWeekDays,
  formatDateOnly,
  localTodayIso,
  parseDateOnly,
  shiftDateMonth,
  startDateMonth,
} from "./date-utils";
import { layoutCalendarEvents, type CalendarEvent } from "./calendar-layout";
export function calendarTimeLabel(minutes: number, locale = "en-US"): string {
  const date = new Date(Date.UTC(2025, 0, 1, 0, minutes));
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}
export type CalendarProps = Omit<ComponentProps<"section">, "onSelect"> & {
  date?: string;
  defaultDate?: string;
  onDateChange?: (date: string) => void;
  view?: CalendarView;
  defaultView?: CalendarView;
  onViewChange?: (view: CalendarView) => void;
  events?: readonly CalendarEvent[];
  breakpoint?: "desktop" | "mobile";
  today?: string;
  locale?: string;
  weekStartsOn?: 0 | 1;
  onEventClick?: (event: CalendarEvent) => void;
  onAddEvent?: (date: string, minutes?: number) => void;
  onSearch?: () => void;
  onMoreEvents?: (date: string, events: readonly CalendarEvent[]) => void;
  sidebar?: ReactNode;
  startHour?: number;
  endHour?: number;
  currentTime?: { date: string; minutes: number };
  headerBadge?: ReactNode;
  maxMonthEvents?: number;
  eventTotalsByDate?: Readonly<Record<string, number>>;
  headerSupportingText?: ReactNode;
  renderDay?: (date: string) => ReactNode;
  renderWeekday?: (date: string) => ReactNode;
  highlightedDates?: readonly string[];
  eventSort?: (a: CalendarEvent, b: CalendarEvent) => number;
};
export function Calendar({
  date,
  defaultDate = localTodayIso(),
  onDateChange,
  view,
  defaultView = "month",
  onViewChange,
  events = [],
  breakpoint = "desktop",
  today = localTodayIso(),
  locale = "en-US",
  weekStartsOn = 1,
  onEventClick,
  onAddEvent,
  onSearch,
  onMoreEvents,
  sidebar,
  startHour = 8,
  endHour = 20,
  currentTime,
  headerBadge,
  maxMonthEvents = 3,
  eventTotalsByDate = {},
  headerSupportingText,
  renderDay,
  renderWeekday,
  highlightedDates = [],
  eventSort,
  className,
  ...props
}: CalendarProps): React.ReactElement {
  const [internalDate, setInternalDate] = useState(defaultDate);
  const [internalView, setInternalView] = useState(defaultView);
  const selected = date ?? internalDate;
  const mode = view ?? internalView;
  const mobile = breakpoint === "mobile";
  if (!parseDateOnly(selected))
    throw new RangeError("Calendar date must be a valid YYYY-MM-DD date");
  if (
    !Number.isInteger(startHour) ||
    !Number.isInteger(endHour) ||
    startHour < 0 ||
    endHour > 24 ||
    endHour <= startHour
  )
    throw new RangeError("Calendar hours must satisfy 0 <= startHour < endHour <= 24");
  const ids = new Set<string>();
  for (const event of events) {
    if (ids.has(event.id)) throw new RangeError(`Duplicate calendar event id: ${event.id}`);
    ids.add(event.id);
    if (
      !parseDateOnly(event.date) ||
      !Number.isFinite(event.startMinutes) ||
      !Number.isFinite(event.endMinutes) ||
      event.startMinutes < 0 ||
      event.endMinutes > 1440 ||
      event.startMinutes >= event.endMinutes
    )
      throw new RangeError(`Invalid calendar event: ${event.id}`);
  }
  const select = (next: string): void => {
    if (date === undefined) setInternalDate(next);
    onDateChange?.(next);
  };
  const changeView = (next: CalendarView): void => {
    if (view === undefined) setInternalView(next);
    onViewChange?.(next);
  };
  const navigationDate = (direction: -1 | 1): string | undefined => {
    try {
      return mode === "month"
        ? shiftDateMonth(selected, direction)
        : addDateDays(selected, direction * (mode === "week" ? 7 : 1));
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      return undefined;
    }
  };
  const previousDate = navigationDate(-1);
  const nextDate = navigationDate(1);
  const monthStart = startDateMonth(selected);
  const week = dateWeekDays(selected, weekStartsOn);
  const validWeek = week.filter((day) => parseDateOnly(day));
  const monthDays = dateMonthDays(selected, weekStartsOn);
  const lastDate = parseDateOnly(selected)!;
  lastDate.setUTCMonth(lastDate.getUTCMonth() + 1, 0);
  const lastDay = dateOnlyIso(lastDate);
  const lastIndex = monthDays.indexOf(lastDay);
  const month = monthDays.slice(0, Math.ceil((lastIndex + 1) / 7) * 7);
  const title = formatDateOnly(
    selected,
    mode === "day"
      ? { month: "long", day: "numeric", year: "numeric" }
      : { month: "long", year: "numeric" },
    locale
  );
  const support =
    mode === "day"
      ? formatDateOnly(selected, { weekday: "long" }, locale)
      : `${formatDateOnly(mode === "month" ? monthStart : validWeek[0], undefined, locale)} – ${formatDateOnly(mode === "month" ? lastDay : validWeek.at(-1)!, undefined, locale)}`;
  const dayEvents = (day: string): CalendarEvent[] =>
    events
      .filter((event) => event.date === day)
      .sort(eventSort ?? ((a, b) => a.startMinutes - b.startMinutes || a.id.localeCompare(b.id)));
  const appearance = (day: string): "selected" | "today" | "default" =>
    day === selected ? "selected" : day === today ? "today" : "default";
  const columns = mode === "week" && !mobile ? validWeek : [selected];
  const hours = Array.from({ length: endHour - startHour }, (_, index) => startHour + index);
  const startMinutes = startHour * 60;
  const endMinutes = endHour * 60;
  return (
    <section
      {...props}
      className={cn("p-calendar", className)}
      data-breakpoint={breakpoint}
      data-view={mode}
      aria-label="Calendar"
    >
      <CalendarHeader
        title={<span aria-live="polite">{title}</span>}
        supportingText={headerSupportingText ?? support}
        badge={headerBadge}
        month={formatDateOnly(selected, { month: "short" }, locale).toUpperCase()}
        day={Number(selected.slice(-2))}
        breakpoint={breakpoint}
        view={mode}
        onViewChange={changeView}
        onPrevious={previousDate ? () => select(previousDate) : undefined}
        onNext={nextDate ? () => select(nextDate) : undefined}
        onToday={() => select(today)}
        onSearch={onSearch}
        onAdd={onAddEvent ? () => onAddEvent(selected) : undefined}
      />
      <div className="p-calendar-body">
        {mode === "month" ? (
          <div className="p-calendar-month">
            <div className="p-calendar-weekdays">
              {week.map((day) => (
                <CalendarColumnHeader
                  key={day}
                  weekday={
                    renderWeekday?.(day) ?? formatDateOnly(day, { weekday: "short" }, locale)
                  }
                />
              ))}
            </div>
            <div
              className="p-calendar-month-grid"
              style={{
                gridTemplateRows: `repeat(${month.length / 7}, minmax(${mobile ? 88 : 120}px, 1fr))`,
              }}
            >
              {month.map((day) => {
                const all = dayEvents(day);
                const total = Math.max(all.length, eventTotalsByDate[day] ?? 0);
                const limit = mobile ? 3 : Math.max(1, Math.floor(maxMonthEvents));
                const visible = all.slice(0, limit);
                return (
                  <div
                    className="p-calendar-month-day"
                    key={day}
                    data-outside-month={day.slice(0, 7) !== selected.slice(0, 7)}
                    data-date={day}
                    data-highlighted={highlightedDates.includes(day) || undefined}
                  >
                    <button
                      type="button"
                      className="p-calendar-day-select"
                      disabled={!parseDateOnly(day)}
                      onClick={() => select(day)}
                      aria-label={formatDateOnly(
                        day,
                        { weekday: "long", month: "long", day: "numeric", year: "numeric" },
                        locale
                      )}
                      aria-pressed={day === selected}
                      aria-current={day === today ? "date" : undefined}
                    >
                      <CalendarCellDate appearance={appearance(day)}>
                        {parseDateOnly(day) ? (renderDay?.(day) ?? Number(day.slice(-2))) : ""}
                      </CalendarCellDate>
                    </button>
                    <div className="p-calendar-month-day-events">
                      {visible.map((event) => (
                        <CalendarMonthEvent
                          key={event.id}
                          breakpoint={breakpoint}
                          color={event.color}
                          dot={mobile || event.dot}
                          time={
                            event.allDay
                              ? undefined
                              : (event.displayTime ?? calendarTimeLabel(event.startMinutes, locale))
                          }
                          aria-label={`${event.title}, ${calendarTimeLabel(event.startMinutes, locale)}`}
                          disabled={event.disabled || !onEventClick}
                          onClick={() => onEventClick?.(event)}
                        >
                          {event.title}
                        </CalendarMonthEvent>
                      ))}
                    </div>
                    {total > limit && (
                      <button
                        type="button"
                        className="p-calendar-more"
                        onClick={() =>
                          onMoreEvents ? onMoreEvents(day, all) : (select(day), changeView("day"))
                        }
                        aria-label={`Show ${total - limit} more events on ${day}`}
                      >
                        {mobile ? `+${total - limit}` : `${total - limit} more…`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {mobile && (
              <div className="p-calendar-selected-day">
                <strong>
                  {formatDateOnly(
                    selected,
                    { weekday: "long", month: "short", day: "numeric", year: "numeric" },
                    locale
                  )}
                </strong>
                {dayEvents(selected)
                  .slice(0, 3)
                  .map((event) => (
                    <CalendarMonthEvent
                      key={event.id}
                      dot={false}
                      color={event.color}
                      time={event.displayTime ?? calendarTimeLabel(event.startMinutes, locale)}
                      disabled={event.disabled || !onEventClick}
                      onClick={() => onEventClick?.(event)}
                    >
                      {event.title}
                    </CalendarMonthEvent>
                  ))}
                {Math.max(dayEvents(selected).length, eventTotalsByDate[selected] ?? 0) > 3 && (
                  <button
                    type="button"
                    className="p-calendar-more"
                    onClick={() =>
                      onMoreEvents ? onMoreEvents(selected, dayEvents(selected)) : changeView("day")
                    }
                  >
                    {Math.max(dayEvents(selected).length, eventTotalsByDate[selected] ?? 0) - 3}{" "}
                    more...
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-calendar-agenda">
            {(mode === "week" || mobile) && (
              <div className="p-calendar-agenda-headers" data-mobile={mobile}>
                {!mobile && <span />}
                {week.map((day) => (
                  <button
                    type="button"
                    key={day}
                    className="p-calendar-day-select"
                    disabled={!parseDateOnly(day)}
                    onClick={() => select(day)}
                    aria-label={formatDateOnly(
                      day,
                      { weekday: "long", month: "long", day: "numeric", year: "numeric" },
                      locale
                    )}
                    aria-pressed={day === selected}
                  >
                    <CalendarColumnHeader
                      weekday={
                        renderWeekday?.(day) ?? formatDateOnly(day, { weekday: "short" }, locale)
                      }
                      day={Number(day.slice(-2))}
                      appearance={appearance(day)}
                      breakpoint={breakpoint}
                    />
                  </button>
                ))}
              </div>
            )}
            <div
              className="p-calendar-timeline-scroll"
              tabIndex={0}
              role="region"
              aria-label="Calendar schedule"
            >
              <div className="p-calendar-timeline" style={{ height: hours.length * 96 }}>
                <div className="p-calendar-hour-labels">
                  {hours.map((hour) => (
                    <CalendarRowLabel key={hour}>
                      {calendarTimeLabel(hour * 60, locale).replace(":00", "")}
                    </CalendarRowLabel>
                  ))}
                </div>
                <div
                  className="p-calendar-time-columns"
                  style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
                >
                  {columns.map((day) => (
                    <div className="p-calendar-time-column" key={day} data-date={day}>
                      {hours.flatMap((hour) =>
                        [0, 30].map((offset) => (
                          <button
                            type="button"
                            className="p-calendar-empty-time"
                            key={hour * 60 + offset}
                            disabled={!onAddEvent}
                            onClick={() => onAddEvent?.(day, hour * 60 + offset)}
                            aria-label={`Add event on ${day} at ${calendarTimeLabel(hour * 60 + offset, locale)}`}
                          />
                        ))
                      )}
                      {layoutCalendarEvents(
                        dayEvents(day).filter(
                          (event) =>
                            event.endMinutes > startMinutes && event.startMinutes < endMinutes
                        )
                      ).map(({ event, lane, lanes }) => {
                        const top =
                          (Math.max(event.startMinutes, startMinutes) - startMinutes) * 1.6;
                        const height =
                          (Math.min(event.endMinutes, endMinutes) -
                            Math.max(event.startMinutes, startMinutes)) *
                          1.6;
                        return (
                          <div
                            className="p-calendar-positioned-event"
                            key={event.id}
                            style={{
                              top,
                              height,
                              left: `${(lane / lanes) * 100}%`,
                              width: `${100 / lanes}%`,
                            }}
                          >
                            <CalendarDayEvent
                              color={event.color}
                              dot={event.dot}
                              time={
                                event.displayTime ??
                                `${calendarTimeLabel(event.startMinutes, locale)} – ${calendarTimeLabel(event.endMinutes, locale)}`
                              }
                              compact={height < 60}
                              aria-label={`${event.title}, ${calendarTimeLabel(event.startMinutes, locale)} to ${calendarTimeLabel(event.endMinutes, locale)}`}
                              disabled={event.disabled || !onEventClick}
                              onClick={() => onEventClick?.(event)}
                            >
                              {event.title}
                            </CalendarDayEvent>
                          </div>
                        );
                      })}
                      {currentTime?.date === day &&
                        currentTime.minutes >= startMinutes &&
                        currentTime.minutes < endMinutes && (
                          <CalendarTimeMarker
                            className="p-calendar-current-time"
                            style={{
                              top: (currentTime.minutes - startMinutes) * 1.6 - 9,
                              left: mobile ? 0 : `calc(-${columns.indexOf(day) * 100}% - 72px)`,
                              width: mobile ? "100%" : `calc(${columns.length * 100}% + 72px)`,
                            }}
                            breakpoint={breakpoint}
                          >
                            {calendarTimeLabel(currentTime.minutes, locale)}
                          </CalendarTimeMarker>
                        )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {mode === "day" && !mobile && sidebar && (
          <aside className="p-calendar-sidebar" aria-label="Calendar details">
            {sidebar}
          </aside>
        )}
      </div>
    </section>
  );
}
