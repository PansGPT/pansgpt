# Legacy reuse and parallel frontend/backend development

Date: 22 October 2026. Decision: user-approved parallel coding against agreed contracts. Scope: source review and workflow documentation; no quiz implementation or database import.

## What was inspected

The sibling `../pansgpt-eli` repository contains much more than a visual prototype: student study/reader, quiz, notes, chat, lecturer/admin and timetable routes are present. This review inspected the route inventory and focused on quiz source, data shapes, generation, submission and sharing. It is not a runtime audit of every legacy feature, and source presence does not establish correctness or deployment status.

Legacy snapshot: local HEAD `31d0f155d43eb7819960d98c130eaf835043b2e6`, with a clean working tree at review time. No fetch or pull was performed, so this records the local checkout rather than claiming it is the latest remote revision.

The current monorepo has quiz tables and generated database types, but no quiz router, generation engine, grading service or quiz API tests under `apps/api`. `apps/web/app/app/quiz/page.tsx` remains a placeholder. Phase 13 is Pending.

The legacy source and SQL files were read locally. No legacy environment files, hosted database records or external AI services were accessed. Existing student records and documents were not copied. Here, reuse means preserving useful behavior and adapting code/data shapes; moving real data requires its own reviewed mapping and preservation checks.

## Reusable legacy starting points

Paths in this table are relative to `../pansgpt-eli`.

| Area        | Legacy source                                                                                                | What to preserve/adapt                                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Builder     | `frontend/components/QuizBuilderModal.tsx`, `QuizSelectionForm.tsx`                                          | Three steps: content, format, optional settings; course/topic selection, count, difficulty and timer. Prefer one adapted implementation over carrying both builders.                          |
| Generation  | `frontend/components/QuizGeneratingScreen.tsx`, `frontend/app/(app)/quiz/generating/[jobId]/page.tsx`        | Progress, cancellation and navigation into a generated quiz; include partial generation and failure states.                                                                                   |
| Taking      | `frontend/components/QuizTaking.tsx`, `frontend/app/(app)/quiz/[id]/page.tsx`                                | Question navigation, countdown, unanswered confirmation, streaming additions and submit journey. Adapt state/transport separately from presentation.                                          |
| Results     | `frontend/components/QuizResults.tsx`, `QuizResultsHeader.tsx`, `QuizShareCard.tsx`                          | Score summary, per-question feedback, explanations and share-card presentation. Obtain authoritative results from the new API.                                                                |
| History     | `frontend/components/QuizHistory.tsx`, `QuizPerformanceModal.tsx`, `frontend/hooks/useSidebarQuizHistory.ts` | Attempts, performance summary and filtering; fit the existing new shell rather than importing the legacy sidebar.                                                                             |
| Cached data | `frontend/lib/QuizCacheContext.tsx`                                                                          | Course/document/history concepts. Replace `any` types; scope caches and pending requests to the verified user/university and clear them on account changes.                                   |
| Validation  | `backend/routers/quiz.py`, `backend/tests/test_quiz_validation.py`                                           | Tagged-question parsing, malformed-output checks, option validation and deduplication test cases. Port into focused engine modules with new typed schemas. Existing tests were read, not run. |

Use the new repository's shared UI tokens/components, `/app/quiz` route structure, authenticated shell and FastAPI access patterns. Copy selected implementation into this repository; no runtime dependency on the sibling folder. Avoid importing the legacy dependency tree or its application-wide auth/context providers wholesale.

## Data and behavior that do not map directly

| Legacy                                                       | Current monorepo / required resolution                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `quiz_questions.question_text`                               | Current column is `prompt`. Map through an explicit API DTO, not an unchecked type cast.                                                                                                                                                                                                                  |
| `quizzes.time_limit` / request `timeLimit` in minutes        | Current storage is `time_limit_sec`; legacy `timeTaken` is already seconds, while current attempts use `time_taken_sec`. Define units and convert only at the boundary.                                                                                                                                   |
| `quiz_results`, with separate `feedback` JSON                | Current storage is `quiz_attempts` with `answers` JSON. Define the result/review DTO and storage mapping; preserve per-option feedback explicitly. Do not point new components at a nonexistent `quiz_results` table.                                                                                     |
| Types `OBJECTIVE`, `MCQ`, `TRUE_FALSE`, `SHORT_ANSWER`       | Current DB permits `mcq`, `tf`, `short`, `clinical_scenario`, `fill_blank`. Section 11 plans five formats including distinct `MCQ_MULTI_SELECT` and `MCQ_TRUE_FALSE`. Agree explicit discriminated question/answer shapes and forward migrations; aliases alone cannot represent different scoring rules. |
| Legacy `MCQ` UI submits selected options as `string[]`       | Section 11's per-option True/False format needs separate True, False and unanswered states for each option. A checkbox cannot represent all three.                                                                                                                                                        |
| Topic, academic session and semester in legacy configuration | New quiz metadata does not have the same columns. Decide whether these belong in typed job configuration, durable quiz metadata or both; do not silently drop them.                                                                                                                                       |
| Job `generated_question_count`, `target_question_count`      | Legacy added these via `backend/migrations/add_quiz_generation_job_counts.sql`; current jobs lack those columns. Specify progress counts in DTOs and either derive consistently or add a forward migration.                                                                                               |
| Mixed camelCase requests and snake_case rows                 | Choose and document the API boundary convention; shared DTOs must distinguish API responses from generated Supabase row types.                                                                                                                                                                            |
| `material_status` in the legacy course/document cache        | Resolve eligible course documents from the new authorized library model; do not trust a client-supplied university or silently accept archived/unavailable documents.                                                                                                                                     |

Canonical schema sources: `supabase/migrations/20260906090004_learning_and_quizzes.sql`, `20260906090008_row_level_security.sql` and `packages/types/src/supabase.ts`. Do not amend applied historical migrations or execute legacy SQL Editor instructions.

## Defects and architecture gaps to avoid carrying over

These findings come from source inspection, not a live exploit or runtime certification.

1. **Answer keys exposed during taking.** Legacy `get_quiz` and `quiz_generation_events` select all question columns and return full rows, including `correct_answer` and `explanation`. Omitting those fields from a TypeScript interface does not remove them from the HTTP payload. Use separate taking/review serializers and assert absence in API/SSE tests.
2. **Submission ownership gap.** Legacy `submit_quiz` fetches questions by `body.quizId` without first checking quiz ownership; `_get_supabase()` prefers a service-role client that bypasses RLS. The new submission path must authorize the quiz/attempt against the current verified user and tenant before loading keys or persisting grades. Test cross-user and cross-university submission.
3. **Public share exposes too much.** Legacy `share_quiz` is unauthenticated and returns full quiz/questions plus the highest `quiz_results` row. Replace this behavior with opt-in, revocable sharing of an explicit minimal summary. The Section 11 historical endpoint description is amended accordingly.
4. **New database policies also need tightening.** Current `quiz_questions_owner`, `quiz_attempts_owner` and `quiz_jobs_owner` policies are `FOR ALL`. Ownership alone neither hides answer columns nor reserves grading/job writes for the backend. Before live integration, review actual grants, restrict client access with forward migrations and test authenticated PostgREST/SQL access directly. Sanitizing HTTP responses alone is insufficient. Hosted exploitability was not tested in this review.
5. **Generation is tied to an API process.** Legacy job creation uses FastAPI `BackgroundTasks`. Adapt to the current durable Postgres outbox/ARQ pattern with retry-safe writes, cancellation and worker recovery; do not copy the process-local execution model.
6. **Stream signing breaks across restarts/processes.** Legacy `STREAM_TOKEN_SECRET = uuid.uuid4().hex` generates a new secret per process. Reuse an approved stable signing mechanism, scope tokens to user/quiz/expiry, recheck access and document reconnect behavior. Do not commit signing secrets or expose reusable account tokens in URLs/logs.
7. **AI grading is insufficiently bounded.** Legacy short-answer grading converts model scores to floats without enforcing the expected range, then silently switches to exact-match grading on failure. Define validated score bounds, explicit pending/unavailable grading states and consistent rubric behavior. Never bypass strict ZDR to generate or grade questions; unverified providers remain blocked.
8. **Legacy types and styling need adaptation.** Builder response parsing and history caches contain `any`; components include local color classes and old contexts. Replace these with validated DTOs, the new theme tokens and owner-scoped state. Preserve useful behavior without overwriting the approved new auth/home/chat layouts.

## How the cofounder can start

1. Read this handoff, root `AGENTS.md`, Phase 13 and implementation-plan Section 11. Select the legacy builder, taking and results behavior to port into the existing shell.
2. Agree a small shared contract change first: builder inputs, job response/status/counts, safe taking question variants, answer submission, result/review payload, history and error states. Record units, scoring rules and acceptance criteria. These DTOs are still to be authored; legacy payload examples are reference material, not an approved API contract.
3. Build the frontend against deterministic synthetic fixtures through an explicit adapter. Cover empty history, partial generation, retry, cancel, expired auth, privacy hold, timer expiry and rejected submission as well as success. Clearly label the preview as sample data. Mock results must never be submitted as real attempts.
4. In parallel, implement the same contracts in FastAPI/Pydantic, forward CLI migrations, database access restrictions, durable generation and server-side grading. Backend tests cover authorization, answer secrecy, score bounds, cancellation, recovery and duplicate submissions; define the authoritative timing policy and submission idempotency.
5. Switch the adapter to the real API after its gates pass. Test the complete builder → generation → taking → submission → review/history journey. Only then certify the feature; frontend review alone does not complete Phase 13.

Frontend coding can begin once step 2 is agreed, without waiting for backend completion. Do not enable unfinished live controls or silently fall back to sample results after a real API error.

## Verification and Notion handoff

This change updates policy and planning only. Verification consists of source comparison, documentation formatting and diff checks; no legacy runtime, new quiz backend, migration, hosted privacy or end-to-end quiz verification is claimed.

No callable Notion connector is available in this session. Synchronization remains pending; a Notion-enabled agent can use the following concise entries:

- **Session / Change Log:** “Authorize contract-first parallel development and review legacy quiz reuse”; date `2026-10-22`; area Engineering workflow / Quiz; files `AGENTS.md`, `docs/build_roadmap.md`, `docs/implementation_plan.md`, this handoff. Leave `Verified` unchecked for functional delivery; note documentation checks separately.
- **Decision Log:** Frontend and backend may be coded in parallel after agreeing typed contracts and explicit synthetic fixtures. Rationale: reuse legacy flows while preserving new security/architecture. Alternatives: strict frontend blocking until backend completion; direct legacy copy without contract adaptation.
- **Product Roadmap:** Phase 13 stays Pending. Add contract/schema reconciliation and security prerequisites; record the cofounder's frontend path without marking generation, grading or integration implemented.
- **Knowledge Base:** If recording this core workflow change, add only a concise process note linking to AGENTS and this handoff; do not claim a stack or hosting change.
