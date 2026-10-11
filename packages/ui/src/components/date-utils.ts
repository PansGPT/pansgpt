/** Date-only arithmetic uses UTC internally, never the device's daylight-saving offset. */
export function parseDateOnly(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (
    year == null ||
    month == null ||
    day == null ||
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  )
    return undefined;
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : undefined;
}
export function dateOnlyIso(date: Date): string {
  return `${String(date.getUTCFullYear()).padStart(4, "0")}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}
export function localTodayIso(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}
export function addDateDays(value: string, days: number): string {
  const date = parseDateOnly(value);
  if (!date) throw new RangeError(`Invalid date: ${value}`);
  date.setUTCDate(date.getUTCDate() + days);
  const result = dateOnlyIso(date);
  if (!parseDateOnly(result)) throw new RangeError("Date is outside supported years 0001–9999");
  return result;
}
export function shiftDateMonth(value: string, months: number): string {
  const date = parseDateOnly(value);
  if (!date) throw new RangeError(`Invalid date: ${value}`);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const end = new Date(date);
  end.setUTCMonth(end.getUTCMonth() + 1, 0);
  date.setUTCDate(Math.min(day, end.getUTCDate()));
  const result = dateOnlyIso(date);
  if (!parseDateOnly(result)) throw new RangeError("Date is outside supported years 0001–9999");
  return result;
}
export function startDateMonth(value: string): string {
  const date = parseDateOnly(value);
  if (!date) throw new RangeError(`Invalid date: ${value}`);
  date.setUTCDate(1);
  return dateOnlyIso(date);
}
export function startDateWeek(value: string, weekStartsOn: 0 | 1 = 1): string {
  const date = parseDateOnly(value);
  if (!date) throw new RangeError(`Invalid date: ${value}`);
  return addDateDays(value, -((date.getUTCDay() - weekStartsOn + 7) % 7));
}
export function dateWeekDays(value: string, weekStartsOn: 0 | 1 = 1): string[] {
  const start = parseDateOnly(value);
  if (!start) throw new RangeError(`Invalid date: ${value}`);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() - weekStartsOn + 7) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(day.getUTCDate() + index);
    return dateOnlyIso(day);
  });
}
/** Grid padding can fall outside supported years; those cells remain disabled. */
export function dateMonthDays(month: string, weekStartsOn: 0 | 1 = 1): string[] {
  const start = parseDateOnly(startDateMonth(month))!;
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() - weekStartsOn + 7) % 7));
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(day.getUTCDate() + index);
    return dateOnlyIso(day);
  });
}
export function formatDateOnly(
  value: string,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" },
  locale = "en-US"
): string {
  const date = parseDateOnly(value);
  return date ? new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(date) : "";
}
export type DateRange = { start: string | null; end: string | null };
export function normalizeDateRange(value: DateRange): DateRange {
  const start = value.start && parseDateOnly(value.start) ? value.start : null;
  const end = value.end && parseDateOnly(value.end) ? value.end : null;
  if (!start) return { start: null, end: null };
  return end && end < start ? { start: end, end: start } : { start, end };
}
export function selectRangeDate(value: DateRange, date: string): DateRange {
  if (!parseDateOnly(date)) throw new RangeError(`Invalid date: ${date}`);
  const range = normalizeDateRange(value);
  if (!range.start || range.end) return { start: date, end: null };
  return normalizeDateRange({ start: range.start, end: date });
}
export function dateInBounds(value: string, minimum?: string, maximum?: string): boolean {
  return (
    !!parseDateOnly(value) &&
    (!minimum || !parseDateOnly(minimum) || value >= minimum) &&
    (!maximum || !parseDateOnly(maximum) || value <= maximum)
  );
}
export function clampDateOnly(value: string, minimum?: string, maximum?: string): string {
  return minimum && parseDateOnly(minimum) && value < minimum
    ? minimum
    : maximum && parseDateOnly(maximum) && value > maximum
      ? maximum
      : value;
}
export type DatePickerPreset = { id: string; label: string; range: DateRange };
export function defaultDatePresets(today: string): DatePickerPreset[] {
  const date = parseDateOnly(today);
  if (!date) throw new RangeError(`Invalid date: ${today}`);
  const bounded = (compute: () => string, fallback: string): string => {
    try {
      return compute();
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      return fallback;
    }
  };
  const thisWeek = bounded(() => startDateWeek(today), "0001-01-01");
  const thisMonth = startDateMonth(today);
  const thisYear = `${today.slice(0, 4)}-01-01`;
  const candidates: Array<() => DatePickerPreset> = [
    () => ({ id: "today", label: "Today", range: { start: today, end: today } }),
    () => ({
      id: "yesterday",
      label: "Yesterday",
      range: { start: addDateDays(today, -1), end: addDateDays(today, -1) },
    }),
    () => ({
      id: "this-week",
      label: "This week",
      range: { start: thisWeek, end: bounded(() => addDateDays(thisWeek, 6), "9999-12-31") },
    }),
    () => ({
      id: "last-week",
      label: "Last week",
      range: { start: addDateDays(thisWeek, -7), end: addDateDays(thisWeek, -1) },
    }),
    () => ({
      id: "this-month",
      label: "This month",
      range: {
        start: thisMonth,
        end: bounded(() => addDateDays(shiftDateMonth(thisMonth, 1), -1), "9999-12-31"),
      },
    }),
    () => ({
      id: "last-month",
      label: "Last month",
      range: { start: shiftDateMonth(thisMonth, -1), end: addDateDays(thisMonth, -1) },
    }),
    () => ({
      id: "this-year",
      label: "This year",
      range: { start: thisYear, end: `${today.slice(0, 4)}-12-31` },
    }),
    () => ({
      id: "last-year",
      label: "Last year",
      range: { start: shiftDateMonth(thisYear, -12), end: addDateDays(thisYear, -1) },
    }),
    () => ({
      id: "all-time",
      label: "All time",
      range: { start: today < "1970-01-01" ? "0001-01-01" : "1970-01-01", end: today },
    }),
  ];
  return candidates.flatMap((compute) => {
    try {
      return [compute()];
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      return [];
    }
  });
}
