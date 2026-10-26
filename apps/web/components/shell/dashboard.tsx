"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Clock3,
  RefreshCw,
  PlayCircle,
  ClipboardList,
  NotebookText,
  LockKeyhole,
} from "lucide-react";
import { Skeleton, addDateDays, formatDateOnly, localTodayIso } from "@pansgpt/ui/shell";
import { useAuth } from "@/lib/auth-context";
import { useDashboard } from "./dashboard-data";
import { StudyArt } from "./study-art";
import { MobileActivityTimeline, type DashboardTimelineEvent } from "./mobile-activity-timeline";
import { StudyActivity } from "./study-activity";
import { DocumentCard } from "./document-card";
import { sampleDocuments, sampleActivities } from "./sample-data";
import { SamplePreview } from "./sample-preview";
import { mobileDestinations } from "./navigation";
type UpcomingEvent = DashboardTimelineEvent;

function recentAge(value: string): string {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  if (!Number.isFinite(elapsed)) return "Recently";
  const hours = Math.floor(elapsed / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

const guides = [
  { title: "Renal system overview", kind: "renal", duration: "5 min read", video: false },
  { title: "How to approach a clinical case", kind: "case", duration: "4 min watch", video: true },
  {
    title: "Active recall for better retention",
    kind: "recall",
    duration: "3 min read",
    video: false,
  },
  { title: "Creating effective study notes", kind: "notes", duration: "6 min watch", video: true },
] as const;

function ScheduleState({
  loading,
  error,
  onRetry,
  kind,
}: {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  kind?: "tasks" | "timetable";
}): React.ReactElement {
  if (loading)
    return (
      <div className="dashboard-schedule-loading" role="status" aria-label="Loading your schedule">
        <p>Getting your schedule ready…</p>
        <div aria-hidden="true">
          {[0, 1, 2].map((row) => (
            <div className="dashboard-schedule-skeleton" key={row}>
              <Skeleton variant="rectangle" />
              <Skeleton variant="text" />
            </div>
          ))}
        </div>
      </div>
    );
  return (
    <div className="dashboard-schedule-state" role={error ? "alert" : undefined}>
      <span className="dashboard-schedule-icon">
        <CalendarDays size={23} aria-hidden="true" />
      </span>
      <h4>
        {error
          ? "Your schedule couldn’t be loaded"
          : kind === "tasks"
            ? "No upcoming tasks"
            : kind === "timetable"
              ? "No upcoming classes"
              : "A little room in your schedule"}
      </h4>
      <p>
        {error
          ? "Try again to see your upcoming classes and tasks."
          : `Your ${kind === "tasks" ? "tasks" : kind === "timetable" ? "classes" : "classes and tasks"} will appear here when available.`}
      </p>
      {error && (
        <button type="button" className="dashboard-schedule-retry" onClick={onRetry}>
          <RefreshCw size={15} aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  );
}

export function StudyDashboard(): React.ReactElement {
  const { profile } = useAuth();
  const router = useRouter();
  const data = useDashboard();
  const [today] = useState(localTodayIso);
  const [preview, setPreview] = useState<string | null>(null);
  const sampleRecent = !data.loading && !data.recentError && !data.recent.length;
  const recentCards = sampleRecent
    ? sampleDocuments.map((document, index) => ({
        updated_at: `${today}T12:00:00`,
        documents: { id: `sample-${index}`, title: document.title, updated_at: today },
      }))
    : data.recent;
  const [activityTab, setActivityTab] = useState<"timetable" | "tasks">("timetable");
  const [period] = useState(() => {
    const hour = new Date().getHours();
    return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  });
  const events: UpcomingEvent[] = data.tasks.map((task) => ({
    kind: "task",
    id: task.id,
    title: task.title,
    date: task.due_date,
    time: task.due_time,
    detail: [task.due_time?.slice(0, 5), task.subtitle].filter(Boolean).join(" · "),
  }));
  for (let offset = 0; offset < 21; offset += 1) {
    const date = addDateDays(today, offset);
    const weekday = formatDateOnly(date, { weekday: "long" }).toLowerCase();
    for (const slot of data.timetable) {
      if (
        slot.day.trim().toLowerCase() === weekday ||
        slot.day.trim().toLowerCase() === weekday.slice(0, 3)
      )
        events.push({
          kind: "class",
          id: `${slot.id}-${date}`,
          title: slot.course_title,
          date,
          time: slot.start_time || slot.time_slot,
          timeSlot: slot.time_slot,
          detail: [slot.start_time?.slice(0, 5) || slot.time_slot, slot.venue]
            .filter(Boolean)
            .join(" · "),
        });
    }
  }
  const sampleEvents = !data.loading && !data.eventsError && !events.length;
  if (sampleEvents) events.push(...sampleActivities(today));
  events.sort(
    (left, right) => left.date.localeCompare(right.date) || left.detail.localeCompare(right.detail)
  );
  const agenda = events.slice(0, 3);
  return (
    <div className="study-dashboard">
      <nav className="dashboard-mobile-destinations" aria-label="Study tools">
        {mobileDestinations
          .filter((item) => !["/app", "/app/chat"].includes(item.href))
          .map(({ href, label, icon }) => {
            const Icon =
              href === "/app/quiz"
                ? ClipboardList
                : href === "/app/notes"
                  ? NotebookText
                  : href === "/app/focus"
                    ? LockKeyhole
                    : icon;
            return (
              <Link href={href} key={href}>
                <Icon size={26} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            );
          })}
      </nav>
      <header className="dashboard-greeting">
        <h1>
          Good {period}, <span>{profile?.first_name || "there"}</span>
        </h1>
      </header>
      <section aria-labelledby="recently-visited-title">
        <div className="dashboard-section-heading">
          <h2 id="recently-visited-title">
            <Clock3 size={19} aria-hidden="true" />
            <span className="dashboard-desktop-label">
              {data.recentSource === "library" && !sampleRecent
                ? "From your library"
                : "Recently opened documents"}
            </span>
            <span className="dashboard-mobile-label">Recents</span>
          </h2>
          {sampleRecent && <span className="dashboard-sample-badge">Sample</span>}
          <Link href="/app/library">
            See all
            <ChevronRight size={17} aria-hidden="true" />
          </Link>
        </div>
        {data.loading ? (
          <div
            className="dashboard-recent-grid"
            role="status"
            aria-label="Loading recently visited materials"
          >
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <Skeleton key={item} variant="rectangle" className="dashboard-recent-skeleton" />
            ))}
          </div>
        ) : data.recentError ? (
          <div className="dashboard-region-empty" role="alert">
            <p>We couldn&apos;t load your recent materials.</p>
            <button onClick={data.reload}>
              <RefreshCw size={15} />
              Try again
            </button>
          </div>
        ) : recentCards.length ? (
          <div className="dashboard-recent-grid">
            {recentCards.map((item) => (
              <DocumentCard
                key={item.documents.id}
                documentId={sampleRecent ? undefined : item.documents.id}
                revision={item.documents.updated_at}
                title={item.documents.title}
                date={item.updated_at}
                detail={
                  <>
                    Library <span aria-hidden="true">·</span>{" "}
                    {data.recentSource === "library" && !sampleRecent ? "Added " : ""}
                    {recentAge(item.updated_at)}
                  </>
                }
                onClick={() => {
                  if (sampleRecent) setPreview(item.documents.title);
                  else router.push(`/app/library?q=${encodeURIComponent(item.documents.title)}`);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="dashboard-region-empty">
            <Clock3 size={24} aria-hidden="true" />
            <div>
              <h3>Your next session starts here</h3>
              <p>The materials you open will appear here for a quick return.</p>
            </div>
            <Link href="/app/library">
              Explore your library
              <ChevronRight size={15} aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>
      <section aria-labelledby="learn-title" className="dashboard-learn-section">
        <div className="dashboard-section-heading">
          <h2 id="learn-title">
            <BookOpen size={20} aria-hidden="true" />
            Learn
          </h2>
          <span className="dashboard-sample-badge">Sample</span>
          <Link href="/app/learn">
            See all
            <ChevronRight size={17} aria-hidden="true" />
          </Link>
        </div>
        <div className="dashboard-learn-grid">
          {guides.map((guide) => (
            <button
              className="dashboard-learn-card"
              key={guide.kind}
              onClick={() => setPreview(guide.title)}
            >
              <div className="dashboard-learn-cover" data-art={guide.kind}>
                <StudyArt kind={guide.kind} />
                <span className="dashboard-guide-label" aria-hidden="true">
                  {guide.kind === "renal"
                    ? "Explore the essentials"
                    : guide.kind === "case"
                      ? "Connect the dots"
                      : guide.kind === "recall"
                        ? "Put it into practice"
                        : "Make it your own"}
                </span>
              </div>
              <div className="dashboard-learn-body">
                <h3>{guide.title}</h3>
                <span>
                  {guide.video ? (
                    <PlayCircle size={16} aria-hidden="true" />
                  ) : (
                    <BookOpen size={16} aria-hidden="true" />
                  )}
                  {guide.duration}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
      <section aria-labelledby="upcoming-events-title">
        <div className="dashboard-section-heading">
          <h2 id="upcoming-events-title">
            <CalendarDays size={21} aria-hidden="true" />
            <span className="dashboard-desktop-label">Activities</span>
            <span className="dashboard-mobile-label">Activity</span>
          </h2>
          {sampleEvents && <span className="dashboard-sample-badge">Sample</span>}
        </div>
        <div className="dashboard-events">
          <div className="dashboard-calendar">
            <StudyActivity today={today} />
          </div>
          <div className="dashboard-agenda" aria-live="polite">
            <div className="dashboard-agenda-heading">
              <h3>Up next</h3>
              <span>Classes &amp; tasks</span>
            </div>
            {data.loading || data.eventsError ? (
              <ScheduleState
                loading={data.loading}
                error={data.eventsError}
                onRetry={data.reload}
              />
            ) : agenda.length ? (
              agenda.map((event) => (
                <div className="dashboard-event" key={event.id}>
                  <div className="dashboard-event-date">
                    <strong>
                      {event.date === today
                        ? "Today"
                        : formatDateOnly(event.date, { weekday: "short" })}
                    </strong>
                    <span>{formatDateOnly(event.date, { month: "short", day: "numeric" })}</span>
                  </div>
                  <span className="dashboard-event-dot" aria-hidden="true" />
                  <div>
                    <h3>{event.title}</h3>
                    <p>{event.detail || "All day"}</p>
                  </div>
                </div>
              ))
            ) : (
              <ScheduleState loading={false} error={false} onRetry={data.reload} />
            )}
          </div>
        </div>
        <div className="dashboard-mobile-activity">
          <div className="dashboard-activity-tabs" aria-label="Activity view">
            <button
              aria-pressed={activityTab === "timetable"}
              onClick={() => setActivityTab("timetable")}
            >
              Timetable
            </button>
            <button aria-pressed={activityTab === "tasks"} onClick={() => setActivityTab("tasks")}>
              Tasks
            </button>
          </div>
          {data.loading || data.eventsError ? (
            <ScheduleState loading={data.loading} error={data.eventsError} onRetry={data.reload} />
          ) : (
            <MobileActivityTimeline
              events={events}
              tab={activityTab}
              today={today}
              sample={sampleEvents}
            />
          )}
        </div>
      </section>
      <SamplePreview title={preview} onClose={() => setPreview(null)}>
        <div className="dashboard-preview-art">
          <StudyArt kind="document" />
        </div>
        <p>
          This sample shows how your study content will look. It is not part of your library and has
          not been saved to your account.
        </p>
        <Link href="/app/library">Explore your library</Link>
      </SamplePreview>
    </div>
  );
}
