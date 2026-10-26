"use client";

import { useEffect, useState } from "react";
import { formatDateOnly } from "@pansgpt/ui/shell";

export type DashboardTimelineEvent = {
  id: string;
  title: string;
  date: string;
  detail: string;
  kind: "task" | "class";
  time?: string | null;
  timeSlot?: string;
};

type TimelineRow = {
  id: string;
  title: string;
  date: string;
  minutes: number | null;
  timeLabel?: string;
  detail: string;
  status: string;
  tone: "brand" | "blue" | "purple" | "neutral";
};

function timeMinutes(value: string): number | null {
  const match = value
    .trim()
    .match(/^(\d{1,2})(?::([0-5]\d))?(?::[0-5]\d(?:\.\d+)?)?\s*(am|pm)?\s*$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  if (match[3]) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (match[3].toLowerCase() === "pm" ? 12 : 0);
  } else if (hour > 23) return null;
  return hour * 60 + Number(match[2] || 0);
}

function eventRow(event: DashboardTimelineEvent, now: number): TimelineRow {
  const range = (event.timeSlot || "").split(/\s*[-–—]\s*/);
  const explicitTime = event.time || "";
  const slotStart = range[0] || event.detail.split("·")[0] || "";
  // Bare legacy ranges such as "3-6" have no AM/PM information.
  // Preserve their label instead of inventing a 3 AM start or countdown.
  const minutes =
    (/:|am|pm/i.test(explicitTime) ? timeMinutes(explicitTime) : null) ??
    (/:|am|pm/i.test(slotStart) ? timeMinutes(slotStart) : null);
  const start = minutes === null ? null : new Date(`${event.date}T00:00:00`);
  start?.setMinutes(minutes ?? 0);
  const endMinutes = range.length === 2 ? timeMinutes(range[1] || "") : null;
  const end =
    start && endMinutes !== null && endMinutes > (minutes ?? 0)
      ? new Date(start.getTime() + (endMinutes - (minutes ?? 0)) * 60000)
      : null;
  const difference = start ? Math.ceil((start.getTime() - now) / 60000) : null;
  const ongoing = !!start && !!end && start.getTime() <= now && end.getTime() > now;
  let status = event.timeSlot ? "Scheduled" : "All day";
  if (ongoing) status = "Ongoing";
  else if (difference !== null) {
    if (difference > 1440) status = "Upcoming";
    else if (difference > 0) {
      const hours = Math.floor(difference / 60);
      status = hours
        ? `${hours}h${difference % 60 ? ` ${difference % 60}m` : ""}`
        : `${difference}m`;
    } else status = event.kind === "task" ? "Due" : end ? "Ended" : "Started";
  }
  return {
    id: event.id,
    title: event.title,
    date: event.date,
    minutes,
    timeLabel: minutes === null ? event.timeSlot : undefined,
    detail: event.kind === "class" ? "Lecture" : "Task",
    status,
    tone: ongoing ? "brand" : event.kind === "task" ? "purple" : "blue",
  };
}

function sampleRows(today: string, tasks: boolean): TimelineRow[] {
  // Illustrative schedule only, explicitly marked Sample by the parent section.
  const rows: TimelineRow[] = [
    {
      id: "sample-mobile-pharmacology",
      title: "Pharmacology",
      date: today,
      minutes: 540,
      detail: "Lecture",
      status: "Ongoing",
      tone: "brand",
    },
    {
      id: "sample-mobile-clinical",
      title: "Clinical Pharmacy",
      date: today,
      minutes: 660,
      detail: "Lecture",
      status: "1h 59m",
      tone: "blue",
    },
    {
      id: "sample-mobile-study",
      title: "Self Study",
      date: today,
      minutes: 840,
      detail: "Library",
      status: "3h",
      tone: "purple",
    },
    {
      id: "sample-mobile-notes",
      title: "Review Notes",
      date: today,
      minutes: 960,
      detail: "Notes",
      status: "1h",
      tone: "neutral",
    },
  ];
  return tasks ? rows.slice(2) : rows;
}

function clockLabel(minutes: number | null): string {
  if (minutes === null) return "All day";
  const hours = Math.floor(minutes / 60);
  return `${hours % 12 || 12}:${String(minutes % 60).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`;
}

export function MobileActivityTimeline({
  events,
  tab,
  today,
  sample,
}: {
  events: DashboardTimelineEvent[];
  tab: "timetable" | "tasks";
  today: string;
  sample: boolean;
}): React.ReactElement {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const rows = sample
    ? sampleRows(today, tab === "tasks")
    : events
        .filter((event) => event.kind === (tab === "tasks" ? "task" : "class"))
        .map((event) => eventRow(event, now))
        .sort(
          (left, right) =>
            left.date.localeCompare(right.date) || (left.minutes ?? 1440) - (right.minutes ?? 1440)
        )
        .slice(0, 5);
  const dates = [...new Set(rows.map((row) => row.date))];
  if (!rows.length)
    return (
      <div className="dashboard-mobile-empty">
        <h3>{tab === "tasks" ? "No upcoming tasks" : "No upcoming classes"}</h3>
        <p>Your {tab === "tasks" ? "tasks" : "classes"} will appear here when available.</p>
      </div>
    );
  return (
    <div
      className="dashboard-timeline"
      aria-label={`${sample ? "Sample " : ""}${tab === "tasks" ? "tasks" : "timetable"}`}
    >
      {dates.map((date) => (
        <section key={date} className="dashboard-timeline-day">
          <header>
            <h3>{date === today ? "Today" : formatDateOnly(date, { weekday: "long" })}</h3>
            <p>{formatDateOnly(date, { weekday: "short", day: "numeric", month: "short" })}</p>
          </header>
          <ol>
            {rows
              .filter((row) => row.date === date)
              .map((row) => (
                <li key={row.id} data-tone={row.tone}>
                  <time
                    dateTime={
                      row.minutes === null
                        ? date
                        : `${date}T${String(Math.floor(row.minutes / 60)).padStart(2, "0")}:${String(row.minutes % 60).padStart(2, "0")}`
                    }
                  >
                    {row.timeLabel || clockLabel(row.minutes)}
                  </time>
                  <span className="dashboard-timeline-track" aria-hidden="true">
                    <i />
                  </span>
                  <div className="dashboard-timeline-content">
                    <div>
                      <h4>{row.title}</h4>
                      <p>{row.detail}</p>
                    </div>
                    <span
                      className="dashboard-timeline-status"
                      data-ongoing={row.status === "Ongoing"}
                    >
                      {row.status}
                    </span>
                  </div>
                </li>
              ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
