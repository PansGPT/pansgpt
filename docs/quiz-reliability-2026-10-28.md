# Quiz reliability hardening - 28 October 2026

User direction: make the complete quiz flow reliable, following intermittent generation failures and long queue waits. This change hardens the existing contracts; it does not promise external-provider uptime or certify production.

## Changes

- Compact, format-specific strict schemas are supplied on supported Groq models. The schema uses closed objects, required properties, concrete answer types, exact option/key lengths and bounded integer evidence references. It avoids keyed maps and provider-incompatible propertyNames. Other eligible models retain JSON mode with the same authoritative local validation. No provider order, privacy gate or model configuration changed.
- Provider admission now accounts for the schema when it is actually sent. Google/unsupported Groq/OpenRouter requests do not reserve tokens for an unsent schema. The additional input cost is explicitly included rather than silently exceeding the shared budget.
- A live synthetic matrix probe reproduced HTTP 400 json_validate_failed: the completion ran out of tokens before producing the second correction. Matrix output now allows 800 tokens per question plus 256 overhead (bounded at 4000) and starts in batches of two. Other formats retain their existing budget and normal five-question batches. This is an output ceiling, not a claim that each call spends the ceiling.
- A provider-reported structured-output rejection is retryable malformed content, rather than evidence that the model is unavailable. Strict local expansion still rejects bad answer shapes, unsupported sources, duplicates and invalid near-miss corrections.
- Generation reduces batch size after invalid or duplicate output and grows back after successful batches. Healthy 25-question quizzes retain five five-question calls. Matrix wave counts accommodate the smaller initial batch; the overall 120-second work deadline remains bounded. Saved questions survive a deferred or unsuccessful delivery.
- Capacity deferral schedules a distinct durable ARQ delivery after the retry deadline. It does not publish a premature immediate wake. Database reconciliation remains the backup if Redis delivery fails or the process stops between persistence and enqueue. The existing lease and duplicate-delivery checks remain authoritative. Normal queue polling can still add pickup latency.
- The earlier false cooldown correction remains: a responding fallback with malformed quiz content does not inherit an unrelated primary-provider capacity wait. Genuine all-provider quota denial still defers within the actual limits.

## Verification

- Full offline API suite: 729 passed, 51 service-dependent tests skipped. Python lint and formatting passed for all changed Python files.
- Real PostgreSQL 18 integration: 22 passed, one Redis-dependent test skipped. Used a new isolated loopback cluster and applied the existing versioned quiz migrations to an empty synthetic baseline. Tests cover transaction/ownership boundaries, immutable grading retry, saved answer recovery, cancellation, expired leases, capacity waits and adaptive batching. Healthy 25-question generation and recovery from an entirely invalid first wave are explicit cases.
- Quiz browser journeys: 24 passed with synthetic API fixtures, including all formats, preparation transitions, early untimed start, timed start restrictions, server deadlines, answer restoration, grading retry, sharing and mobile/theme checks.
- Live Groq probes used synthetic teaching passages only, no saved quizzes or student material. Single-question strict output passed for objective, multi-select, true/false, written and matrix formats. The corrected matrix probe accepted one question in about 3.8 seconds; a strict five-question written batch accepted all five in about 2.1 seconds. These exclude source retrieval, queue pickup and database writes. They are compatibility observations, not an A/B latency or token-cost benchmark and not a guarantee of clinical/academic correctness.
- No migration, hosted deployment or replay of a private failed batch was performed. Full authenticated hosted/provider-outage certification remains open. Actual rate limits can still defer work; failed grading preserves the immutable submission for explicit retry instead of inventing a score.

## Files

quiz_wire.py, quiz_generation.py, routing_provider.py, workers/quiz.py, workers/quiz_pipeline.py; quiz/wire/transport/database regression tests; .gitignore for only the isolated local test cluster; canonical plan links and this log.

## Notion synchronization pending

No Notion connector is available. Entries have not been posted.

| Gallery                    | Entry                                                                                                                                                                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session / Change Log       | Summary: Harden quiz structured output, matrix token sizing, adaptive batches and durable retries. Date: 2026-10-28. Area: Quiz / API / Worker. Files: listed above. Verified: checks above.                                        |
| Decision Log               | Rationale: Prevent malformed/truncated batches and recover within actual shared provider limits. Alternatives: disable admission, accept malformed questions, force higher-paid quotas, or retry the same large shape indefinitely. |
| Product Roadmap & Features | Quiz reliability hardening implemented and locally verified; hosted reliability and production release gates remain open.                                                                                                           |

No stack or core architectural pattern changed; Knowledge Base update is not required.

Local activation: previous development sessions had ended. Started the frontend, FastAPI and the main worker with the configured root environment. Worker initialized the database pool and reported quiz_wake_listening. FastAPI full readiness returned HTTP 200 with database/Redis/storage OK and chat/embeddings ready. The isolated PostgreSQL verification cluster was stopped after its tests.

## Gemma routing diagnosis and correction

The user questioned why the previous app worked with Gemma alone. The documented ../pansgpt-eli reference is absent and the nearby Desktop/eli directory is empty, so no claim is made about the legacy implementation or which model it used.

Current configured credentials successfully retrieved gemma-4-31b-it metadata. A tiny secondary gemma-4-26b-a4b-it direct REST probe returned HTTP 200 in about 2.3 seconds, and the same secondary returned text through the normal app transport in about 3.7 seconds. A primary Gemma tiny normal-transport request also succeeded, but took about 11.1 seconds, exceeding the quiz engine's old 10-second outer cutoff. Earlier 500/504 responses and timeouts remain recorded observations, not proof that Gemma never works or a platform-wide outage. Official model/request reference: https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api

The quiz completion loop previously skipped GEMINI_SECONDARY_MODEL. It now tries unique configured primary and secondary Google models before Groq and OpenRouter, preserving privacy, capacity, schema/source validation and the configured primary. Primary timeout is bounded at 15 seconds; secondary at 10 seconds, Groq at 12 and OpenRouter at 6. Total completion deadline increases from 30 to 45 seconds to accommodate the additional fallback. The worker's existing overall work deadline remains 120 seconds. This trades a larger worst-case failover allowance for a genuine second Gemma path; it is not a provider uptime guarantee.

Live synthetic Gemma-only quiz verification, with Groq/OpenRouter disabled only inside the probe process: the primary failed and the secondary generated one accepted written-answer question; total about 6.9 seconds. No uploaded files or saved quiz records were used. Full API regression verification: 731 passed, 51 service-dependent tests skipped; Python lint/format passed. New tests verify secondary Google precedes external fallback and duplicate configured model names are called only once. Worker was checked idle before activation.

Notion sync pending: Session / Change Log - Summary: Restore configured secondary Gemma quiz failover and correct premature primary timeout. Date: 2026-10-28. Area: Quiz / Google routing. Files: quiz_generation.py, test_quiz.py and this log. Verified: tests and synthetic checks above. Decision Log - Rationale: Use the existing configured Gemma options before external fallback; alternative: assume Google is always unavailable or silently replace the configured primary. Roadmap: Gemma quiz route corrected and locally verified; hosted latency/availability certification remains open. No Knowledge Base change required.

## Subject-focused question instructions

User rejected metadata trivia and explicitly requested a prompt-only correction without extra runtime checks or review calls. Updated the existing generation instructions to assess substantive scientific concepts, mechanisms, physiological processes, drug actions/effects, classification, comparisons and evidence-supported applications. Explicitly exclude lecturer/author names, lecture/book titles, departments, institutions and page/slide locations. Ignore cover/contents/credit/header/footer information as assessment material. Questions must stand on their subject knowledge, and distractors must be plausible subject-matter alternatives. Difficulty distinguishes core facts, relationships/mechanisms and applications/comparisons. Existing evidence grounding, format instructions and scoring are retained.

No additional model call, validation pass, retrieval filter or runtime quality gate was added. Existing saved quizzes and reusable inventory were not rewritten or deleted. This changes instructions for newly generated questions, not a guarantee that every future output will be pedagogically ideal.

Verification: Python lint and 50 existing quiz tests passed. One live synthetic probe mixed lecturer/department/page metadata with cardiovascular teaching facts. All three accepted written questions tested pharmacology: arteriolar vasodilator effects, beta-1 blocker effects on cardiac output, and venous dilation/preload. No uploaded or student material was replayed. Worker was idle before applying the updated instructions.

Notion sync pending (connector unavailable): Session / Change Log - Summary: Make quiz generation test course knowledge rather than document metadata. Date: 2026-10-28. Area: Quiz / Prompt quality. Files: quiz_generation.py and this log. Verified: tests and mixed-content synthetic probe above. Decision Log - Rationale: Improve the existing generation instructions without adding latency-producing review stages, as requested. Alternative: add a second review model, source filters or rejection gates (not implemented). Product Roadmap & Features - Subject-focused generation instructions updated locally. No Knowledge Base update required.

## Written-grading provider schema rejection

The student reported a frozen submitted attempt with grading_failed. Read-only status inspection confirmed a ten-question written quiz with five saved answers; no answer text or reference material was printed or replayed. API logs showed primary Google failure, secondary Google timeout and Groq HTTP 400 for WrittenGrades. A synthetic one-answer reproduction isolated the provider error: the score property could not include both integer and number for the enum containing 0.0, 0.5 and 1.0. This was a provider-schema compatibility defect, not evidence of invalid student answers.

Added provider-only WireWrittenGrades with integer marks 0/1/2 and concise feedback. The backend maps these back to the unchanged authoritative 0/0.5/1 score contract after confirming every requested UUID occurs exactly once. Strict integer bounds reject booleans, fractions, strings and out-of-range marks. Public DTOs, immutable submitted answers, grading leases, grading_failed recovery and score persistence remain unchanged. Output reservation now scales with the number of written answers instead of always reserving 4000 output tokens. No extra model call or review stage was added.

Verification: the synthetic Groq reproduction now succeeds and returns a public score of 1.0 for the correct paraphrase. Full API suite: 741 passed, 56 service-dependent tests skipped. Python lint and formatting passed for quiz_generation.py, quiz_wire.py and test_quiz.py. Nine new regressions cover the three score conversions, invalid marks and proportional output reservation. Checked no active grading request before restarting the local API. The real submitted attempt was not force-regraded; the authenticated Retry grading action resumes its saved snapshot.

Notion sync pending (connector unavailable): Session / Change Log - Summary: Correct Groq written-grading schema while preserving submitted answers and public scoring. Date: 2026-10-28. Area: Quiz / Grading / Provider compatibility. Files: quiz_generation.py, quiz_wire.py, test_quiz.py and this log. Verified: tests and synthetic probe above. Decision Log - Rationale: Keep compact integer marks provider-only and map them to authoritative scores; alternative: disable strict output or silently assign grades on provider failure. Roadmap: Written grading schema fixed locally; authenticated retry and hosted verification remain separate. No Knowledge Base change required.
