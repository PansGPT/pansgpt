# Routing outage correction — 23 October 2026

Reported failure: a new “hello” request exhausted its semantic-routing budget, defaulted to complex RAG, retried a timed-out hybrid SQL query and finally hit the 120s request deadline. Model unavailability was incorrectly treated as a reason to retrieve documents.

- Exhausted/invalid routing now emits retryable `AI_ROUTING_UNAVAILABLE` followed by terminal SSE completion. It starts no retrieval/tool/generation call, persists no fabricated assistant answer and refunds/releases the reserved run. Valid model handoffs and explicit document context still use the grounded workflow.
- Routing retains a 12s shared budget, with up to 8s per model attempt and a 4s HTTP connection timeout. A connection failure skips the remaining models on that provider and opens a process-local 30s provider cooldown. Model-specific errors still permit same-provider model fallback. Privacy gates remain enforced.
- Logs record attempt duration, allotted budget, HTTP status when available and a transport stage. HTTP tracing retains stage names only; request details, authorization headers and prompts are discarded. The asynchronous trace callback follows [HTTPX's documented trace extension](https://www.python-httpx.org/advanced/extensions/).
- Google routing uses one SDK attempt, avoiding its default internal retries. Its advertised server deadline is at least 10s because the API rejects smaller deadlines; the enclosing routing timeout still cancels at the smaller allotted budget. Tests enforce both settings.
- Genuine retrieval has a separate 25s deadline. Database/SQL cancellation timeouts propagate instead of being treated as RPC compatibility failures or triggering keyword/web fallbacks. Retrieval failures emit retryable `RETRIEVAL_TIMEOUT`/`RETRIEVAL_UNAVAILABLE`; an outage must not produce a false course-material absence notice.
- Environment templates, canonical plan/roadmap and AGENTS guidance reflect the corrected contract. No migration, provider-privacy exception or new dependency was introduced.

Evidence:

- Reproduced routing failure from the local machine. An unauthenticated connectivity probe timed out during Groq TCP connection setup after approximately 6.3s; Google/OpenRouter public endpoints returned HTTP responses. That checks reachability only, not inference health.
- Two later real Groq greeting calls succeeded in **2,469ms** and **3,422ms**. This establishes recovery in that sample, not reliable ongoing connectivity. A forced Groq-failure probe still found Google inference exceeding the routing budget; live fallback availability remains unverified. Unverified OpenRouter remained blocked by its privacy gate.
- Full offline API suite: **541 passed**, 22 live cases deselected; two existing dependency deprecation warnings. Regressions cover provider cooldown/fallback, bounded routing failure, no speculative RAG, visible retryable errors, credit refund, Google retry/deadline configuration, retrieval failure handling, and no repeated SQL/web work after database timeout. The final 17 API/deadline regressions also passed after moving the outage guard ahead of classification logging. Ruff checks and formatting passed.
- Staging SQL/API re-verification is **not passed** for this follow-up: the full run exceeded its 150s wrapper budget; the focused outage retest later failed to establish its database connection within 15s. The earlier seven-journey success belongs to the preceding routing implementation. Refund/no-retrieval/no-false-answer contracts pass with offline API fixtures; the new real-database outage journey remains an open verification gate. Failed staging attempts used synthetic transactions with rollback cleanup.
- No frontend code changed; the preceding web build/browser checks were not rerun for this backend correction. Hosted rollout, provider reliability and remaining release gates stay open.

Notion handoff: no connector is callable; remote synchronization is pending.

- Session: Stop routing-outage cascades and bound retrieval failures; 2026-10-23; AI / API; router, classifier, transport, RAG, config/templates, regressions and canonical docs; Verified for the checks above.
- Decision: Stop with a retryable error when no model can establish intent; do not guess that RAG is needed. Use provider connection cooldowns and independent retrieval deadlines. Alternative rejected: defaulting every routing failure to complex retrieval or increasing the global two-minute timeout.
- Roadmap: update 6B.20 verification; Phase 11 remains In Progress.
- Knowledge Base: distinguish a validated grounded handoff from unavailable classification; record the new bounded outage/refund contract and provider cooldown behavior.
