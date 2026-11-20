# Recovery after private-only provider output

## Incident and behavior

The document request in run reference `1d3629fa` routed successfully through GPT-OSS, then Google returned HTTP 503 after Gemma reported thinking usage. The first activity/thinking packet had already exited candidate selection. Its later exception therefore skipped failover. The `CapacityDeferred` wrapper also hid the underlying 503 from terminal error classification, incorrectly disabling Retry.

Stream consumption now stays within candidate selection. A failed attempt with no visible answer can proceed to the next privacy-eligible model, including another provider. Private/activity packets do not commit an answer. Partial tool calls from failed streams are discarded before dispatch. Completed tool results remain in the next turn's messages; failover does not replay tools. If a turn has emitted visible answer text, it terminates on failure without splicing in another model's answer. Cancellation still closes the stream. Existing overall/gap deadlines, capacity-wait limits, provider eligibility and tool Retry fences apply.

Wrapped outages retain their underlying HTTP status. A capacity deferral without a status becomes a temporary 503; an oversized request remains `CONTEXT_TOO_LARGE`. Temporary failures offer manual Retry unless a state-changing tool has already made replay unsafe. Selecting Document by itself is not a replay fence. Router selection (Groq first) and complex generation selection (Google first) remain separate stages.

## Readable provider diagnostics

Google SDK `.details` is inspected directly and through the capacity wrapper. Logs include HTTP status, allowlisted Google status (such as `UNAVAILABLE`), and a fixed summary when the provider message identifies high demand, overload, exhausted quota, service unavailability or an internal error. Raw exception messages, response bodies, prompts and private thinking are excluded. Unrecognized messages produce an explicit “no further safe detail” note, not a guessed cause. Structured JSON keeps the same safe diagnostic fields.

Example when Google supplies this reason:

```text
WARN AI: gemma-4-31b-it failed after 42.1s: HTTP 503 / UNAVAILABLE; Google reported high demand.
WARN AI: gemma-4-31b-it failed because Google reported high demand. Trying the next eligible model.
```

These are local deterministic regression checks, not a claim that Google's availability has been repaired or that hosted providers were exercised.

## Verification

Regression cases cover activity-only and thinking-only failures, cross-provider fallback, exhaustion with Retry, partial visible answers, cancellation, discarded incomplete tool calls, preserved completed search results, wrapped error codes and safe Google diagnostics. The API-level regression also verifies `retryable=true` and `retry_blocked=false` in the owned failed-run snapshot.

- Full API suite: **1,249 passed, 102 skipped**, two existing dependency warnings (`ENABLE_GOVERNANCE=false`, existing test fixtures).
- Final focused suite (`test_agent_tool_recovery.py`, `test_true_streaming.py`, `test_readable_logging.py`): **37 passed**, including the subsequently added API/snapshot regression.
- Ruff check and format check: passed; 198 Python files formatted. Git diff whitespace check passed.

An existing 0.4-second API streaming test initially included synchronous TestClient portal/import startup. It now uses the initialized async API fixture and retains the same 0.4-second assertion; both scenarios pass. No production deadline was relaxed. This is a backend-only correction; the frontend continues to use the existing error-code/Retry contract.

## Engineering synchronization

Notion tools are unavailable. Prepared updates:

- Session / Change Log: **Recover private-only streams and expose safe Google outage reasons**, 2026-11-19, AI / Observability; files: `llm.py`, `provider_capacity.py`, `diagnostics.py`, `logging_setup.py`, regression tests and this record. Verified: local API checks above; hosted acceptance remains open.
- Decision Log: Commit model selection on visible answer output or completed stream, rather than first internal packet. Keep tool execution outside candidate retries and retain known provider status through wrapped errors. Exclude raw provider exception text.
- Product Roadmap: Streaming recovery — local integration, hosted provider acceptance remains open.
- Knowledge Base: Model-selection commit boundary and allowlisted provider diagnostics.
