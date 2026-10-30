# Gemma quiz deadlines and diagnosis — 28 October 2026

The saved interactive request repeatedly deferred while the worker was healthy. Google server failures and local 10/15-second batch timeouts were combined with shared 120-second cooldowns. Logs did not retain the upstream status for converted capacity errors.

## Changes

- Both configured Google models receive a 30-second attempt allowance for quiz generation/grading. The completion deadline is 90 seconds; the generation worker retains its 120-second work bound and grading retains its existing lease. Provider order, quotas, concurrency, privacy and strict local validation remain unchanged.
- Quiz calls explicitly request Gemma 4 `thinking_level=minimal`. This option is sent only for Gemma 4 and only when requested; other routing callers retain their existing behavior. Google's [Gemma API documentation](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api) identifies minimal as disabling thinking. This avoids spending a compact quiz response budget on unspecified thinking behavior; it is not evidence that every previous failure was caused by thinking.
- A local timeout no longer sets a provider-wide Redis cooldown. Quiz retries remain bounded by the existing per-model 60-second circuit. HTTP 429 and server failures still honor shared backoff and retry headers. No usage counters or cooldown keys were manually cleared.
- Upstream failures log provider/model, numeric HTTP status, exception type and elapsed time before conversion to a durable deferral. Quiz logs distinguish the deferral reason per model. No keys, prompts, answers or raw provider error bodies are logged.
- Returned Google usage is reconciled before rejecting an incomplete response. Incomplete output still fails validation; unknown usage from failed requests remains conservatively reserved.

## Verification

750 API tests passed, 61 service-dependent tests skipped. Changed Python lint and format passed. Regressions cover explicit Gemma-only thinking configuration, unchanged other callers, 30-second attempt settings, local timeout isolation, sanitized HTTP 503 logging/backoff and usage accounting for truncated output. No frontend changes in this correction; the web build passed in the preceding capacity fix.

A Google-only synthetic three-question probe was admitted to neither model because existing shared cooldowns remained active. The idle local worker was restarted with the fix and the absent local API restarted; no active grading request was present. Live outcome will be recorded below.

## Live outcome

With the corrected worker, both models returned HTTP 500 on the saved request; numeric statuses are now visible. Temporarily stopped the worker only after confirming no active generation, to isolate synthetic checks without competing retries. After the existing cooldown expired naturally, secondary Gemma completed a tiny minimal-thinking request in 6.66 seconds (5 input tokens, 2 output tokens). This demonstrates inference access, not batch reliability.

The actual Google-only three-question synthetic generation path then returned HTTP 500 from primary Gemma after 3.64 seconds and HTTP 504 from secondary Gemma after 29.63 seconds. No questions were accepted. Consequently the timeout/configuration correction is implemented, but live quiz completion is **not verified** and remains provider-blocked. The worker was restored after the isolated checks; saved requests, allowances and cooldowns were not reset.

Final API readiness was degraded: database/storage OK, chat/embeddings ready, Redis probe error. Queue connections worked during the probes; this does not certify overall service readiness. No hosted release or production reliability claim is made.

Files: quiz_generation.py, routing_provider.py, provider_capacity.py, test_quiz.py, test_routing_provider.py, test_provider_capacity.py and canonical plan links.

## Notion synchronization pending

No Notion connector is available; entries have not been posted.

- Session / Change Log: Correct Gemma quiz deadlines, thinking configuration, timeout isolation and error visibility. Date: 2026-10-28. Area: Quiz / Google / Capacity. Files: above. Verified: local tests above; live evidence separately below.
- Decision Log: Allow bounded complete responses while retaining provider limits; distinguish client deadlines from provider-wide quota failures. Alternatives: increase quotas without evidence, clear shared cooldowns, or retry indefinitely.
- Product Roadmap & Features: Gemma handling corrected and locally tested; live completion remains under verification.
- Knowledge Base: No stack or core architecture change.
