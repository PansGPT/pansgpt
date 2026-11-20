# Chat tool generation and capacity recovery — 19 November 2026

The reported surfactant flashcard run routed correctly, encountered an upstream
Google 503, completed course retrieval, and then exhausted generation candidates.
The remaining candidates were blocked by local capacity admission or provider
privacy eligibility. Flashcard generation was never invoked. This is distinct
from the already corrected FlashRank package issue: reranking succeeded in the
reported run.

## Implementation and recovery contract

- Preserve the five-turn agent limit, allowing tools in its first four turns.
  Only the final turn forces synthesis. Two independent searches therefore no
  longer consume all opportunities to invoke the requested artifact tool.
- Finish a validated flashcard deck immediately with a brief confirmation.
  Do not invoke another model solely to acknowledge an already completed deck.
  A live synthetic probe exposed this extra dependency and its added latency.
- Retry capacity admission at the current model turn, retaining its selected
  history and completed tool results. Do not restart semantic routing or replay
  a tool automatically. Wait no earlier than the reported reset, with positive
  jitter and an exponential minimum. Limit waits to two retries per turn and
  fifteen seconds across the generation; retain the overall response deadline
  and reserve time for a subsequent model attempt. Long resets and capacity-store
  outages terminate without an unbounded wait. Stop cancels the wait.
- Atomically fit generation output to remaining minute/day/provider-observed
  token capacity inside the Redis reservation script. Preserve the complete
  selected input, request limits and concurrent reservations. Require at least
  1,024 output tokens, or the original requested maximum if smaller. Return the
  granted ceiling to the provider adapter. Other inference budgets remain fixed;
  truncated provider output remains a failure rather than a successful artifact.
- Skip privacy-ineligible candidates before transport. Do not enable OpenRouter
  or relax retention requirements to recover availability.
- `ChatRunSnapshot` adds optional `retry_blocked` in the shared TypeScript DTO
  and a defaulted boolean in Pydantic. `tool_started` retains its activity meaning.
  The backend durably fences tools other than the explicit read-only allowlist
  (`rag_search`, `web_search`) before execution. Artifacts and unknown tools
  remain fenced. A later search cannot clear an existing fence.
- Persist `retry_blocked` in failed-question metadata and return it in owned
  snapshots, including interrupted-run database fallbacks. Live SSE, restored
  history and snapshot recovery use the same rule. Older metadata/snapshots
  without the field retain conservative `tool_started` behaviour; do not silently
  reclassify an old request whose effects cannot be established.
- Provider `recovery` events no longer change the thinking label or reset the
  slow timer. Only twelve seconds without meaningful progress trigger “This is
  taking longer than usual” in the existing thinking UI. Quick model switches
  remain normal thinking; a switch cannot clear an already elapsed slow state.

## Verification and limitations

- Focused API recovery checks: **100 passed**, four service checks skipped.
  Additional real streaming/failure-metadata contracts: **25 passed**. After the
  flashcard completion refinement, artifact/recovery/delivery/security checks:
  **32 passed**.
- Web unit suite: **132 passed**. Owned background-run browser scenarios:
  **11 passed across runs**, including desktop/mobile Retry after read-only
  searches, reload recovery, unknown/write-tool fences and elapsed slow status.
  The first browser run passed ten cases; the eleventh needed a selector scoped
  to the status container because its accessible/animated label has four text
  copies. It then passed without a product UI change.
- Real Redis integration: **9 passed**, including concurrent atomic output
  grants, observed/daily ceilings, settlement and shared cooldowns. A new test
  initially addressed the wrong synthetic daily-counter key; correcting its
  index produced the successful final run. Tests use isolated test namespaces,
  not live provider counters.
- Workspace TypeScript: **6 tasks passed**. Full workspace lint and API Ruff
  checks passed; API formatting checked 203 files. Production Next.js build
  passed, preserving the existing `next-env.d.ts` bytes.
- An early parallel full API run encountered three preview-subprocess timeouts
  under local resource contention. The preview cases passed separately (20
  cases). The final isolated, post-refinement full API gate passed **1,215
  cases**, with 102 service/hosted checks skipped, in 84.22 seconds; see
  `.tmp/tool-recovery-api-complete.log`. Existing test-client deprecation warnings
  remain unchanged.
- Two live free-tier synthetic flashcard probes created validated three-card
  decks. They use an explicit development adapter exposing only the flashcard
  contract; student records, storage writes and DB telemetry are disabled. The
  initial probe produced its deck at 30,328 ms but ended at 54,844 ms because of
  another acknowledgment inference. The final probe recovered from a primary
  model first-packet timeout via the secondary Google model: deck at 37,610 ms,
  completion at 37,844 ms, with no second inference after creation. Different
  provider conditions mean these totals are not a controlled speed comparison.

All committed generated-content fixtures are synthetic. These checks do not
certify general factual accuracy, live availability under load, hosted RLS,
multi-worker run durability, or native-device background execution. The live
probe also does not verify account/tenant authorization or live course retrieval;
those boundaries are covered only to the extent of the API contract tests here.

No additional provider privacy exception, paid service, schema migration or
deployment is introduced. Existing failed requests with legacy replay fences
remain conservative.

## Engineering synchronization pending

No Notion connector is available in this session. Pending structured updates:

- Session / Change Log: chat tool loop, capacity recovery and safe Retry; Area:
  AI/backend/web; Date: 2026-11-19; verification limited to the evidence here.
- Decision Log: bounded same-turn admission retries and atomic output fitting;
  reject replaying whole requests, bypassing quotas/privacy, or removing all
  tool replay fences.
- Product Roadmap: strengthen the existing chat reliability work; retain hosted
  and provider availability gates.
- Knowledge Base: distinguish tool activity from replay safety and document the
  Redis generation-output grant, since these alter core recovery contracts.

## 20 November artifact preservation amendment

Accepted behavior: a validated artifact is checkpointed to the owned assistant row before `artifact_ready` is emitted. Final persistence updates that same row under the current run lease. All completed artifact skills, including graphs, diagrams, mnemonics and chemical structures, end after the current tool batch instead of requiring another model turn. This does not skip other calls already present in the batch. A requested accompanying explanation can be supplied as `_completion_summary` in the same model pass; this optional public text is bounded to 3,000 characters, stripped of thinking tags, checked by the existing output guard and shown only after successful artifact creation. The reserved field is removed before tool execution/public tool arguments. Without it, a truthful short confirmation is used.

If subsequent work fails after a confirmed checkpoint, completed material is retained and the turn ends with the optional allowlisted `completion_warning: "additional_work_incomplete"` on SSE `done`, run snapshots and history. The frontend maps it to `ChatMessageView.completionWarning` and shows a quiet note alongside the usable artifacts. No raw error text enters this field. Actual storage failure before the first checkpoint remains an error; explicit Stop still cancels generation. Delivered material settles the existing run credit once, without permitting whole-request tool replay. No migration is required: the checkpoint/warning uses the existing assistant `tool_calls` JSON and canonical row ID.

Capacity admission remains fail-closed. One retry of an uncertain Redis reservation reuses an atomic, two-minute receipt so a lost reply cannot double-count requests or tokens. The receipt preserves the original grant and day bucket. Both attempts share a five-second admission deadline; provider calls begin only after a confirmed grant. SDK-level retries are disabled in favor of this bounded path. Connection keepalive/health checks are enabled. Readable logs distinguish quota-store connection problems from upstream provider rejection, and distinguish saved material with incomplete follow-up work from a failed empty response. The global generation deadline and provider privacy/rate limits remain enforced.

Final local verification: the full API suite passed with **1,271 passed, 103 skipped** and two existing framework deprecation warnings. All **140 web helper tests** and all **five targeted Chrome rich-output cases** passed. Screenshots were inspected on desktop/mobile, including chart interaction, a quiet incomplete-work note, and reload without a second inference request. API tests cover provider failure, global timeout, later storage outage, Stop, checkpoint failure before announcement, final updates to the same assistant row, mixed artifact batches, output filtering and capacity recovery. Web TypeScript, scoped ESLint, affected Python lint/format, and the production Next.js build passed (23 static pages). The pre-existing Next environment type file was preserved.

The original one-write assertions were updated to verify one canonical message across checkpoint and final writes, including clearing the provisional warning. A concurrent production build also caused three isolated PDF/PPTX preview tests to exceed their existing subprocess time limits; the final full API run was serial, kept those limits, and passed every case. No error assertion or production timeout was relaxed.

Designated live Redis tests, including the new lost-reply/double-count check, were skipped because no dedicated test connection is configured. Mocked admission recovery passed but does not certify the real Redis script or network availability. Hosted PostgreSQL/R2, live provider quality/latency and distributed-process recovery gates remain open. No new provider privacy exception, paid service, migration, deployment or legacy-record rewrite is introduced.

Prepared Notion updates (connector unavailable): Session / Change Log, 2026-11-20, AI/API/Web, artifact checkpoints and safe partial completion; Decision Log, finish artifact batches with the same-pass explanation and use receipt-backed bounded reservation retry rather than replaying tools or bypassing quotas; Product Roadmap, locally verified reliability slice with hosted gates open; Knowledge Base, checkpoint/partial-completion and idempotent admission contracts. Verification applies only to the completed local checks recorded here.
