# Timetable, Tasks, and Streak — Luna’s Implementation Record

> **5 November 2026 update:** This is the historical 2 November record. The Tasks modal was subsequently implemented and its save/pagination fixes are in verification. The user has kept Timetable UI deferred and requested a streak discussion after implementation. See [today's scope and verification](tasks-2026-11-05.md).

**Date:** 2026-11-02
**Branch:** `feat/streak-timetable-tasks`
**Status:** The database migration is applied to the one configured Supabase database. Backend contracts and home previews are implemented. The full Tasks and Timetable screens were removed from the modal at the user’s request; the modal now shows “Coming soon.” Feature journeys and CI checks have not been run in this session.

## Decisions and design changes

1. **Keep Timetable and Tasks together.** The user asked to avoid separate pages and separate popups. Both options live in one Settings-sized Study Planner modal, with a Timetable/Tasks switch at the top. The switch stays in the URL as `?modal=planner&tab=timetable` or `?modal=planner&tab=tasks`, so links can open the selected view and browser navigation can close the modal or return to the prior selection.
2. **Put the switch where the modal title was.** The visible “Study Planner” header label was removed; the two tabs sit in that header. The accessible dialog title remains visually hidden.
3. **Do not add navigation links for these features.** The header and sidebar do not get standalone Timetable or Tasks destinations. The Home “Up next” preview opens the shared modal on the matching tab.
4. **The detailed modal designs are currently out of scope.** The first task list/detail design was based on `Screenshot 2026-11-02 113858.jpg` and `Screenshot 2026-11-02 113850.jpg` from Downloads. It included task creation, list/detail views, completion and favorites, plus due date/time and notes. A weekly timetable view and university-admin editor were also implemented. The user then asked to remove those designs while keeping the modal. Their content component files and related styles were deleted. The modal now displays the selected section’s icon, a “Tasks are coming soon” or “Timetable is coming soon” heading, and a short message. Backend APIs and data contracts remain in place for a later UI.
5. **Center the Home preview’s empty state.** The desktop “Up next” empty/error state and the mobile empty state use centered layouts so an empty schedule reads as one deliberate message rather than left-aligned fragments.
6. **Use task completion as the activity signal.** The streak counts dates with completed tasks. It does not claim that task completion measures study time. Any generated sample data is visible as “Sample” and is only enabled in explicit demo mode.
7. **Preserve legacy timetable data.** Existing text `time_slot` and `start_time` fields remain supported. New typed time and optional term dates supplement them so old rows remain readable.
8. **Apply schema changes only through versioned migrations and the Supabase CLI.** No SQL Editor changes were made.

## How the feature works

### Home activity and streak

- The web dashboard calls authenticated `GET /api/v1/home/dashboard?timezone=<IANA timezone>` through the FastAPI client. The browser sends its timezone (with `Africa/Lagos` as the fallback).
- The API calculates the user’s local calendar date using that timezone, then returns up to 100 unfinished tasks (including overdue tasks) due through 21 days ahead, timetable occurrences for a 21-day window, and 365 days of task-completion activity.
- Each activity day is grouped from `student_tasks.completed_at` in the requested timezone. The streak starts today if a task was completed today; otherwise it starts yesterday. It counts consecutive active dates moving backward.
- The Home activity heatmap shows completed-task counts. It does not turn these counts into minutes studied.
- Home “Up next” tabs remain available for Timetable and Tasks. Completing a task there sends an owner-scoped API update and refreshes the dashboard. A failed update restores the prior task state and displays an error.

### Student tasks

- DTOs in `packages/types/src/academic.ts` define task requests and responses. The web client validates responses with Zod before using them.
- Task types are `class`, `reading`, `assignment`, `lab`, `presentation`, `meeting`, and `custom`; task sources are `custom`, `timetable`, and `ai_generated`.
- `GET /api/v1/tasks` can include completed tasks and accepts a bounded result limit. `POST /api/v1/tasks` creates a task. `PATCH /api/v1/tasks/{task_id}` updates task details, completion, or favorite state. `DELETE /api/v1/tasks/{task_id}` removes a task.
- Every student task query is scoped to the authenticated user and their university. Completion time is set by the API when a task is completed and cleared when it is reopened. Repeating “complete” does not replace an existing completion timestamp.
- Task dates and times accept ISO values such as `2026-11-02` and `09:30`. Explicit Pydantic validators convert those strings before strict validation; this addresses the date/time request validation failure that previously surfaced as HTTP 422.
- **Current UI limit:** The Home preview still shows upcoming tasks and supports completion. The task create/list/detail/favorite screen is not currently rendered; opening Tasks in the modal shows “Coming soon.”

### Timetable

- A timetable row represents a recurring weekday class for a university and student level. The API expands it into dated occurrences for a requested range, respecting optional `effective_from` and `effective_until` dates.
- `GET /api/v1/timetable` accepts an inclusive range of up to 31 days. The Home dashboard requests 21 days.
- University administrators can list, create, update, and delete entries through `/api/v1/admin/timetables`. Super administrators must supply a university ID. The API checks the requested university and role before changing rows.
- Typed `start_time_local` and `end_time_local` values are returned when present. The API builds a readable time slot from them and falls back to the legacy text fields when needed.
- **Current UI limit:** The weekly timetable and admin editor are not currently rendered; opening Timetable in the modal shows “Coming soon.” The API endpoints remain implemented.

## Security and database changes

No new streak/task/timetable table was created. Streak data is calculated from the existing `student_tasks.completed_at` field. The new mirrored migration is:

- `supabase/migrations/20261102120000_student_activity_and_timetable_contracts.sql`
- `packages/database/migrations/20261102120000_student_activity_and_timetable_contracts.sql`

It adds nullable `start_time_local`, `end_time_local`, `effective_from`, and `effective_until` columns to `public.timetables`, plus `is_favorite boolean NOT NULL DEFAULT false` to `public.student_tasks`. It adds checks that class start/end times are provided together and ordered, and that the effective end date is not before the start date. It also adds timetable lookup and unfinished-task due-date indexes.

The migration retains authenticated read policies and revokes direct client writes on task and timetable tables. Application mutations go through FastAPI, which applies user, university, and role checks.

### Migration history issue and resolution

The first CLI dry run could not proceed because the checkout lacked `20261026100000_quiz_lifecycle.sql`, a migration already recorded in the database. The exact file was recovered from Git history and copied into both migration folders so local history matches the database. It was not reapplied. The CLI dry run then showed only `20261102120000_student_activity_and_timetable_contracts.sql` as pending; `pnpm exec supabase db push` applied it to the single database configured by `apps/api/.env`’s `DATABASE_URL`. A second dry run reported that the database was up to date.

## Contracts and diagnostics

- FastAPI models live in `apps/api/app/models/academic.py`; the routes are in `apps/api/app/routers/academic.py` and are registered by `apps/api/app/main.py`.
- Shared TypeScript contracts live in `packages/types/src/academic.ts` and are exported through the package barrel. Generated Supabase row types and the database schema snapshot include the new columns.
- The web API helper in `apps/web/lib/academic.ts` handles requests, checks responses, and extracts the first FastAPI field-validation message for display.
- Dashboard, timetable, task-list, and task-create database warnings include the exception type and SQLSTATE when available. This makes a future 503 easier to trace to its database cause.
- Home data loading keeps recent-material loading separate from the academic dashboard request. A dashboard failure produces an explicit error state rather than fabricated live schedule data.

## Current Home and modal behavior

- The shared modal wrapper remains in `apps/web/components/shell/planner-modal.tsx`. Its top switch changes the URL-backed tab without opening a second modal.
- The URL handling and focus return remain in `apps/web/components/shell/app-shell.tsx`. Existing `?modal=tasks` and `?modal=timetable` links are still recognized for compatibility; new links use `?modal=planner&tab=...`.
- The modal is still opened from Home “View all” and keeps the selected tab. The modal title is visually hidden but remains available to assistive technology.
- Empty and error messages in the desktop schedule preview are horizontally centered; the mobile empty message is centered horizontally and vertically.
- No standalone Task or Timetable route or navigation item is part of this implementation.

## Main files involved

- **API:** `apps/api/app/models/academic.py`, `apps/api/app/routers/academic.py`, `apps/api/app/main.py`
- **Web shell and Home:** `apps/web/components/shell/app-shell.tsx`, `dashboard-data.tsx`, `dashboard.tsx`, `mobile-activity-timeline.tsx`, `navigation.ts`, `sidebar.tsx`, `study-activity.tsx`, `planner-modal.tsx`, `planner-modal-context.ts`, `shell.css`. The earlier `tasks-modal-content.tsx` and `timetable-modal-content.tsx` UI files were deleted when the user requested the Coming Soon placeholder.
- **API client and configuration:** `apps/web/lib/academic.ts`, `apps/web/env.ts`, `apps/web/.env.example`
- **Shared types and schema snapshots:** `packages/types/src/academic.ts`, `packages/types/src/index.ts`, `packages/types/src/supabase.ts`, `packages/database/schema_full.sql`
- **Database migrations:** the new mirrored `20261102120000_student_activity_and_timetable_contracts.sql` files and the restored mirrored `20261026100000_quiz_lifecycle.sql` history files
- **Project plans and handoff:** `docs/build_roadmap.md`, `docs/implementation_plan.md`, `docs/notion-sync-2026-11-02.md`

## Verification and remaining work

- **Database:** The migration was applied through the Supabase CLI. A follow-up dry run reported no pending migrations.
- **Not run:** No API pytest suite, web tests, typecheck, build, or real browser journey was run in this session. The backend and Home integration therefore still need an end-to-end check after restarting the local API.
- **Notion:** No Notion connection was available, so the Engineering gallery was not directly updated. `docs/notion-sync-2026-11-02.md` is the local handoff record.
- **Future UI work:** Revisit the visual design of task creation/details/favorites and the weekly timetable/admin editor before removing the Coming Soon placeholder. Keep the single URL-backed modal and the Home preview behavior unless product direction changes.
