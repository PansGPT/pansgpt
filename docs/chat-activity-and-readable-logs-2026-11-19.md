# Public activity headings and readable logs — 19 November 2026

The user approved task-specific one-line activity headings, content-free activity
signals during generation, a separate delayed-response hint, and terminal logs
similar to legacy PansGPT. Private model reasoning remains excluded from public
responses and saved activity summaries.

## Contracts and behaviour

- Reuse the semantic router's existing `public_progress` labels and tool calls'
  `_public_status` labels. These are independently authored public copy, validated
  as short plain text and displayed only when the corresponding backend stage
  actually starts. No extra inference call, scratchpad summarizer, timed carousel
  or client-side keyword routing is introduced.
- The existing thinking animation displays the current model-written label, with
  an allowlisted backend stage fallback when no custom label is available. Fix
  mappings for course search, flashcards, mnemonics, charts, chemical structures
  and vision. A delayed response retains its heading; a smaller muted line appears
  beneath it. Existing motion tokens and reduced-motion support are preserved.
- Google usage-only packets emit content-free generation activity only when
  reported output/thinking counts advance. Duplicate counters and prompt counts
  alone cannot invent progress. Existing private-thought packets also produce
  throttled content-free activity; their text never becomes public status copy.
  Activity remains throttled to once per three seconds by the agent loop.
- The twelve-second inactivity timer continues detecting gaps; a separate
  thirty-second elapsed timer provides a truthful long-wait hint even while
  activity continues. Provider failover alone changes neither the task heading
  nor the elapsed wait. Stop and the overall response deadlines remain in force.
- Shared `ChatRunSnapshot` adds optional `activity` (existing `ChatProgressCode`)
  and `elapsed_ms`; matching Pydantic fields are defaulted and validated. Owned
  snapshots in the active worker preserve the stage and elapsed time on reattachment without
  exposing reasoning, arguments or results. Invalid optional stage strings are
  ignored by the browser. `ChatMessageView.delayed` is presentation-only.
  Existing cross-worker/restart fallback limitations remain unchanged.

## Logging

- `LOG_FORMAT=auto`: readable console in development or an interactive terminal;
  JSON on noninteractive staging/production. Explicit `console` and `json` modes
  remain available. `LOG_COLOR=auto|always|never` controls colour; automatic colour
  follows the output terminal and respects `NO_COLOR`.
- `LOG_LEVEL=INFO` retains useful starts, stages, completion and failures. Success
  is green, warnings/recovery yellow, failure red, routine information cyan. Lines
  explain the operation, reason, duration and next action. An eight-character
  correlation suffix distinguishes concurrent requests; DEBUG/JSON retain full
  correlation IDs.
- Streaming usage/capacity records move to DEBUG. Quota accounting still observes
  each update internally. A quota-managed provider attempt emits one final usage
  summary containing the last reported input/output/thinking counts and elapsed
  duration. Unknown measurements remain unreported rather than fabricated.
- Suppress duplicate successful chat HTTP instrumentation and routine HTTPX
  provider-request chatter at INFO. Keep numeric status/error reasons; do not
  interpolate arbitrary exception bodies, prompts, tool arguments or private
  responses into readable messages. Operational formatting changes no provider
  eligibility, quotas, tenancy, credits or AI routing decisions.

## Verification

- Full API regression: **1,223 passed, 102 skipped**, 88.14 seconds. Existing
  test-client deprecation warnings remain unchanged. A subsecond stream-timing
  check timed out in an earlier run alongside browser startup; it passed in this
  isolated full run without weakening its deadlines.
- Readable renderer checks: **5 passed** after the final console-time and message
  wording refinement. They cover colour controls, safe failure reasons, private
  field exclusion, JSON/full correlation, DEBUG availability and one final usage
  summary despite repeated streaming counters.
- Web unit suite: **134 passed**. Full background-run/browser regression:
  **13 passed**, including desktop and mobile task headings with continuing
  activity and an independent elapsed wait hint. Two targeted reruns verified
  the visible heading swap and settled desktop/mobile screenshots. Existing
  reload, offscreen completion, explicit Stop and safe Retry journeys passed.
- Workspace TypeScript: **6 tasks passed**. Workspace lint: **2 tasks passed**.
  API Ruff lint/format checks passed (196 app/test files checked for formatting).
- Production Next.js build passed, including TypeScript and all 23 static pages.
  The existing `next-env.d.ts` bytes were preserved. Final diff whitespace checks
  passed.

Tests use synthetic fixtures. Screenshots are in ignored local `.tmp` artifacts;
animations are settled for visual inspection. Browser preview checks do not
certify hosted Supabase, production log collection, or real-provider latency under
load. No hosted migration or deployment was performed.

## Engineering synchronization pending

Notion tools are unavailable in this session. Pending structured entries:

- Session / Change Log: public activity headings, generation liveness and readable
  logs; 2026-11-19; areas API, Web/Chat, Observability; verify only the checks below.
- Decision Log: reuse router-authored public copy and observed generation counters;
  reject scratchpad exposure, extra status inference and artificial rotating
  progress. Keep an elapsed hint so heartbeats cannot hide a long wait.
- Product Roadmap: strengthen chat status visibility and operational diagnostics;
  retain hosted/load verification gates.
- Knowledge Base: record console/JSON/debug configuration and the separation of
  public activity, liveness, elapsed wait and private reasoning.
