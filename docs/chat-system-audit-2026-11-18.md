# Extended chat systems audit — 18 November 2026

> **19 November follow-up:** The subsequently reported ZIP validation failure
> was our rejection of official `__MACOSX` metadata. [Correction and real ONNX
> verification](flashrank-package-metadata-2026-11-19.md). The earlier network
> observations below remain historical evidence; local neural loading has now
> been verified after correcting that separate compatibility defect.

This extends the earlier failure/UI audit. Its original regression totals are
not evidence that every subsystem below was exercised live. New checks must
record their actual mode: inspection, fault injection, concurrency test, real
service, browser fixture or hosted/device verification.

## Checklist selected from system risks

| Area                            | Cases to examine and verify                                                                                                                                                                                                  |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Application throttles           | Real enabled 429 boundaries; spoofed forwarding headers; owner/session/worker scope; shared-IP fairness; Retry-After and recovery polls; no credit/inference after rejection                                                 |
| Provider quotas                 | RPM/TPM/RPD/TPD; input plus output reservations; concurrent claims; actual usage reconciliation; daily reset; requests-only headers; 429 versus 5xx; fail-closed Redis failure; bounded retry amplification                  |
| Startup and dependency recovery | DNS/TCP/database authentication; failed initial pool then recovery; direct fallback concurrency; pool saturation; JWKS independently reachable; optional model missing/slow/corrupt; reload-safe model caches                |
| Resource isolation              | Cold-model initialization and timed-out native work must not exhaust the default thread pool; local CPU inference concurrency; bounded upload/audio reads; SSE subscriber backpressure; active-run/owner caps                |
| Tool correctness and security   | Argument validation, allowed tool names, owned attachment/document resolution, partial side effects, duplicate retries, artifact validation, preview isolation, XSS/unsafe links, model output termination                   |
| Retrieval and evidence          | Unavailable embeddings versus genuine empty results; full-text fallback; reranking fallback visibility; citation/source consistency; unseen uploads; injection in retrieved material; unavailable current evidence           |
| Identity and authorization      | Expired tokens, unavailable JWKS/database, account/university changes, cross-owner reads, wrong branches, deleted/archived sessions, profile facts versus invented memory                                                    |
| Lifecycle and persistence       | Explicit Stop versus navigation; duplicate sends; save/credit/lease failures; retry idempotence; interruption before/after tools; process death and multi-worker recovery limitations                                        |
| Protocol and client recovery    | Fragmented/invalid/empty SSE; no done frame; partial text; output limits; offline/reconnect; tab backgrounding; multiple tabs; polling throttles; history/UI boundaries                                                      |
| Answer quality                  | Source-reviewed factual correctness; uncertainty and unsafe clinical decisions; intent availability versus accuracy; selected-history continuity; tone; ambiguous/multilingual/typo inputs; adversarial instruction attempts |
| Operations                      | Correlated content-free logs; actual outcome versus HTTP 200; readiness versus liveness; sensitive data in logs; cache/disk cleanup; dependency/model provenance; p50/p95 under realistic load                               |

This checklist draws on [OWASP unbounded consumption](https://genai.owasp.org/llmrisk/llm102025-unbounded-consumption/),
[AWS retry/backoff guidance](https://d1.awsstatic.com/builderslibrary/pdfs/timeouts-retries-and-backoff-with-jitter.pdf),
[Groq quota semantics](https://console.groq.com/docs/rate-limits),
[SlowAPI configuration](https://slowapi.readthedocs.io/en/stable/api/), and
[Supabase connection management](https://supabase.com/docs/guides/database/connecting-to-postgres).
It is a verification inventory, not a claim of certification against these sources.

## Startup failure reproduced

User logs: database pool initialization timed out, JWKS prewarmed successfully,
FlashRank started downloading and its startup wait timed out, then application
startup completed. Both startup failures are currently nonfatal.

The opt-in read-only infrastructure probe resolved the configured shared-pooler
hostname (IPv4, 156 ms). TCP port 5432 timed out after 5,000 ms. Two PostgreSQL
attempts then timed out after approximately 10,016 and 10,015 ms. No application
query result or credentials were printed. This locates the reproduced failure
before application queries; it does not prove whether the local network,
firewall, pooler or upstream availability caused the unreachable TCP endpoint.
JWKS success over HTTPS does not verify PostgreSQL connectivity.

A later comparison succeeded on both pooler ports: TCP 5432 took 406 ms,
PostgreSQL connect 2,422 ms, and a read-only query connection 2,453 ms. Port 6543
also connected and completed `SELECT 1`. A subsequent 5432 query check succeeded
in 1,859 ms. No connection string was changed. The earlier failure is therefore
observed as transient, rather than evidence of a permanently wrong password,
schema or pooler port.

Prior database behavior: startup tried once; if the pool failed, each request
could open another direct connection indefinitely. Corrections add one worker
recovery loop with bounded backoff, single-flight pool initialization, three
maximum direct fallback connections while recovering, and safe timing/cause logs.
No roles, access rules or stale profile data are substituted for a failed database.

Prior model behavior: each process used a fresh temporary download directory;
the SDK downloaded without an HTTP timeout. Cancelling `wait_for(to_thread(...))`
did not stop its underlying thread. Subsequent requests could queue additional
default-executor jobs behind the same initialization lock. See
[Python task/thread semantics](https://docs.python.org/3.12/library/asyncio-task.html) and
[FlashRank source](https://github.com/PrithivirajDamodaran/FlashRank/blob/main/flashrank/Ranker.py).

Corrections use a persistent backend model cache, file locking, private staging
and atomic publication; bounded public download/extraction; one dedicated warmup
thread; immediate heuristic fallback until ready; at most two CPU inference jobs;
and a cooldown after failed initialization. A timed-out startup wait explicitly
reports that initialization continues and fallback is in use. Downloaded ONNX
files are not student data. Model revision/checksum pinning remains a supply-chain
release item; these changes do not claim verified model provenance.

The actual public model download remains unavailable on the tested network.
A live attempt received 655,360 bytes, then stalled in the response body;
the safe cause was `ReadTimeoutError`, after about 49.8 seconds. The startup
wait now reports `flashrank_warmup_pending` at info level while initialization
continues; a real download failure separately reports phase, elapsed time,
downloaded bytes and safe exception/cause types. Heuristic fallback was verified;
successful neural model loading/inference was not. Independent startup probes
run in parallel rather than adding their timeout budgets together.

## Rate limits: distinct layers

The legacy SlowAPI limiter uses worker-local memory and defaults to 60 requests
per minute per URL/IP. It also trusted arbitrary forwarding headers and exposed
inconsistent retry metadata. This is insufficient as shared authenticated chat
admission across sessions/workers.

New Redis-backed chat action admission uses authenticated account/university
identity hashed into keys: 60 sends, 10 uploads, and 10 voice submissions per
rolling minute by default. New sessions, retries, edits and regenerations do not
reset the send quota. Rejection occurs before inference; sends are checked before
preparing a run or charging credit. Redis unavailability fails closed with 503.
The existing provider budget remains a separate shared limit, and upload storage
also retains its 30-per-hour owned database quota.

IP limits now use the ASGI client address after server-managed trusted-proxy
processing. Deployment must configure trusted proxies correctly; arbitrary
`X-Forwarded-For` or `CF-Connecting-IP` alone cannot establish identity.
Legacy non-chat IP throttles remain worker-local; the new account admission is
the shared authority for these costly chat actions.

429 responses provide consistent numeric Retry-After, exposed through CORS.
Run polling honors that window rather than repeatedly polling every few seconds.
Provider observation now processes requests-only quota headers as well as token
headers. Voice reads are bounded to the allowed byte limit plus one before
transcription, rather than reading an arbitrarily large file into memory.

Attachment parsing had a separate error-classification bug: `TimeoutError`
inherits from `OSError`, so the earlier broad file-error catch returned HTTP 422
before the intended timeout handler could run. It now returns retryable HTTP 504
and preserves the distinction between an unreadable file and a temporarily slow
parser. A dedicated ASGI regression verifies this without storing an attachment.

Logging inspection also found that Uvicorn's access logger includes query
strings independently of the application logger. A tested filter now removes
them from access records, preventing chat search text and OAuth callback codes
from being logged there while preserving the method/path/status and separate
request correlation. This is not a general audit of third-party debug logging or
deployed retention settings.

The first 20-request Redis burst exposed a cold-connection timeout: six of seven
checks passed, with one stress case failing before its assertion. It was not
silently counted as a pass. The capacity client now has a bounded blocking
connection pool and startup prewarming instead of opening unlimited new TLS
connections. Repeating all seven integration cases with four test connections
passed, including all 20 concurrent admission attempts.

Auxiliary inference was also inspected rather than treating final-answer calls
as the whole AI budget. Optional query expansion/HyDE now share admission, have
bounded output and SDK retry settings, and close their clients. Query embeddings
participate in shared admission and close the SDK client; capacity denial falls
back without repeatedly retrying the same denied claim. Vision calls on all three
tiers now participate, with a configurable 4,096-token non-text reserve and actual
usage reconciliation. That reserve is an application estimate, not a claim of
exact provider image tokenization. No image pixels or query text enter Redis.

Bulk ingestion embeddings remain on their existing worker retry policy; this is
not certification of global worker/ingestion quota scheduling. ASR has account
request admission and bounded bytes; provider audio-duration/day budgeting and
live transcription quality remain separate verification items.

## Evidence and remaining verification

Verified results:

- Final full offline API regression: **1,194 passed, 100 skipped**, 52.66 seconds,
  including the new upload-timeout/access-log regressions.
  Hosted/service skips are not passes. The global offline fixture disables
  external quotas; the new dedicated throttle cases explicitly enable them.
- **Seven real Redis integration cases passed** in 27.49 seconds, using unique
  expiring keys with exact cleanup: rolling concurrent admission, minute token
  reservations, daily token reset, RPM, RPD, requests-only header reset and
  existing request coalescing. No provider quota or student record was touched.
- **130 web helper tests passed**; TypeScript and targeted web lint passed.
- All **seven background recovery browser cases passed**, including quota waits
  without inference replay (1.7 minutes). Development StrictMode may launch two
  initial reads before either throttle response arrives; the test checks the
  next read's delay after the most recent 429 rather than incorrectly requiring
  those initial probes to be serial.
- All six workspace typecheck tasks, web/UI lint, Ruff and the production web
  build passed. Existing generated development route references were preserved.

Concrete additional test evidence:

| Concern                                                                                                | Test sources and evidence mode                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Actual enabled HTTP/account throttles, spoofed IP headers, CORS and no charge after rejection          | `test_chat_system_limits.py`; local ASGI with the limiter enabled; mocked quota-store denial; isolated real Redis scripts                                            |
| Database outage recovery, single-flight initialization, fallback connection pressure, parallel startup | `test_startup_recovery.py`, `test_database_connections.py`; deterministic faults and concurrency; separate real read-only connectivity probes                        |
| Archive traversal, interrupted download, size limits, atomic publication and cache reuse               | `test_flashrank_cache.py`; synthetic archive/filesystem fixtures; real download failure observed separately                                                          |
| Native-work cancellation and thread starvation                                                         | `test_startup_recovery.py`; held native jobs and cancelled awaiters; assertions enforce one warmup and two inference jobs                                            |
| Optional inference cannot bypass quota or leak pixels into quota keys                                  | `test_auxiliary_chat_budgets.py`; quota enabled, denied reservation, SDK call forbidden and close verified                                                           |
| Retrieval outage versus no evidence, no fabricated web evidence, safe query fallback                   | `test_retrieval_outages.py`, `test_retrieval_honesty.py`, `test_chat_recovery.py`; existing fault-injection contracts rerun in the full API gate                     |
| Owned artifacts, branch/run identity, duplicate retry and partial stream behavior                      | `test_artifact_security.py`, `test_chat_runs.py`, `test_true_streaming.py`, existing parser/browser checks; local contracts/fixtures, not a hosted RLS certification |

Existing UI/failure evidence is in [the first audit](chat-reliability-audit-2026-11-18.md).
No prior fixture total is presented as proof of newly added throttling or startup
recovery. No model provider quota is intentionally exhausted in live testing.

Notion synchronization remains pending because its connector is unavailable.
Pending records: Session / Change Log (extended chat startup/quota audit, API/Web,
verified only for the checks above); Decision Log (shared async account admission,
bounded dependency pools and atomic model cache, rather than worker-only IP limits
or per-request initialization); Product Roadmap (local verification complete,
hosted/device/model-provisioning gates open); Knowledge Base (updated admission,
startup recovery and resource-isolation patterns).

Still open: hosted multi-worker/proxy configuration and database connection-budget
acceptance; mobile OS process eviction; restart-durable generation; a larger
source-reviewed factual/clinical/vision evaluation; model revision/checksum pinning;
real ASR duration quotas; and provider-backed p95/p99 load/SLO measurement.
These are not labelled tested merely because unrelated regression suites passed.
