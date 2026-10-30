# Quiz capacity and Google diagnosis - 27 October 2026

Branch: `feat/quiz-system`. User approved the efficiency improvements after the 15-question matrix incident. The user-facing result layout and scoring rules are unchanged.

## Google findings

The configured primary remains `gemma-4-31b-it`. Google returned HTTP 500, HTTP 504 and local deadline timeouts, separately from Groq HTTP 429 responses. Synthetic checks used no private course content:

| Probe                                                  | Result                                                    |
| ------------------------------------------------------ | --------------------------------------------------------- |
| Tiny prompt, string system instruction                 | Timed out around 15 seconds                               |
| Tiny prompt, explicit system role                      | HTTP 500 after 1.84 seconds                               |
| Tiny prompt, no system instruction/tools               | HTTP 504 after 15.77 seconds                              |
| Tiny prompt, no system instruction, 45-second deadline | HTTP 500 `Internal error encountered.` after 2.83 seconds |

These observations establish failures at Google's hosted endpoint and show that increasing the client timeout alone does not resolve the 500 response. They do not identify Google's internal cause, prove a platform-wide outage, or prove an account/billing problem. Google describes [500 as an internal error and 504 as deadline expiry](https://ai.google.dev/gemini-api/docs/generate-content/api-errors). No provider/model migration or paid tier was enabled.

## Changes

- `provider_capacity.py` applies shared Redis rolling-minute token/request admission and daily ceilings to structured provider calls and the common Google/Groq/OpenRouter chat stream adapters. The ledger stores counts and hashed scope identifiers, never prompts, responses or API keys. Limits are per configured provider/model scope, shared across API and worker processes.
- Actual response usage reconciles conservative input/output reservations. Rate-limit headers lower effective ceilings and constrain remaining capacity until provider reset. HTTP 429 follows provider retry/reset headers; HTTP 5xx and deadline failures share a cooldown across processes. There is no unbudgeted provider call when the capacity store is unavailable.
- Application ceilings are configurable through `AI_PROVIDER_BUDGETS`; they are not claims about the account's actual quota. Keep `AI_CAPACITY_SCOPE` consistent for processes sharing an account/model. Independent SDK paths outside the common structured/text adapters are not covered by this ledger.
- `quiz_wire.py` uses a compact provider-only contract and integer source references. The server reconstructs full UUID-backed questions and runs the existing structural/scoring/source-ID checks. Only four bounded evidence passages and eight short previous prompts are sent. Quiz batches use compatible JSON mode because Groq rejected the compact union schema in strict mode; local validation remains strict.
- A malformed question no longer discards its valid siblings. Unknown references, invalid keys, invalid envelopes and entirely invalid batches remain rejected. Per-batch yield, actual/reserved tokens, provider capacity and latency are logged without question content.
- `quiz_flight.py` coalesces matching university/level/course/topic/difficulty/format requests. Followers defer durably and then reuse eligible inventory; they do not independently repeat the leader's generation. Token-checked lease release cannot delete a successor's lock.
- Capacity and inventory waits preserve questions, leave the job queued with a retry deadline and do not spend generation attempts. Untimed quizzes may start from saved questions during those waits. Timed starts and submission still require the full set.
- Bank lookup deduplicates copied inventory before sampling and can reuse structurally validated questions from active jobs after current source eligibility checks. Replenishment avoids existing inventory and targets 30 distinct questions in batches of at most ten, with one background job globally and interactive work prioritized.
- Newly ingested courses can schedule baseline objective inventory. Idle periodic warming replenishes recently requested scopes. Warming is best-effort and cannot invalidate ingestion. Source withdrawal, changed content and university/level restrictions still prevent reuse. No schema migration was needed.

## Verification

- Offline API suite: 699 passed; 48 service-dependent tests skipped. A timing-sensitive unrelated chat test flaked during an earlier concurrent run; the final complete run passed.
- Real isolated Redis/PostgreSQL checks cover atomic admission, usage reconciliation, provider-header limits/reset, cooldowns, lock ownership, same-scope coalescing, preserved progress/attempt budgets and hidden ingestion warming. Only designated synthetic test state is used.
- Final real store run: 30 tests passed. Monorepo lint, TypeScript and Next.js production build passed; Python lint/formatting passed. The local API and main worker were restarted with these changes; `/health/live` returned 200 and Redis reported one quiz notification subscriber. No failed/cancelled request was reset during activation.
- Live synthetic generation accepted all five formats through the shared gate. Warm fallback calls took approximately 3.2-4.3 seconds for one-question probes. The cold first request included Google's failure delay.
- A full synthetic five-question matrix batch used 464 prompt and 606 completion tokens (1,070 total). An earlier five-question matrix probe with the previous contract used 1,314 prompt and 1,398 completion tokens (2,712 total). This is roughly 60% fewer tokens in those samples, not a production latency or quality guarantee. The new full batch still took 16 seconds including Google's first failure and local network overhead.
- No new private course-generation replay was used for this efficiency comparison. Existing provider privacy gates remain in effect.

Run the real store tests with designated `CAPACITY_TEST_REDIS_URL` and loopback `QUIZ_TEST_DATABASE_URL`, selecting `tests/test_provider_capacity.py tests/test_quiz_database.py --allow-live-services`. `tooling/prepare-quiz-test-db.py --database pansgpt_quiz_capacity_test` creates only an empty isolated local baseline. Disposable worker CI now includes these checks.

## Notion sync pending

No Notion connector is available; entries are prepared here and have not been posted.

| Gallery                    | Entry                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session / Change Log       | Summary: Implement shared provider capacity, compact generation, partial-batch retention, request coalescing and proactive scoped inventory. Date: 2026-10-27. Area: Quiz / AI / Worker. Files: capacity/wire/flight/bank/generation/service engines, common transports, worker inventory/settings/tasks/lifecycle, tests, CI and docs. Verified: checks above. |
| Decision Log               | Rationale: Reuse eligible questions and schedule fresh inference within actual capacity. Alternatives: unlimited concurrent generation, fixed blind retry delays, repeated full schemas, whole-batch rejection and manual-only warming.                                                                                                                         |
| Product Roadmap & Features | Quiz capacity controls implemented and locally verified; production load/capacity certification remains open.                                                                                                                                                                                                                                                   |
| Knowledge Base             | Structured/text provider transports share a Redis capacity ledger; scoped inventory generation coalesces and warms in the background. Provider waits are durable deferrals, not malformed-generation attempts.                                                                                                                                                  |

## Malformed fallback responses must not inherit a primary cooldown

A real ten-question written-answer request saved five questions, then deferred for 114 seconds. Worker logs showed a Google timeout/cooldown and a Groq response that failed validation. The completion loop previously selected an accumulated Google capacity wait after a responding fallback returned malformed content. This incorrectly converted a schema failure into a job-wide capacity delay.

Changed completion handling to distinguish returned quiz-content validation/JSON failures from transport failures. If an eligible fallback returns malformed quiz content, the existing bounded generation waves may retry through the shared capacity admission rather than waiting for another provider's cooldown. Genuine all-provider capacity denial still uses the earliest valid retry. Validation remains strict; no quota bypass, provider reordering or model switch.

Added sanitized diagnostics containing only allowlisted schema-path segments, numeric indices, validation stage and error codes. Model text, evidence, inputs, error messages and unknown model-provided field names are excluded. The earlier batch's precise failing field cannot be recovered from the old logs. A single live synthetic written-answer probe accepted five of five questions in approximately 4.5 seconds at the completion layer; this does not establish the earlier schema failure or guarantee hosted latency. Quiz requests use JSON mode with compact shape instructions, rather than constrained schema output; corrected a misleading inline comment that claimed the full schema was sent.

Verification: Python lint passed; 69 focused quiz/wire/capacity tests passed and two designated live-store tests skipped. New cases cover malformed JSON and invalid schemas under a primary cooldown, a successful bounded retry, genuine all-provider deferral, transport-validation separation and diagnostic privacy.

Notion sync pending (connector unavailable): Session / Change Log - Summary: Avoid inheriting primary cooldown after a responding quiz fallback returns malformed output. Date: 2026-10-27. Area: Quiz / AI / Retry. Files: quiz_generation.py, test_quiz.py and this log. Verified: checks above. Decision Log - Rationale: Keep content validation separate from capacity admission while preserving bounded retries and actual limits. Alternative: globally shorten cooldowns or disable admission (rejected). Product Roadmap & Features - Quiz false-capacity deferral corrected locally. Knowledge Base unchanged: existing provider capacity and bounded retry patterns remain.

Activation: verified no actively leased quiz generation, restarted the local worker with the existing root environment, and confirmed database pool initialization plus quiz_wake_listening. No private failed batch was replayed to diagnose its fields.
