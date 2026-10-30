# Quiz recovery audit — 29 October 2026

The user's request is reliable complete quizzes, not another successful mock-only demonstration. Acceptance distinguishes unit contracts, actual database lifecycle, browser fixtures, provider compatibility and the saved live request. This audit does not promise perfect model output or external uptime.

## Evidence

- The prior written quiz completed with ten questions. The current request is a ten-question statement matrix, initially at zero saved questions, later two.
- The first inspection showed only 7,105 Groq tokens accounted today, so the initial wait was not daily exhaustion. Later inspection showed 198,053 for primary Groq, 409,558 for primary Google and 496,419 for secondary Google. Failed-call reservations without usage remain estimates, not proven billed tokens. The old worker continued retrying without new quiz creation.
- Mixed rejected-content and capacity-denied batches bypassed adaptive shrinking. Capacity deferral also refunded the delivery attempt, allowing this pattern to run repeatedly. The configured secondary Groq model was absent from the quiz provider list.

## Corrections and contract

- Safe rejection codes identify matrix correction/count/evidence failures, positional explanations and duplicates without logging questions or source material. Validation requirements are unchanged.
- Invalid siblings trigger smaller batches even when another sibling is deferred. Invalid work with no progress cannot be disguised as pure capacity waiting and refund its failed attempt.
- Internal `QuizTaskConfig.capacity_waits` is bounded at eight. Eight capacity deferrals, or an indicated wait of fifteen minutes or longer, stop automatic generation while retaining the quiz/questions. Owner-authorized explicit retry clears this internal wait counter. Pure deferral still does not consume the separate three-failure delivery budget. The transition is atomic and lease/cancellation guarded. Public builder fields, database schema and answer visibility are unchanged.
- The configured unique secondary Groq model is tried after primary Groq and before OpenRouter. Every call retains privacy checks, model-scoped quota admission, schema/evidence checks and provider order. Completion bound becomes 105 seconds to accommodate the extra fallback; the worker's 120-second work bound remains unchanged.
- Shared cooldowns preserve rate-limit versus server-failure reason. The preparation UI distinguishes service recovery, connection trouble and shared capacity, and no longer implies personal quiz usage caused every wait.

## Verification

- Offline API: 755 passed, 65 service-dependent skipped. An earlier concurrent run hit an unrelated 20ms chat deadline test; the full rerun passed.
- Real isolated PostgreSQL: 35 passed, one Redis-only test skipped; three focused retry-bound tests passed, including mixed failures stopping after three deliveries, preserved questions, no further scheduling after exhaustion and explicit retry reset. Fixtures use only loopback synthetic data.
- Browser: all 32 quiz journeys passed, including taking/review, saved answers, grading retry, cancellation, complete-set start gates and themes/mobile. These use synthetic API fixtures.
- Live synthetic secondary-Groq matrix: one requested, one accepted, zero rejected; normal capacity accounting recorded 1,422 tokens. No private course text was used for this probe.
- Local API and worker were restarted after verifying generation/grading idle. The saved live request continues through its normal authorized worker path; final outcome recorded below.

Files: quiz_generation.py, quiz_wire.py, provider_capacity.py, quiz_retry.py, quiz models, workers/quiz.py and quiz_pipeline.py, preparation component, API/database/browser regression tests and canonical docs. No migration or credentials changed.

## Notion synchronization pending

No Notion connector is available; entries have not been posted.

- Session / Change Log: Correct mixed quiz failures, bound automatic waiting, expose safe rejection reasons and use configured Groq fallback. Date: 2026-10-29. Area: Quiz / Reliability. Files: above. Verified: evidence above; live completion separately below.
- Decision Log: Preserve validation and saved progress while preventing indefinite retry spending. Alternatives: relax matrix correctness, erase usage counters, retry forever or add unconfigured providers.
- Product Roadmap & Features: Recovery changes locally verified; live completion and full hosted certification remain separate gates.
- Knowledge Base: Worker retries now have separate bounded capacity-wait and content-failure budgets; explicit owner retry resets the wait budget. No stack change.

## 30 October: worker admission and matrix generation

- Reproduced ARQ pickup admission leaking on Redis disconnects: five failing tests before the fix. The recovery loop reused the worker after each disconnect, so leaked counters/semaphore slots could eventually prevent pickup indefinitely. `RecoveringWorker.start_jobs` now releases admission on every unsuccessful pickup, including cancellation, and transfers release ownership to the task only after starting it. Redis claims and concurrency limits remain intact. Nine pickup regressions pass, including repeated disconnects followed by successful work.
- Live logs showed JSON success could contain zero usable questions. Quality validation previously ran after provider selection had already returned. It now participates in provider selection: zero usable questions try the next eligible configured model; usable siblings are preserved immediately. Rejections still consume the bounded invalid-content budget rather than masquerading as pure capacity waits.
- The matrix wire format redundantly asked the model for false statements, their true counterparts, edit instructions and matching answer booleans. Live failures included disagreement between these fields. The private `MatrixDraftBatch` now supplies five true claims and two indexed term substitutions. The backend constructs the false statements, answer booleans and corrected facts. Existing expansion still checks distinct false indices, exactly one substitution, source terms, disallowed direction/negation edits and the full public question contract. Public DTOs, stored question shape, shuffling and answer visibility are unchanged. This is deterministic construction, not a second AI review.
- Live synthetic Groq primary probe: requested two matrix questions, accepted two, 2,023 accounted tokens. Earlier two-question probes using the redundant format were rejected. This is limited compatibility evidence, not a statistical quality guarantee.
- Final API suite after these changes: **774 passed, 65 service-dependent skipped**. Earlier full run hit the existing 20ms chat cancellation test; subsequent full runs passed. API Ruff and changed-file formatting pass. Real isolated PostgreSQL lifecycle/retry suite: **36 passed, one Redis-only test skipped**. Two additional browser checks for recovery/connection messages passed; previous 32 browser journeys and production build are recorded above.
- The local worker was restarted only after confirming active generation was idle. The saved request retains its original two questions and was explicitly retried through the existing owner-scoped service. Final live outcome is recorded separately below.

Notion additions pending the unavailable connector: Session / Change Log (2026-10-30, Quiz / Worker / Providers, files `workers/runner.py`, `quiz_generation.py`, `quiz_wire.py`, their tests and canonical docs; verified by the checks above). Decision Log: compile redundant matrix values on the backend and validate before provider success; alternatives were weaker checks or additional model review/calls. Product Roadmap: local regression gates passed, live and hosted completion remain separate. Knowledge Base: private matrix drafts and worker admission ownership are the updated core patterns.

### Saved-request outcome and PR gate

The latest real matrix retry stopped after three failed deliveries with **4 of 10 questions preserved** (up from two). It is not ready to start. Remaining failures include terms absent from cited evidence, upstream structured-output rejection and Google timeout/server errors. Synthetic success and passing regressions do not certify live completion or launch readiness. Further evidence-matching diagnostics and a complete hosted journey remain open.

Workspace lint and all six TypeScript typecheck tasks pass. Both local frontend and backend readiness endpoints return HTTP 200. CI now includes the real database retry-bound tests alongside the lifecycle suite. Temporary logs and the isolated PostgreSQL cluster are excluded from version control. This branch is being submitted as a draft PR with the live limitation explicit; no deployment is included.
