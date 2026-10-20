# Database verification - 20 October 2026

Status: disposable replay, generated types and staging migration checks passed. This does not certify provider privacy, application deployment, worker recovery or native-device journeys.

## Executed verification

| Check                 | Result                                                                                                                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CI revision           | `7d13d4a63277ad73087b898f7987004a3cfde85f`, isolated branch `verify/phase-0-7-database-20261020`                                                                                        |
| CI run                | [All five jobs passed](https://github.com/PansGPT/pansgpt/actions/runs/39411357108)                                                                                                     |
| Disposable Supabase   | CLI start, all 31 migrations, CLI local reset and seed passed                                                                                                                           |
| Database contracts    | 11 passed: tenant/RLS isolation, client mutation and RPC restrictions, UUIDv7, credit idempotency/refunds, durable re-embed preservation, quota limit and service-role hybrid retrieval |
| API suite             | 400 passed, 11 skipped, two dependency deprecation warnings. Nine live database tests are executed separately in the database job; live embeddings and LibreOffice remain skipped       |
| Generated types       | Imported the successful CI-generated `packages/types/src/supabase.ts`; generation normalizes the final newline and writes atomically                                                    |
| Catalog and consumers | 50 public table/column contracts and 18 public RPC argument contracts matched; all six TypeScript workspace checks passed                                                               |
| Other CI gates        | Workspace lint, API lint/format, web SSE tests/build, desktop OAuth protocol tests, migration mirror and secret scans passed                                                            |

The local Windows host has no container runtime. Disposable execution used GitHub Actions rather than installing a large local runtime on a host with limited free storage. No hosted data was used by the disposable tests.

## Staging application and preservation

Target: documented staging project `nrzbjhqtcxlfiyvoeanb`, PostgreSQL 17.6. The Supabase CLI connected through the configured pooler using `db push --db-url`; a separate CLI account token was not required. Credentials were not written to source or logs.

- Initial history: 16 recorded migrations. Applied the 15 pending versioned SQL migrations through `pnpm exec supabase db push`, with an explicit database URL and confirmation flag. No SQL Editor changes and no remote reset.
- The first push applied eight migrations and stopped at the pending retrieval migration. After correcting its hosted-role initialization and passing CI, the CLI applied the remaining seven. Final history exactly matches all 31 versioned migrations.
- Read-only checks verified all 50 public tables have RLS, client profile mutations and privileged RPC execution are restricted, UUIDv7 works under a restricted caller search path, and both retention/credit-reconciliation schedules are active.
- Embeddings remain `vector(1536)` with one HNSW cosine index using `halfvec(1536)`.
- Full-row checksums before and after match for all **4 documents and 275 chunks**. No existing document or chunk was deleted or changed by these migrations.
- Staging seed was not reapplied. Disposable seed execution passed separately. No expired soft-deleted rows were eligible for the newly scheduled retention job at preflight.
- The same read-only catalog comparison passed against staging: **50 tables and 18 RPC declarations**.

## Defects discovered during execution

1. **Unrecorded dimension migration could delete a correct existing index.** Staging already contained 1536-dimensional vectors while the older CLI history entry was missing. Replaced unconditional truncation with a dimension guard: preserve an already-correct index; refuse a populated incompatible index. The pending historical migration is now safe for this upgrade and remains byte-mirrored.
2. **UUIDv7 inherited an RPC's restricted search path.** Credit and re-embed contracts failed to resolve `gen_random_bytes`. Forward migration `20261020104000_uuid_v7_extension_path.sql` pins the generator to `pg_catalog` and pgcrypto's actual extension schema. Added a restricted-path UUID regression.
3. **Hosted role could not validate an unloaded trigram setting.** Unlike the local superuser, hosted `postgres` is not a superuser. Loading `pg_trgm` in the pending retrieval migration registers its user-settable threshold before function creation. Confirmed the cause on staging, added service-role retrieval coverage, then replayed and applied successfully. PostgreSQL documents [custom setting placeholders](https://www.postgresql.org/docs/17/runtime-config-custom.html), and its [pg_trgm initialization source](https://github.com/postgres/postgres/blob/REL_17_STABLE/contrib/pg_trgm/trgm_op.c) registers this threshold as user-settable.
4. **The catalog parser assumed the hand-edited snapshot format.** It now handles actual CLI output, multiple schemas, `Args: never`, unnamed parameters and optional semicolons, and rejects empty/incomplete comparisons. CI artifacts upload only after real generation succeeds.

5. **Seed reactivated unsupported clinical skills.** The final documentation review found seed upserts setting three disabled handlers active after migration replay. The seed now keeps those rows inactive, with a live post-seed registry regression. Staging was not reseeded.

## Remaining release gates

- Deploy and verify the matching API, web configuration and operator-managed workers; exercise readiness, upload/review/ingestion/retrieval, retry recovery and cleanup.
- Verify provider account retention settings and terms. All six external providers remain blocked under strict ZDR until eligible; no live AI calls were performed.
- Verify native OAuth/refresh/logout and secure storage on devices or emulators; finish the separate shared-UI feed-test reliability investigation.
- Update Notion with this new verification evidence. The earlier synchronization was reported by the user's Notion-connected agent; this session has no connected Notion writer.

The working checkout remains on `main` with its existing uncommitted work preserved. The tested implementation is committed and published only on the isolated verification branch; it has not been merged or deployed as application code.
