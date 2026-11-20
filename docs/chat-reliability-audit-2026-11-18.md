# Chat reliability audit — 18 November 2026

> Follow-up: [extended systems audit](chat-system-audit-2026-11-18.md) adds
> explicit rate-limit, startup dependency and resource-isolation verification.
> The regression totals below describe this earlier scope, not every AI subsystem.

User scope: investigate repeated slow/failure notices, improve diagnostic logs,
test intent accuracy, latency, conversation continuity and voice, and keep answers
running when their conversation or mobile sheet is off screen. Preserve the
uncommitted rich-output work and existing user interface patterns.

Workspace: `feature/settings-storage-privacy`; previous rich-output drafts were
preserved. These are local changes, not a deployment or completed hosted release.

## Test and implementation contract

Separate deterministic fault injection, browser interaction, real database
authorization, and opt-in live synthetic provider evaluations. Never present
fixture replies as model-quality evidence. Live probes use configured free-tier
providers and existing privacy/capacity gates; no real chat or patient data.

Coverage matrix: request validation/auth/ownership; conversation creation/history;
normal/study/home sheets; send/edit/regenerate/branch/retry/stop; upload/image/voice;
intent/evidence/action selection; routing/generation/tool/persistence failures;
offline/reconnect/partial streams; hidden/switch/reopen; account changes; duplicate
requests; slow/timeout/quota/circuit failures; public progress; output rendering;
long selected history; colloquial/ambiguous/multilingual follow-ups; identity,
correction and conversational follow-through; prompt injection and privacy.

Confirmed initial findings:

1. Hiding the hook aborts its active request. Unmount aborts it again.
2. The API ties generation to transport and cancels its producer on disconnect.
3. The client slow timer uses a fixed 12-second gap and does not recognize every
   meaningful progress event.
4. Stream HTTP 200 does not identify inference success. Existing stage logs lack
   a shared request/run correlation and an end-to-end outcome/timing summary.

Contracts will preserve the existing POST streaming endpoint and add an owned
run snapshot and explicit cancellation endpoint. Generation must outlive the
visible subscriber, remain bounded by the server deadline, release/refund its
owned lease correctly, and be cancelled only by explicit Stop, authorization
cleanup or server shutdown. Reopening must recover current output or the final
saved answer without replaying inference. Generation on one API worker is not a
durable job across process termination; that release limitation must remain
explicit, with truthful interrupted/expired states rather than permanent busy UI.

Diagnostic fields: request/run/session IDs, phase, provider/model, attempt,
safe error category/status, retry/cooldown, elapsed phase/first-output/total times,
completion/persistence/cancellation outcome. Never log prompts, model reasoning,
answers, attachment text, API keys, auth headers or raw provider response bodies.
Keep simple student-facing copy; retain a support reference separately.

## Reproduced causes and corrections

| Finding                                                                               | Resulting behavior                                                 | Correction                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hiding/unmounting a chat aborted its fetch; disconnect cancelled the API producer     | Closing a sheet or changing conversation stopped the answer        | API-owned bounded runs; transport detach does not cancel inference. Existing streaming POST remains; owned GET `/sessions/{id}/run` and POST `/sessions/{id}/runs/{run_id}/cancel` add recovery and explicit Stop.              |
| A dropped connection left a saved question without a visible failure after reload     | Blank answer, missing Retry, or an ambiguous new send              | Save safe failure metadata on the owned question; restore failed placeholders and the original retry context. Read snapshots/history without automatically reposting the question.                                              |
| Completion could race lease release                                                   | A subsequent send appeared to find another response running        | Publish done after protected release/refund cleanup. Retain post-run title/telemetry tasks separately so they do not delay EOF.                                                                                                 |
| Shared capacity-store failures were retried across provider candidates                | Routing budget exhausted without inference                         | Stop that request on a shared admission outage; report the dependency reason and do not treat admission deferral as a broken model. No speculative RAG fallback.                                                                |
| Routing created new HTTP clients                                                      | Repeated connection/TLS setup                                      | Reuse bounded HTTPX pools per event loop for Groq/OpenRouter routing; close on application shutdown. Google SDK generation pooling is not implemented.                                                                          |
| Text generation could wait 25 seconds for its first packet                            | Long silent delays before fallback                                 | Ordinary text startup budget is now at most 10 seconds, with a short model startup cooldown. Tool-enabled turns retain their existing budget; actual tool packets reset the inter-packet clock.                                 |
| Tool argument streaming was invisible until complete                                  | Slow UI despite real upstream activity                             | Emit a constant, throttled generation-activity event without exposing tool arguments or reasoning. Recognize meaningful stream events in the slow timer. Idle streams still show the thinking-style slow status.                |
| Fixed output reservations could exceed a provider's free-tier TPM allowance           | Every generation candidate rejected an otherwise modest request    | Fit the output ceiling to the configured input-plus-output allowance. Preserve selected input; return an edit action when even the input plus minimum output cannot fit. Existing shared quota admission remains authoritative. |
| Empty or output-limited responses could look complete                                 | Empty saved answers or partial answers presented as success        | Reject empty completion before save/settlement. Recognize provider length/MAX_TOKENS termination as incomplete output rather than success. Preserve visible partial text and safe retry rules.                                  |
| Readiness ignored Redis when ingestion was disabled                                   | Health appeared ready while chat admission could not work          | Require/probe Redis when chat capacity admission needs it, independently of ingestion.                                                                                                                                          |
| Semantic router has a shorter selected-history window than generation                 | Earlier references could be mistaken for absent context            | Declare the presence of earlier selected history and allow semantic handoff to the larger selected context without inventing retrieval/tool requirements. No keyword routing was introduced.                                    |
| A live model claimed uploaded notes were missing despite server-confirmed attachments | Student was asked to upload an existing file again                 | Clarify that server context flags are authoritative and the downstream pipeline owns file contents. The follow-up handed off to course evidence correctly.                                                                      |
| A quick study plan produced 129 words despite requesting brief mode                   | The hard 120-word contract caused an unnecessary second generation | Keep the hard limit and target 60–90 words. A follow-up produced a complete 90-word answer on the fast path. No word- or phrase-based input routing was added.                                                                  |
| Dropping the oldest frame from a full subscriber queue could lose init/tool frames    | Client could lose canonical message IDs or a generated artifact    | Coalesce adjacent text while preserving control frames; saturating control-only streams reconnect through the owned snapshot without cancelling inference.                                                                      |

The background manager is bounded to four active runs per owner and 64 per API
worker, bounded subscriber queues, and short-lived completed snapshots. Owned
database session/document checks precede snapshot and cancellation access.
Cancellation compares the exact run ID; a stale Stop must not cancel a new run.
Snapshots exclude raw tool arguments/results and private reasoning.
Capacity is rechecked synchronously when a run starts, after asynchronous lease
preparation. A capacity race rejects without inference, refunds any reserved
credit and releases the prepared lease. Saturated text streams coalesce chunks rather than losing
canonical init IDs or tool frames.

## What the student sees

| Scenario                                                          | Handling and visible UI                                                                        | Assessment                                                                                                              |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Ordinary routing/provider/connection/timeout failure              | Simple response error row beside the failed answer; Retry when safe; partial text remains      | Appropriate. Detailed provider messages belong in diagnostics.                                                          |
| Slow response or bounded recovery in progress                     | Existing AI thinking/progress UI; slow/retrying text, without a failure row or dismiss control | Appropriate. Twelve seconds is still the client idle threshold; this audit did not hide genuine stalls by extending it. |
| Offline / attachment-count notice                                 | Compact notice above the composer; mobile copy is shorter; draft remains                       | Appropriate. Geometry and placement covered in browser tests.                                                           |
| Upload failure                                                    | Retain the local file; upload Retry above the composer, outside the input form                 | Appropriate. Does not submit a second AI turn.                                                                          |
| Missing/expired auth, denied access, deleted/foreign conversation | Sign-in/access/reopen guidance; no unauthorized history or run snapshot                        | Appropriate; API ownership tests and existing authorization contracts apply.                                            |
| Insufficient credits or configured usage limit                    | Usage/wait guidance, no blind response Retry                                                   | Appropriate; provider capacity is distinct from account credit.                                                         |
| Validation, oversized input/file, unsupported file                | Edit/change-file guidance                                                                      | Appropriate. The new oversized-context code asks for a shorter message or new chat.                                     |
| Generation starts a side-effecting tool and later fails           | Keep generated results; ask the student to review them; disable unsafe whole-request replay    | Appropriate. Never automatically rerun file creation after an ambiguous disconnect.                                     |
| Lost stream / reload / conversation switch                        | Read current run and recover partial/final output; no duplicate inference POST                 | Newly implemented and covered on desktop/mobile synthetic journeys.                                                     |
| Closing Home/Study sheet                                          | Accepted response continues; reopening shows progress/result                                   | Newly implemented. Only explicit Stop cancels. Microphone/upload lifecycle remains separately bounded.                  |
| History load failure                                              | Chat-area placeholder/retry; sidebar remains interactive                                       | Appropriate; existing browser regression retained.                                                                      |
| Preview/download failure                                          | Preview retry; independent download remains available                                          | Appropriate; isolated parser and private response contracts retained.                                                   |
| Model stops at output limit                                       | Failed/incomplete response state, not a completed saved answer                                 | Newly detected; generic user copy and safe Retry remain consistent.                                                     |

Existing retry policy uses bounded backoff for transient safe operations and
eligible provider failover before visible output. It does not replay a partially
executed inference request on navigation, reconnect, or tool failure. Explicit
Stop still waits for protected credit/lease cleanup.

## Live provider evidence

All prompts were synthetic, using configured provider/privacy/free-tier guards.
These were not authenticated student/database journeys. Routing fixtures measure
decision contracts; they do not prove the final factual answer or tool artifact.

| Sample                            | Availability / contract result     | Timing / interpretation                                                                                                                                                                                                                                                                             |
| --------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Initial four voice/routing probes | 0/4 usable decisions               | Approximately 14.3–18.4 seconds for the first three; the fourth had no eligible attempt after circuit state. Connection, shared admission and provider failures prevented a voice assessment.                                                                                                       |
| First expanded baseline           | 10/11 available                    | Saved 11 records; the console then hit a Windows encoding error, since fixed. Two clinical decisions were incorrectly scored by the old fixture requiring course RAG; authoritative biomedical web grounding is also allowed by the architecture. Do not report those as unsafe clinical decisions. |
| Corrected six-case sample         | 6/6 available; 5/6 route contracts | Median 2,164.5 ms; maximum 4,828 ms. Short study planning still chose extended generation.                                                                                                                                                                                                          |
| Three-case follow-up              | 3/3 available; 2/3 route contracts | Median 2,766 ms; maximum 3,578 ms. Continued the micelle plan and owned a prime-number mistake. Planning remained an efficiency miss, not a provider failure.                                                                                                                                       |
| Additional five-case pack         | 5/5 available; 4/5 route contracts | Median 2,672 ms; maximum 10,157 ms. Typos, Spanish continuity, an ordinary question with an open document, and an explicit flashcard action passed. An incorrect missing-upload clarification was identified.                                                                                       |
| Attachment/planning follow-up     | 2/2 available; 1/2 route contracts | Uploaded notes now handed off correctly. Diagnostic shape logging showed the plan answer exceeded the brief contract by nine words.                                                                                                                                                                 |
| Shorter-target planning follow-up | 1/1 available; 1/1 route contract  | 4,813 ms; complete 90-word plan, fast path, no speculative RAG/tools/web. A single passing probe is not a general performance/accuracy rate.                                                                                                                                                        |
| Full generation startup, earlier  | Successful after provider fallback | First visible output 30,125 ms; total 31,766 ms. Primary Google startup timed out at 25 seconds, another Google model returned 503, Groq answered.                                                                                                                                                  |
| Full generation startup, later    | Successful after provider fallback | First visible output 10,204 ms; total 11,079 ms. Both Google models returned 503 before Groq answered. Different provider conditions: this is an observed improvement, not a controlled performance benchmark.                                                                                      |

Fixture checks and changes are reported in their original order. Do not combine
different code/provider states into a single accuracy percentage or silently
relabel a failed probe after a follow-up passes.

Manual voice review: identity repair used PansGPT and acknowledged the mix-up;
the agreed-plan case continued the topic; a frustration follow-up used a concrete
soap/oil example; the correction case acknowledged that 2 is the even prime.
These are encouraging examples, not a universal personality score or proof of
long-term memory. Selected history is bounded; account profile knowledge and
cross-conversation memory must not be invented.

One generated soap explanation conflated emulsified oil droplets with micelles.
That is a factual-quality finding despite successful streaming: a micelle is a
surfactant aggregate; an emulsion disperses liquid droplets in a liquid.
See [IUPAC micelle](https://goldbook.iupac.org/terms/view/M03889) and
[IUPAC emulsion](https://goldbook.iupac.org/terms/view/E02065).
Added a general accuracy instruction to preserve technical distinctions while
simplifying, and a review criterion to the micelle/emulsion fixture. This does
not certify scientific accuracy; source-reviewed answer evaluation remains
necessary, especially before clinical release.

## Diagnostic workflow

Start with the failed response's `data-request-id`/support-reference title or its
HTTP `X-Request-ID`, then filter API JSON logs by `request_id`. Follow `run_id`
and the session ID through these events:

1. `chat_run_started`, `chat_phase_started` / finished / failed.
2. `intent_routing_attempt_failed`, `provider_admission_failed` / deferred,
   `provider_request_rejected`, `model_attempt_started`, `model_failover`.
3. `model_first_packet`, `chat_first_output`, public stage events.
4. Answer persistence and credit settlement phases, then `chat_run_finished`.

The outcome event distinguishes complete/error/cancelled and records first output,
total elapsed time and tool-start state. HTTP 200 on an SSE stream is not a success
metric. Safe error fields include exception/cause types, allowlisted reason and
provider code/parameter, HTTP status, retry delay, and the source function/line.
No raw exception/provider body, prompt, answer, private reasoning, query excerpt,
token or auth header is intentionally added by these chat diagnostics.
Relevant routing/generation, RAG/reranking, web-search, tool and voice exception
logs use the same safe fields. This is application correlation/timing logging,
not a claim of a deployed OpenTelemetry/Sentry dashboard or audited log retention.

## Reproducing the checks

Offline API, in PowerShell:
`cd apps/api; $env:ENABLE_GOVERNANCE='false'; .venv/Scripts/python.exe -m pytest -q --tb=short`.
This is the local fixture configuration, not a change to deployed governance.
Web helpers: `node --experimental-strip-types --test apps/web/tests/*.test.mjs`.
Browser journeys: from `apps/web`, run
`pnpm exec playwright test --config playwright.chat.config.ts` with a supported
Chromium executable. The preview uses explicit synthetic API/auth fixtures.

Opt-in live synthetic evaluation, from `apps/api`:

```powershell
.venv/Scripts/python.exe ../../tooling/audit-chat.py --live --pause 25 --limit 5 --case typo_definition --case spanish_followup --case open_document_general_question --case unseen_uploaded_notes --case selected_flashcard_action --output ../../.tmp/chat-audit-live-expanded.json
.venv/Scripts/python.exe ../../tooling/check-chat-generation.py --live --output ../../.tmp/chat-audit-generation-current.json
```

The generation probe stubs database telemetry and disables tools; it exercises
real generation transport but does not prove persistence, RAG or billing in a
hosted environment. Live files in `.tmp` are local evidence, not committed data.

## Research that informed the changes

- Worker-local background tasks are not durable distributed jobs; a queue is the
  separate option for multi-process work: [FastAPI background tasks](https://fastapi.tiangolo.com/tutorial/background-tasks/).
- Rate-limit headers and provider cooldowns must be interpreted by their actual
  quota windows: [Groq rate limits](https://console.groq.com/docs/rate-limits).
- Transient API failures and eligibility differ from invalid requests:
  [Google API errors](https://ai.google.dev/gemini-api/docs/api-errors?hl=en),
  [Groq errors](https://console.groq.com/docs/errors).
- Structured-output and reasoning parameters are model specific:
  [Groq structured outputs](https://console.groq.com/docs/structured-outputs),
  [Groq reasoning](https://console.groq.com/docs/reasoning).
- SDK transport lifetime/cleanup matters:
  [Google Gen AI SDK](https://github.com/googleapis/python-genai).

## Remaining release checks and limitations

- API-worker generation survives browser/sheet navigation, not API process death
  or a sleeping/restarted host. Cross-worker snapshots fall back to the owned
  database lease/history; cross-worker Stop currently returns a reopen conflict.
  Durable resumable jobs/distributed cancellation need a separate queue design
  and hosted acceptance. Do not advertise restart-safe generation.
- Provider quota, Google 5xx and network failures remain real external limits.
  No paid service or privacy bypass was introduced. The observed short-plan and
  attachment routing misses remain recorded with their corrections/follow-ups;
  the expected route contracts were not weakened to claim a pass.
- Hosted Supabase/R2, multi-worker deployment, real iOS/Android backgrounding,
  browser process eviction, and actual end-to-end provider + owned persistence
  journeys remain staging/device checks. Synthetic browser mocks do not prove them.
- No statistical p95/p99 or load/concurrency SLO is claimed from this sample.
  Factual accuracy needs a larger source-reviewed dataset and periodic regression
  evaluation; personality/continuity require human review as well as route checks.

## Verification and engineering synchronization

Final full offline API suite: **1,166 passed, 95 skipped** (61.10 seconds).
Skipped hosted/service checks remain unverified; two existing test-client
deprecation warnings do not indicate failed assertions.
Production web build passed. Web unit tests: 130 passed. Typecheck: all six
workspace tasks passed. Web/UI lint passed; Ruff passed. Browser: 133/135 passed in the broad
run; the interrupted mobile reload check and the obsolete sheet-dismissal
cancellation assertion both passed in a targeted follow-up (2/2). The dismissal
check now explicitly requires generation to remain active until Stop is pressed.
An additional visual capture run passed 2/2 checks. Desktop retry rows, mobile
partial-answer retry rows and the compact offline notice above the mobile input
were inspected directly; alignment, button placement and message separation were
appropriate. Local screenshots are in `.tmp/chat-audit-ui-results/`.

Notion tools are unavailable in this session. Pending structured updates:

- Session / Change Log: chat reliability audit, background runs, recovery and
  content-free diagnostics; Area API/Web/AI; date 2026-11-18; verification must
  match the final checks below.
- Decision Log: accepted inference belongs to the API worker; navigation only
  detaches subscribers. Preserve explicit Stop and bounded owner-scoped recovery.
  Alternative rejected: replay inference on reconnect or cancel on every hide.
- Product Roadmap: chat reliability improvements locally verified; hosted and
  device gates remain open.
- Knowledge Base: add the worker-local run/snapshot/cancel pattern and correlation
  fields; explicitly distinguish it from durable queued generation.
