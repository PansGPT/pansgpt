# Quiz system

> **2026-10-28 course coverage/freshness:** Course-neutral instructions, stratified material sampling, spread-out generation batches, versioned bank reuse and owner-scoped full generated-question history are locally verified. [Contract, evidence and limits](quiz-coverage-and-freshness-2026-10-28.md).

Branch: `feat/quiz-system`. Product reference: root `quiz.md`; implementation follows the current monorepo, not legacy payloads.

## Contract and product decisions

- `/api/v1/quiz` uses snake_case DTOs, UUID identifiers, UTC timestamps and seconds. All operations require verified owner/university identity except an explicitly created, revocable public score summary.
- Five formats: objective (four choices, one correct, 1 point); multi-select (five choices, exactly three correct, select at most three, 1 point per correct selection); statement matrix (five independent true/false/unanswered statements, +1/-1/0); true/false (1 point); short answer (rubric-based 0, 0.5 or 1 point). Preserve raw negative scores, floor the displayed percentage at zero. Never interpret an unchecked box as a false decision.
- Stable option IDs, never option text, are submitted. Taking and progress never include answer keys, explanations or rubric references. Those are available only after the attempt is submitted. All quiz tables are API-only; authenticated PostgREST clients cannot read keys or forge grades/jobs.
- Builder uses eligible, active, fully ingested university/level materials. Topic is optional. Ten questions, medium, objective and untimed are defaults. Allowed counts: 5–25 in increments of five. No generic-knowledge fallback when source material is missing.
- Generation jobs are durable Postgres records dispatched through ARQ, with leases, bounded retries, validated JSON batches, source references, duplicate rejection and cancellation checks before committing a batch. New timed and untimed attempts start only after the complete requested set is ready. Small batches are saved internally for recovery. Existing legacy partial attempts can resume their saved state; submission still waits for the complete set. See [complete-set delivery and latency recovery](quiz-complete-set-2026-10-28.md).
- Starting an attempt creates a server timestamp/deadline once. Refresh resumes that attempt. Autosave uses optimistic revision checks, and submit freezes the saved snapshot once. Expiry freezes the last server-saved answers; browser time cannot extend an attempt. Submission is idempotent. Failed written-answer grading preserves the submitted snapshot and allows retry without substituting exact matching.
- History is a paginated attempt timeline. Aggregate statistics use all completed attempts, independent of the displayed page. Results show per-question/option points, explanations and original source excerpts, and offer targeted revision from missed concepts.
- Sharing requires a deliberate action and an unguessable, hashed bearer token; only title, course, percentage, count and completion date are public. No names, questions, answers or private attempt identifiers.

## Verification gates

Required: deterministic scoring/schema tests; API ownership and answer-projection tests; real database grants, isolation, concurrency and lifecycle tests on a disposable migrated database; browser journeys at desktop/mobile widths; lint, typecheck, pytest and build. Hosted provider quality is separate from mocked tests. Do not claim live generation or hosted migration verification from unit tests.

## Delivery evidence

Verified locally on 26 October 2026:

| Check                                    | Result                                                                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Full offline API pytest suite            | 667 passed; 39 service-dependent tests skipped                                                                         |
| Quiz lifecycle on isolated PostgreSQL 18 | 13 passed, including concurrency, actual worker writes, API projection, grants, expiry, cancellation and grading retry |
| Web unit tests                           | 49 passed, including server-proxy credential, route and body-size boundaries                                           |
| Quiz browser journeys                    | 13 passed; five question interactions, failure recovery, account changes and three responsive themes                   |
| Monorepo lint and TypeScript             | Passed                                                                                                                 |
| Python Ruff lint and formatting          | Passed                                                                                                                 |
| Next.js production build                 | Passed; quiz workspace, public summary and same-origin proxy included                                                  |
| Migration mirror                         | 36 versions match; new tables enable RLS immediately                                                                   |

The PostgreSQL 18 fixture replays the existing quiz-table migration and the actual lifecycle migration against a minimal synthetic baseline. It verifies real transactions and grants, but is not a full Supabase/vector-extension replay. CI now includes the quiz database and browser suites. The six quiz table type declarations were refreshed from that local catalog; other schema declarations were preserved.

The user explicitly approved staging migration and local activation on 26 October 2026. Supabase CLI applied only `20261026100000_quiz_lifecycle.sql`; its version is present in staging migration history. Catalog checks confirm RLS on all six quiz tables and no direct authenticated/anonymous read/write access. Existing four documents and 275 chunks are preserved. Ignored local configuration now sets `ENABLE_QUIZ=true` for API/worker and matching server-only web API identity. Local FastAPI health returns 200, Redis ping succeeds, the worker publishes a health heartbeat, and the web proxy returns the expected 404 for a nonexistent shared-result capability. Production is unchanged. Live provider accuracy and a complete real authenticated quiz journey remain unverified.

## API and runtime

Generation reliability follow-up: Groq rejects constrained schemas containing keyed-map `propertyNames`. Quiz batches now use compatible JSON mode with strict local validation, bounded/rotating evidence and local schema/source-ID checks (the separate AI audit was removed on 27 October at the user's request). Terminal jobs expose an owner-scoped **Retry this quiz** action with a fresh durable delivery identity. Synthetic live generation passes; replay of the saved course request awaits explicit provider-data authorization after automatic review rejection. See [cause, changes and verification](quiz-generation-reliability-2026-10-26.md).

Authorization reliability follow-up: the shared database helper now budgets cold connection setup separately from pool queue waiting, and never multiplies direct connections after pool acquisition fails. Eight concurrent staging profile reads and quiz service reads succeed; 671 API tests pass. See [cause and verification](quiz-authorization-reliability-2026-10-26.md). Existing staging materials are active and fully ingested but all target level 400; other academic levels correctly receive an empty course list.

The web uses `/api/quiz/*`; Next.js forwards allowlisted operations to FastAPI `/api/v1/quiz/*`, injecting `X_API_KEY_WEB` on the server and preserving the student's bearer token. Quiz transport bypasses cookie-session middleware, avoiding a redundant Supabase verification on every autosave/progress request; FastAPI still validates the bearer token and client key. Native clients use the FastAPI contract with their own client identity. Both the API and worker must receive `ENABLE_QUIZ=true` after migration; the default is false.

| Operation                                | FastAPI path                                                                      |
| ---------------------------------------- | --------------------------------------------------------------------------------- |
| Eligible material/course choices         | `GET /courses`                                                                    |
| Create, inspect, cancel/retry generation | `POST /jobs`, `GET /jobs/{id}`, `POST /jobs/{id}/cancel`, `POST /jobs/{id}/retry` |
| Optional authenticated progress stream   | `GET /jobs/{id}/events`                                                           |
| Start/resume attempt                     | `POST /quizzes/{id}/attempts`                                                     |
| Restore/save answers                     | `GET /attempts/{id}`, `PUT /attempts/{id}/answers`                                |
| Freeze and grade; retry grading          | `POST /attempts/{id}/submit`                                                      |
| Review and history                       | `GET /results/{id}`, `GET /history`                                               |
| Create/revoke result links               | `POST /results/{id}/share`, `DELETE /results/{id}/share`                          |
| Minimal public summary                   | `POST /shared` with capability in the body                                        |

Run `python -m workers.runner` for the main ARQ worker. It adds immediate quiz notifications to the durable queue and scheduled reconciliation; ordinary ARQ polling remains the fallback. No inference runs inside the Next.js proxy. Generation uses one model pass per batch, followed by fast local structural, key-shape, source-ID and duplicate checks. Untimed practice can begin after the first batch; timed attempts and final submission require the full set. See [performance implementation and evidence](quiz-performance-2026-10-27.md).

For isolated database checks, create a fresh loopback PostgreSQL 18 cluster on port 55432, run `apps/api/.venv/Scripts/python.exe tooling/prepare-quiz-test-db.py`, and explicitly set `QUIZ_TEST_DATABASE_URL` to the synthetic `pansgpt_quiz_speed_test` database before selecting `tests/test_quiz_database.py --allow-live-services`. The bootstrap refuses to modify a populated database and never reads application database credentials. Full Supabase CI uses its designated disposable `RLS_TEST_DATABASE_URL` instead. Browser checks: `pnpm --filter @pansgpt/web test:quiz`; synthetic screenshots are in `apps/web/test-results/`.

## Notion handoff

No Notion connector is available in this session, so these entries are ready to sync; they have not been posted.

| Gallery                    | Entry                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session / Change Log       | Summary: Implement quiz generation, saved/timed attempts, grading, results and sharing. Date: 2026-10-26. Area: Quiz / API / Web / Database. Files: quiz models/engines/router/worker; shared quiz and DB types; migration and mirror; web proxy/workspace/builder/taking/results/share; tests, CI and canonical plans. Verified: local checks above only.                                     |
| Decision Log               | Use server-owned immutable submissions, stable option IDs, optimistic saves and strict bounded grading. Use full-set readiness for timers, structured JSON plus source verification, backend-only table access and a same-origin identity proxy. Alternatives: browser-owned timers, answer-text matching, generic grading fallback, partial timed quizzes and exposed browser client secrets. |
| Product Roadmap & Features | Quiz System: In Progress; implementation/local verification and approved staging/local activation verified; live-provider and complete hosted/native journeys remain open.                                                                                                                                                                                                                     |
| Knowledge Base             | Quiz clients use explicit taking/review contracts. The web proxy adds server client identity, while FastAPI retains all ownership, source access, generation, timing and grading authority.                                                                                                                                                                                                    |

### Activation change log

- Summary: Apply approved quiz lifecycle migration to staging and enable local API/ARQ worker. Date: 2026-10-26. Area: Quiz / Staging / Local runtime. Files: ignored root/web environment configuration; canonical plans and this handoff. Verified: staging migration history, six-table RLS/grants, document/chunk counts, API health, Redis/worker heartbeat and real web proxy.
- Roadmap: Staging/local activation verified; full live generation, authenticated completion and production release remain open.
- Notion: Connector unavailable; this activation entry has not been posted.

## Quiz UX update - 27 October 2026

The user requested a simple, mature interface and direct copy. The dashboard now starts with quiz actions and history; the promotional banner and illustration are removed. Setup uses one form with course, topic, type, count, difficulty and time limit. Progress uses actual counts; results show a plain score and answer feedback. See [UX changes and validation](quiz-ux-2026-10-27.md).

> **2026-10-27 quiz capacity:** Shared provider token/request admission and reset headers, compact provider-only generation, valid-sibling retention, scoped request coalescing and idle/ingestion inventory warming are implemented. Capacity waits preserve questions and attempts. Google synthetic probes still returned internal errors; a shared cooldown avoids repeated user-facing waits. See [capacity implementation and verification](quiz-capacity-2026-10-27.md).

> **2026-10-27 matrix ordering:** Matrix questions use three true/two false statements with independently shuffled statement/key pairs persisted on the server. Generation now targets plausible near-miss distractors with content-based explanations. Old matrix inventory is excluded from new quiz assembly; existing attempts and results stay unchanged. See [implementation and verification](quiz-matrix-randomization-2026-10-27.md).
