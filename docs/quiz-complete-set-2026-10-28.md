# Complete quiz sets and batch latency - 28 October 2026

User-approved behavior: prepare small recoverable batches internally, but let students start only when the entire requested set is complete. Retain actual progress counts. Existing partial attempts must remain recoverable. Public QuizJob/QuizConfig DTOs remain unchanged; can_start now requires completed status and exact target count for timed and untimed quizzes.

Performance scope: remove avoidable durable deferral after another concurrent batch has made progress and reconciled its token reservation. Retry through normal provider admission inside the existing bounded generation loop. Preserve all actual quotas, provider order, source/quality/freshness checks and saved questions. If the next wave makes no progress and capacity remains unavailable, retain the normal durable backoff.

Acceptance: API cannot start incomplete new timed/untimed quizzes; completed status with missing questions cannot start; existing partial attempts can resume; browser never offers partial start; real database tests exercise a deferred sibling followed by successful immediate completion in one worker delivery and genuine all-provider deferral remains durable. Verification and Notion entries follow below.

## Implementation

- Job can_start requires completed status and exactly the requested count. New timed and untimed attempts are rejected with HTTP 409 until that condition holds. An existing incomplete attempt created under the former early-start policy can still resume the same saved answers/revision; no saved attempts, timing or results were rewritten.
- The preparation UI requires completed status, exact count and can_start before showing Start quiz, even if an old/stale API flag says otherwise. Partial counts are labelled questions prepared. A queued job with saved questions says preparation is paused/waiting to resume rather than waiting to begin. Inconsistent completed-with-missing-count responses show finishing/preparing rather than announcing readiness.
- Batches remain independently saved, source-grounded, novelty-checked and recoverable. The retry wave immediately rechecks normal admission when a sibling batch has made progress, allowing its reconciled token reservation to be used. It does not wait on a capacity denial calculated before settlement. If the next wave makes no progress and admission still denies capacity, the normal durable deferral remains in place. All loops/time budgets and actual quotas remain bounded; provider order and question-generation instructions did not change.
- No extra inference/review call or quota bypass was introduced. This removes an avoidable wait in a specific recoverable situation; it is not a measured production latency guarantee. Google response time, actual quota exhaustion, invalid batches, retrieval and queue pickup can still take time.

## Verification

- Full offline API suite: 741 passed, 61 service-dependent tests skipped. Python lint and formatting passed for changed files.
- Real PostgreSQL integration: 32 passed, one designated Redis-dependent test skipped. Tests cover incomplete timed/untimed starts, inconsistent completed status, full-set start after parallel batches, safe recovery of legacy partial attempts and saved answers, and genuine capacity deferral.
- The latency regression simulates one successful five-question batch and one admission denial of 60 seconds. The remaining five complete in the same worker delivery, with calls [5,5,5], one generation attempt, and no durable wait. The existing all-denied case still preserves progress and a retry deadline. This is deterministic recovery evidence, not a live timed benchmark.
- All 26 browser journeys passed, including timed/untimed full-set gates, stale early can_start flags, misleading completed status with missing questions, generation recovery, legacy partial attempts, saved answers, grading retry and themes/mobile.
- Frontend component lint, web TypeScript and the Next.js production build passed.
- Checked no active generation or grading before restarting the API and worker. Worker initialized its database pool and reported quiz_wake_listening. Final readiness recorded below. The isolated PostgreSQL cluster is stopped after tests.

Files: quiz_service.py, workers/quiz_pipeline.py, preparation.tsx, shared QuizJob type documentation, database/browser tests, canonical plan links and this log. No migration or public DTO shape changes; the shared can_start semantics are documented.

## Notion synchronization pending

Connector unavailable; entries have not been posted.

- Session / Change Log: Summary: Deliver complete quiz sets and avoid unnecessary post-batch capacity deferral. Date: 2026-10-28. Area: Quiz / Generation / Start UX. Files: listed above. Verified: checks above.
- Decision Log: Rationale: Retain recoverable small batches internally and expose new attempts only after the complete set is ready; retry admission after progress frees reservations. Alternatives: one large fragile model response, early partial starts, or ignoring provider limits. User explicitly chose complete-set delivery.
- Product Roadmap & Features: Complete-set delivery and progress-aware capacity retry implemented and locally verified. Hosted end-to-end latency/reliability certification remains open.
- Knowledge Base: No stack or core architecture change; no update required.

Final local readiness returned HTTP 200 with database, Redis and storage OK. The restarted worker subscription was confirmed; the isolated test database was stopped.
