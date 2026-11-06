# Quiz queue recovery - 6 November 2026

PansGPT is pre-launch. This incident concerns a development account and its saved
quiz request, not production student traffic.

The five-question objective request stayed queued at zero saved questions and
zero attempts. Courses, history and job polling returned 200, but no local main
worker process or Redis worker-health key existed. Read-only Redis probes measured
3,047 ms for the cold connection and 187 ms for the next ping. The API's previous
three-second total included connection setup, database reconciliation and Redis
delivery; the user's logs also contained an unclosed Pipeline warning.

## Recovery and correction

- Started the missing local worker using the existing `workers.runner` entry
  point, with the same API-local environment. Kept automatic inventory disabled.
- The original request completed with all five questions saved and status
  `completed` / `Ready to begin`. It needed no replacement request or new attempt.
  One worker delivery timed out; the next completed with five bank hits and an
  11,531 ms pipeline duration. This proves delivery and reusable-question assembly,
  not a new provider-generated set, academic correctness or completed quiz taking.
- Immediate API handoff now owns an `ArqRedis` client before any network await,
  uses five-second Redis connect/read limits and a 15-second dispatch deadline,
  and closes the client under a separate five-second cleanup budget. This avoids
  the old cold-connect deadline and makes cleanup independent of an expired
  dispatch deadline. Worker queue identity, leases, source/privacy validation,
  grading authority, retry limits and durable reconciliation are unchanged.
- Documented that separate Next.js/Uvicorn processes need `pnpm dev:worker`;
  `pnpm dev` remains the combined startup command. No hosted deployment or schema
  migration was performed. No credentials were changed or committed.

## Verification

- Existing original request: read-only database checks confirmed five saved
  questions and completed status. Cancelled older request remained cancelled.
- Final focused offline Quiz/worker regressions: 119 passed, three skipped,
  including eight producer checks for cold handoff, failure, cancellation,
  independent cleanup, missing Redis and invalid client configuration.
- Changed Python files: Ruff lint and formatting passed.
- Real producer-client probe: TLS ping succeeded in 3,859 ms. TLS shutdown hit
  the five-second cleanup bound on this Windows/Upstash connection; this remains
  an observed transport limitation. The API handles/logs bounded cleanup failure
  rather than failing an already-saved request. The earlier Pipeline warning was
  not reproduced in a new user quiz, so its complete elimination is not claimed.
- In-browser completion and a newly generated provider set were not exercised.

## Engineering / Notion handoff

| Gallery                    | Entry                                                                                                                                                                                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session / Change Log       | 2026-11-06; restore local Quiz worker and harden API queue delivery; Area: Quiz / worker; Files: `workers/quiz.py`, dispatch tests, API README, canonical plan links and this record; Verified: runtime/read-only evidence and tests above.                     |
| Decision Log               | Keep the separate durable worker and recover saved requests. Allow bounded cold connections and independently close owned clients. Alternatives: create duplicate quizzes, retry indefinitely, bypass validation, or run inference in web/API request handlers. |
| Product Roadmap & Features | Queue incident recovered locally; dispatch correction has passed focused offline checks and a real TLS connection probe. TLS close limitation, hosted worker availability, provider quality and full taking journeys remain separate gates.                     |

Notion synchronization is pending: no connector is available. No Knowledge Base
change is needed for this routine operational/connection fix.
