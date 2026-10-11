import type { CalendarColor } from "./calendar-primitives";
export type CalendarEvent = {
  id: string;
  date: string;
  title: string;
  startMinutes: number;
  endMinutes: number;
  color?: CalendarColor;
  disabled?: boolean;
  dot?: boolean;
  displayTime?: string;
  allDay?: boolean;
};
export type CalendarEventPosition = { event: CalendarEvent; lane: number; lanes: number };
/** Connected overlapping events share a width; touching endpoints do not overlap. */
export function layoutCalendarEvents(events: readonly CalendarEvent[]): CalendarEventPosition[] {
  const sorted = [...events].sort(
    (a, b) =>
      a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes || a.id.localeCompare(b.id)
  );
  const result: CalendarEventPosition[] = [];
  let group: CalendarEventPosition[] = [];
  let ends: number[] = [];
  let groupEnd = -1;
  const flush = (): void => {
    for (const item of group) result.push({ ...item, lanes: ends.length });
    group = [];
    ends = [];
    groupEnd = -1;
  };
  for (const event of sorted) {
    if (event.startMinutes >= groupEnd && group.length) flush();
    let lane = ends.findIndex((end) => end <= event.startMinutes);
    if (lane === -1) lane = ends.length;
    ends[lane] = event.endMinutes;
    groupEnd = Math.max(groupEnd, event.endMinutes);
    group.push({ event, lane, lanes: 1 });
  }
  flush();
  return result;
}
