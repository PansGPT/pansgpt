# Quiz performance - 27 October 2026

Branch: `feat/quiz-system`. The user explicitly requested the performance improvements and removal of the second AI review.

- One generation call per batch. Pydantic validation, answer-key structure, known source IDs and duplicate checks remain local. There is no second model audit or claim of independent factual verification.
- Provider deadlines are 10 seconds for Google, 12 for Groq and 6 for OpenRouter, inside a 30-second completion budget. A failed provider is skipped for 60 seconds. At most two provider requests run concurrently in each worker process.
- Two batches of up to five questions run concurrently. Each finished batch is saved with a bulk insert under the durable job lease. Cancellation, count and duplicate checks run before each commit.
- `python -m workers.runner` subscribes to quiz notifications after durable enqueue. Existing ARQ polling and reconciliation recover missed notifications. Interactive work takes priority over bank replenishment.
- Reusable questions must match university, level, course, topic, difficulty and format. Stored sources are checked against currently eligible, unchanged document chunks. Recently seen prompts are excluded. Revision requests generate targeted questions rather than using the bank.
- A bank hit bypasses generation and embedding when it fills the request. Hidden replenishment uses existing server-only tables, is idempotent and globally limited to one pending refill. It does not consume the student's interactive quota or appear in history. No schema migration was needed.
- Untimed attempts can start after a batch arrives. Incoming questions preserve local answers, flags and autosave revision. Timed attempts and submission require the complete set. Failed remaining generation can be retried without losing the attempt.

## Verification

| Check                                                   | Result                                                                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Offline API suite                                       | 676 passed; 43 service-dependent tests skipped                                                                          |
| Isolated PostgreSQL lifecycle suite                     | 17 passed, including simultaneous batches, early start, blocked partial submission, timed readiness and safe bank reuse |
| Quiz browser journeys before the subsequent UX update   | 16 passed                                                                                                               |
| Web unit tests                                          | 50 passed                                                                                                               |
| Monorepo lint and typecheck, Python lint, Next.js build | Passed; a remaining Python formatting wrap was subsequently applied                                                     |
| Synthetic live generation                               | Five structurally accepted questions in 14.34 seconds: 10-second primary timeout, then 4.344-second Groq completion     |
| Local runtime                                           | API `/health/live` returned 200; Redis reported one quiz wake subscriber after worker restart                           |

The live benchmark used inline synthetic teaching facts, no private course material and no saved user job. It excludes source retrieval, queue pickup and database writes and is not a latency guarantee. Immediate notification handling is covered by a deterministic worker test; no live enqueue timing is claimed. A timing-sensitive unrelated chat test failed during concurrent build activity; the sequential full API run passed. Hosted question quality and complete authenticated course generation remain separate checks.

## Worker outage and matrix generation follow-up

The local worker exited after an OS socket abort and Redis DNS failure; the API stayed online, leaving a new 15-question matrix quiz queued with zero attempts. The user explicitly approved restarting this worker and processing that quiz with the configured Google/Groq providers and enabled OpenRouter fallback. Saved failed/cancelled requests were not reset globally.

- Main-worker transport errors now trigger bounded reconnect delays of 5 to 30 seconds. Startup cancels the old notification listener before replacing it. Cancellation and programming errors still propagate.
- Deferred API dispatch logs a safe error category rather than silently swallowing the failure.
- A live synthetic probe identified matrix responses with incorrect option identifiers. The generation prompt now provides the exact existing five-statement shape and empty unused key fields. A second live synthetic probe returned five accepted matrix questions, each with five options. No question-type merge or scoring change was made.
- Regression verification: 681 offline API tests passed; 43 service-dependent tests skipped. Ruff lint and formatting passed. Transport reconnect, shutdown/error propagation and the explicit matrix prompt have dedicated regressions.
- Processing the approved request also encountered provider HTTP 429 rate limiting; saved questions are retained between retries.
- Live outcome verified: the approved 15-question matrix request reached `completed` with exactly 15 saved questions. Fourteen saved questions survived the capacity failure; retry after cooldown generated only the missing question. Worker log confirmed completion at 12:14:21 local time. The repaired worker remains running with an active quiz notification subscription.

Notion sync pending: Session / Change Log - Summary: Recover worker after Redis outages and correct matrix generation shape. Date: 2026-10-27. Area: Quiz / Worker / AI. Files: workers/runner.py, workers/quiz.py, quiz_generation.py, test_quiz.py and this record. Verified: regression suite and synthetic live probes above. Decision: Recover transient transport failures while preserving durable jobs and strict structural validation; alternatives: manual-only restart or accepting malformed matrix questions. Roadmap: Worker recovery and matrix generation fix implemented; live request outcome recorded separately.

## Notion sync pending

No Notion connector is available; these entries have not been posted.

| Gallery                    | Entry                                                                                                                                                                                                                                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session / Change Log       | Summary: Remove second AI review and accelerate quiz generation, pickup and reuse. Date: 2026-10-27. Area: Quiz / API / Worker / Web. Files: quiz generation, bank, service, retry, models, worker pipeline/runner, shared contracts, taking/workspace, tests and docs. Verified: checks above only. |
| Decision Log               | Rationale: Reduce repeated inference and waiting while preserving structural checks and server authority. Alternatives: serial generation, repeated semantic review, constant Redis polling and early timed starts.                                                                                  |
| Product Roadmap & Features | Quiz generation performance: implemented and locally verified; hosted end-to-end quality and production release remain open.                                                                                                                                                                         |
| Knowledge Base             | Main worker uses durable ARQ delivery with notification acceleration; questions can be reused only after current source/tenant eligibility checks.                                                                                                                                                   |
