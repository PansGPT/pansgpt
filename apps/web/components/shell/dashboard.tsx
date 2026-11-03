"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Circle,
  Clock,
  Clock3,
  FileText,
  RefreshCw,
  ClipboardList,
  NotebookText,
  LockKeyhole,
  Check,
} from "lucide-react";
import { Skeleton, formatDateOnly, localTodayIso } from "@pansgpt/ui/shell";
import type { StudentTaskDto } from "@pansgpt/types";
import { env } from "@/env";
import { useAuth } from "@/lib/auth-context";
import { useDashboard } from "./dashboard-data";
import { StudyArt } from "./study-art";
import { learnArticles } from "@/components/learn/learn-content";
import { LearnCard } from "@/components/learn/learn-card";
import "@/components/learn/learn.css";
import { MobileActivityTimeline, type DashboardTimelineEvent } from "./mobile-activity-timeline";
import { StudyActivity } from "./study-activity";
import { DocumentCard } from "./document-card";
import { sampleDocuments, sampleActivities } from "./sample-data";
import { SamplePreview } from "./sample-preview";
import { mobileDestinations } from "./navigation";
import { useOpenPlannerModal } from "./planner-modal-context";
import { formatTaskDue } from "./tasks-modal-view";
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

function DashboardTasksList({
  tasks,
  today,
  onComplete,
  onSelect,
}: {
  tasks: StudentTaskDto[];
  today: string;
  onComplete: (taskId: string) => Promise<void>;
  onSelect: (taskId: string, target?: HTMLElement) => void;
}): React.ReactElement {
  return (
    <div className="planner-tasks-list dashboard-tasks-embed" role="list">
      {tasks.map((task) => {
        const dueInfo = formatTaskDue(task.due_date, task.due_time, today);
        return (
          <div
            key={task.id}
            className="planner-task-row dashboard-task-card"
            role="button"
            tabIndex={0}
            onClick={(e) => {
              onSelect(task.id, e.currentTarget);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(task.id, e.currentTarget);
              }
            }}
          >
            <button
              type="button"
              className="planner-task-checkbox"
              aria-label={`Mark "${task.title}" as complete`}
              onClick={(e) => {
                e.stopPropagation();
                void onComplete(task.id);
              }}
            >
              <Circle size={18} className="planner-task-circle" />
              <Check size={12} className="planner-task-check-icon" />
            </button>

            <div className="planner-task-content">
              <span className="planner-task-title-text">{task.title}</span>
              <div className="planner-task-meta">
                {task.course_code && (
                  <span className="planner-task-course-badge">{task.course_code}</span>
                )}
                {dueInfo && (
                  <span
                    className={`planner-task-due-badge ${
                      dueInfo.isOverdue ? "is-overdue" : dueInfo.isToday ? "is-today" : ""
                    }`}
                  >
                    {dueInfo.isOverdue && <Clock size={11} />}
                    {dueInfo.label}
                  </span>
                )}
                {task.subtitle && (
                  <span className="planner-task-notes-indicator" title="Has notes">
                    <FileText size={11} />
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function StudyDashboard(): React.ReactElement {
  const { profile } = useAuth();
  const router = useRouter();
  const data = useDashboard();
  const openPlannerModal = useOpenPlannerModal();
  const today = data.today || localTodayIso();
  const [preview, setPreview] = useState<string | null>(null);
  const [taskActionError, setTaskActionError] = useState(false);
  const [pressedDestination, setPressedDestination] = useState<string | null>(null);
  const sampleRecent = !data.loading && !data.recentError && !data.recent.length;
  const recentCards = sampleRecent
    ? sampleDocuments.map((document, index) => ({
        updated_at: `${today}T12:00:00`,
        documents: { id: `sample-${index}`, title: document.title, updated_at: today },
      }))
    : data.recent;
  const [activityTab, setActivityTab] = useState<"timetable" | "tasks">("timetable");
  const [bookmarkedSlugs, setBookmarkedSlugs] = useState<Set<string>>(
    () => new Set(["clinical-case", "pharmacy-beyond-counter"])
  );
  const toggleBookmark = (slug: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBookmarkedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };
  const [period] = useState(() => {
    const hour = new Date().getHours();
    return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  });
  async function completeFromActivity(taskId: string): Promise<void> {
    if (taskId.startsWith("sample-")) return;
    setTaskActionError(false);
    try {
      await data.completeTask(taskId, true);
    } catch {
      setTaskActionError(true);
    }
  }
  const events: UpcomingEvent[] = [
    ...data.tasks
      .filter((task) => !task.is_completed)
      .map((task) => ({
        kind: "task" as const,
        id: task.id,
        title: task.title,
        date: task.due_date,
        time: task.due_time,
        detail: [task.due_time?.slice(0, 5), task.subtitle].filter(Boolean).join(" · "),
      })),
    ...data.timetable.map((slot) => ({
      kind: "class" as const,
      id: slot.id,
      title: slot.course_title,
      date: slot.date,
      time: slot.start_time_local || slot.start_time,
      timeSlot: slot.time_slot,
      detail: [slot.start_time_local?.slice(0, 5) || slot.time_slot, slot.venue]
        .filter(Boolean)
        .join(" · "),
    })),
  ];
  const sampleEvents =
    env.NEXT_PUBLIC_DEMO_MODE === "true" && !data.loading && !data.eventsError && !events.length;
  if (sampleEvents) events.push(...sampleActivities(today));
  events.sort((left, right) => {
    if (!left.date && !right.date) return left.detail.localeCompare(right.detail);
    if (!left.date) return 1;
    if (!right.date) return -1;
    return left.date.localeCompare(right.date) || left.detail.localeCompare(right.detail);
  });
  const filteredEvents = events.filter(
    (event) => event.kind === (activityTab === "tasks" ? "task" : "class")
  );
  const agenda = filteredEvents.slice(0, 3);
  const activeTasksList = useMemo(() => {
    return data.tasks
      .filter((task) => !task.is_completed)
      .sort((a, b) => {
        if (a.due_date && b.due_date) {
          const cmp = a.due_date.localeCompare(b.due_date);
          if (cmp !== 0) return cmp;
        } else if (a.due_date && !b.due_date) return -1;
        else if (!a.due_date && b.due_date) return 1;
        return (a.due_time || "").localeCompare(b.due_time || "");
      })
      .slice(0, 4);
  }, [data.tasks]);

  const sampleTasksList = useMemo<StudentTaskDto[]>(() => {
    if (!sampleEvents) return [];
    return [
      {
        id: "sample-task-1",
        title: "Self Study - Pharmacology",
        subtitle: "Review mechanisms of action",
        course_code: "PCO 411",
        task_type: "reading",
        due_date: today,
        due_time: "14:00:00",
        is_completed: false,
        is_favorite: false,
        completed_at: null,
        source: "custom",
        created_at: today,
      },
      {
        id: "sample-task-2",
        title: "Review Notes - Clinical Pharmacy",
        subtitle: null,
        course_code: "PCH 401",
        task_type: "assignment",
        due_date: today,
        due_time: "16:00:00",
        is_completed: false,
        is_favorite: false,
        completed_at: null,
        source: "custom",
        created_at: today,
      },
    ];
  }, [sampleEvents, today]);

  const displayedTasks = activeTasksList.length ? activeTasksList : sampleTasksList;
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
              <Link
                href={href}
                key={href}
                className="shell-touch-feedback"
                data-pressed={pressedDestination === href}
                onPointerDown={() => setPressedDestination(href)}
                onTouchStart={() => setPressedDestination(href)}
                onPointerCancel={() => setPressedDestination(null)}
                onTouchCancel={() => setPressedDestination(null)}
                onPointerLeave={() => setPressedDestination(null)}
                onBlur={() => setPressedDestination(null)}
              >
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
          <Link href="/app/learn">
            See all
            <ChevronRight size={17} aria-hidden="true" />
          </Link>
        </div>
        <div className="learn-cards-container is-grid-view">
          {learnArticles.slice(0, 4).map((article) => (
            <LearnCard
              key={article.slug}
              article={article}
              isBookmarked={bookmarkedSlugs.has(article.slug)}
              onBookmarkToggle={toggleBookmark}
            />
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
          <Link
            className="dashboard-mobile-view-all"
            href={`?modal=planner&tab=${activityTab === "tasks" ? "tasks" : "timetable"}`}
            onClick={(event) => {
              event.preventDefault();
              openPlannerModal(
                activityTab === "tasks" ? "tasks" : "timetable",
                event.currentTarget
              );
            }}
          >
            View all
            <ChevronRight size={17} aria-hidden="true" />
          </Link>
        </div>
        {taskActionError && (
          <p className="dashboard-task-action-error" role="alert">
            That task could not be marked complete. Try again.
          </p>
        )}
        <div className="dashboard-events">
          <div className="dashboard-calendar">
            <StudyActivity today={today} />
          </div>
          <div className="dashboard-agenda" aria-live="polite">
            <div className="dashboard-agenda-heading">
              <h3>Up next</h3>
              <div className="dashboard-agenda-tabs" role="tablist" aria-label="Up next view">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activityTab === "timetable"}
                  className="dashboard-agenda-tab"
                  onClick={() => setActivityTab("timetable")}
                >
                  Timetable
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activityTab === "tasks"}
                  className="dashboard-agenda-tab"
                  onClick={() => setActivityTab("tasks")}
                >
                  Tasks
                </button>
              </div>
              <Link
                className="dashboard-agenda-manage"
                href={`?modal=planner&tab=${activityTab === "tasks" ? "tasks" : "timetable"}`}
                onClick={(event) => {
                  event.preventDefault();
                  openPlannerModal(
                    activityTab === "tasks" ? "tasks" : "timetable",
                    event.currentTarget
                  );
                }}
              >
                View all
              </Link>
            </div>
            {data.loading || data.eventsError ? (
              <ScheduleState
                loading={data.loading}
                error={data.eventsError}
                onRetry={data.reload}
              />
            ) : activityTab === "tasks" ? (
              displayedTasks.length ? (
                <DashboardTasksList
                  tasks={displayedTasks}
                  today={today}
                  onComplete={completeFromActivity}
                  onSelect={(taskId, target) => openPlannerModal("tasks", target, taskId)}
                />
              ) : (
                <ScheduleState loading={false} error={false} onRetry={data.reload} kind="tasks" />
              )
            ) : agenda.length ? (
              agenda.map((event) => (
                <div className="dashboard-event" key={event.id}>
                  <div className="dashboard-event-date">
                    <strong>
                      {!event.date
                        ? "—"
                        : event.date === today
                          ? "Today"
                          : formatDateOnly(event.date, { weekday: "short" })}
                    </strong>
                    <span>
                      {event.date
                        ? formatDateOnly(event.date, { month: "short", day: "numeric" })
                        : "No date"}
                    </span>
                  </div>
                  <span className="dashboard-event-dot" aria-hidden="true" />
                  <div>
                    <h3>{event.title}</h3>
                    <p>{event.detail || "All day"}</p>
                  </div>
                </div>
              ))
            ) : (
              <ScheduleState
                loading={false}
                error={false}
                onRetry={data.reload}
                kind={activityTab}
              />
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
          ) : activityTab === "tasks" ? (
            displayedTasks.length ? (
              <DashboardTasksList
                tasks={displayedTasks}
                today={today}
                onComplete={completeFromActivity}
                onSelect={(taskId, target) => openPlannerModal("tasks", target, taskId)}
              />
            ) : (
              <div className="dashboard-mobile-empty">
                <h3>No upcoming tasks</h3>
                <p>Your tasks will appear here when available.</p>
              </div>
            )
          ) : (
            <MobileActivityTimeline
              events={events}
              tab="timetable"
              today={today}
              sample={sampleEvents}
              onCompleteTask={completeFromActivity}
              onSelectTask={(taskId) => openPlannerModal("tasks", undefined, taskId)}
            />
          )}
        </div>
      </section>
      <SamplePreview title={preview} onClose={() => setPreview(null)}>
        <div className="dashboard-preview-art">
          <StudyArt kind="document" variant="banner" />
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
