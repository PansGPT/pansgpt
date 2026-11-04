"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { Tooltip, addDateDays, formatDateOnly, parseDateOnly } from "@pansgpt/ui/shell";
import { useDashboard } from "./dashboard-data";
import { env } from "@/env";

type DayActivity = { tasks: number; minutes: number };
export function StudyActivity({ today }: { today: string }): React.ReactElement {
  const data = useDashboard();
  const [month, setMonth] = useState(today.slice(0, 7) + "-01");
  const [selected, setSelected] = useState<string | null>(null);
  const activity = new Map<string, DayActivity>();
  const sample =
    env.NEXT_PUBLIC_DEMO_MODE === "true" &&
    !data.loading &&
    !data.activityError &&
    !data.dailyActivity.length;
  if (sample) {
    for (let offset = 0; offset < 90; offset += 1) {
      if (offset > 6 && offset % 4 === 0) continue;
      activity.set(addDateDays(today, -offset), {
        tasks: (offset * 7 + 2) % 5,
        minutes: [25, 45, 90, 150, 60, 120][offset % 6]!,
      });
    }
  } else {
    for (const item of data.dailyActivity)
      activity.set(item.date, { tasks: item.tasks_completed, minutes: 0 });
  }
  const activeDate = (date: string): boolean => (activity.get(date)?.tasks ?? 0) > 0;
  let streak = sample ? 0 : data.currentStreakDays;
  if (sample) {
    let cursor = activeDate(today) ? today : addDateDays(today, -1);
    while (activeDate(cursor)) {
      streak += 1;
      cursor = addDateDays(cursor, -1);
    }
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
        <button
          aria-label="Previous activity month"
          disabled={!!data.activityFrom && month <= `${data.activityFrom.slice(0, 7)}-01`}
          onClick={() => moveMonth(-1)}
        >
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
              const score = value.tasks;
              const intensity =
                score === 0 ? 0 : score === 1 ? 1 : score === 2 ? 2 : score <= 4 ? 3 : 4;
              const label = `${formatDateOnly(date, { month: "short", day: "numeric" })}: ${value.tasks} tasks completed${sample ? " (sample)" : ""}`;
              return (
                <Tooltip key={date} content={label} side="top">
                  <button
                    aria-label={label}
                    aria-pressed={selected === date}
                    aria-current={date === today ? "date" : undefined}
                    data-intensity={intensity}
                    disabled={date > today || (!!data.activityFrom && date < data.activityFrom)}
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
                ? "Sample task completions"
                : "Streaks and activity are based on completed tasks"}
          </p>
        </>
      )}
    </section>
  );
}
