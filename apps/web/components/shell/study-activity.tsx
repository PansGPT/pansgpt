"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { Tooltip, addDateDays, formatDateOnly, parseDateOnly } from "@pansgpt/ui/shell";
import { useDashboard } from "./dashboard-data";

type DayActivity = { tasks: number; minutes: number };
function isoLocal(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function StudyActivity({ today }: { today: string }): React.ReactElement {
  const data = useDashboard();
  const [month, setMonth] = useState(today.slice(0, 7) + "-01");
  const [selected, setSelected] = useState<string | null>(null);
  const activity = new Map<string, DayActivity>();
  const sample = !data.loading && !data.activityError && !data.completed.length;
  if (sample) {
    for (let offset = 0; offset < 90; offset += 1) {
      if (offset > 6 && offset % 4 === 0) continue;
      activity.set(addDateDays(today, -offset), {
        tasks: (offset * 7 + 2) % 5,
        minutes: [25, 45, 90, 150, 60, 120][offset % 6]!,
      });
    }
  } else {
    for (const item of data.completed) {
      const date = new Date(item.completed_at);
      if (Number.isNaN(date.getTime())) continue;
      const key = isoLocal(date);
      const current = activity.get(key) ?? { tasks: 0, minutes: 0 };
      activity.set(key, { ...current, tasks: current.tasks + 1 });
    }
  }
  let streak = 0;
  let cursor = activity.has(today) ? today : addDateDays(today, -1);
  while (activity.has(cursor)) {
    streak += 1;
    cursor = addDateDays(cursor, -1);
  }
  const first = parseDateOnly(month)!;
  const daysInMonth = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)
  ).getUTCDate();
  const firstWeekday = first.getUTCDay();
  function moveMonth(offset: number): void {
    setMonth(
      new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + offset, 1))
        .toISOString()
        .slice(0, 10)
    );
    setSelected(null);
  }
  const selectedDay = selected ? activity.get(selected) : undefined;
  return (
    <section className="study-activity" aria-label="Study streak">
      <header>
        <h3>
          <Flame size={17} aria-hidden="true" />
          {streak} day streak
        </h3>
        {sample && <span className="dashboard-sample-badge">Sample</span>}
      </header>
      <div className="study-activity-month">
        <button aria-label="Previous activity month" onClick={() => moveMonth(-1)}>
          <ChevronLeft size={17} />
        </button>
        <strong>{formatDateOnly(month, { month: "long", year: "numeric" })}</strong>
        <button
          aria-label="Next activity month"
          disabled={month.slice(0, 7) >= today.slice(0, 7)}
          onClick={() => moveMonth(1)}
        >
          <ChevronRight size={17} />
        </button>
      </div>
      {data.loading ? (
        <p role="status">Loading study activity…</p>
      ) : data.activityError ? (
        <div role="alert">
          <p>Study activity is unavailable.</p>
          <button onClick={data.reload}>Try again</button>
        </div>
      ) : (
        <>
          <div className="study-activity-weekdays" aria-hidden="true">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="study-activity-grid" aria-label="Daily study activity">
            {Array.from({ length: firstWeekday }, (_, index) => (
              <span key={`empty-${index}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const date = addDateDays(month, index);
              const value = activity.get(date) ?? { tasks: 0, minutes: 0 };
              const score = value.tasks + value.minutes / 30;
              const intensity = score === 0 ? 0 : score < 2 ? 1 : score < 4 ? 2 : score < 7 ? 3 : 4;
              const label = `${formatDateOnly(date, { month: "short", day: "numeric" })}: ${value.tasks} tasks completed${sample ? `, ${value.minutes} minutes studied (sample)` : ""}`;
              return (
                <Tooltip key={date} content={label} side="top">
                  <button
                    aria-label={label}
                    aria-pressed={selected === date}
                    aria-current={date === today ? "date" : undefined}
                    data-intensity={intensity}
                    disabled={date > today}
                    onClick={() => setSelected(date)}
                  >
                    {index + 1}
                  </button>
                </Tooltip>
              );
            })}
          </div>
          <footer>
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <i key={level} data-intensity={level} aria-hidden="true" />
            ))}
            <span>More</span>
          </footer>
          <p className="study-activity-detail" role="status">
            {selected
              ? `${formatDateOnly(selected, { month: "short", day: "numeric" })} · ${selectedDay?.tasks ?? 0} tasks completed${sample ? ` · ${((selectedDay?.minutes ?? 0) / 60).toFixed(1)}h studied` : ""}`
              : sample
                ? "Sample study time and completed tasks"
                : "Completed tasks · Study time tracking coming soon"}
          </p>
        </>
      )}
    </section>
  );
}
