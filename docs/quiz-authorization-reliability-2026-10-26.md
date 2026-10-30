# Quiz authorization connection reliability

The quiz workspace intermittently returned `Authorization store is unavailable` after activation. The error came from the authoritative profile lookup, before quiz storage or question generation.

Read-only connection probes measured approximately 2.94-3.08 seconds for Supabase connection setup, plus about 0.41 seconds for a trivial query. Profile authorization supplied a three-second pool acquisition timeout. Because asyncpg acquisition includes establishing a cold connection, concurrent page requests could time out even while the database was healthy. The old direct-connection fallback repeated that short deadline and bypassed the configured pool size.

`apps/api/app/core/database.py` now gives acquisition the caller's queue allowance plus a bounded ten-second connection budget. Direct connections before pool initialization have explicit connection and query deadlines. Failed acquisition from an initialized pool returns unavailable without opening additional connections. Authorization still reads current roles and tenancy from PostgreSQL and fails closed; cached roles never grant access. Logs report exception types without dumping connection strings.

Verification:

- Four new regression cases cover cold authorization, pool timeout/network pressure without connection multiplication, and bounded direct connection setup. Existing consumer-exception propagation checks also pass.
- Full API suite: 671 passed, 39 service-dependent tests skipped. Ruff lint and formatting pass.
- Eight concurrent authoritative profile lookups succeeded against staging in 6.88 seconds, with no private profile fields printed.
- Real quiz course and history service reads succeed; this is backend verification, not a claim of completing an authenticated browser or generated-quiz journey.
- Local API and ARQ worker restarted with the fix; API health responds 200. No schema or student-data edits were needed.

Notion connector is unavailable. Pending concise entries:

| Gallery                    | Entry                                                                                                                                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Session / Change Log       | Date: 2026-10-26. Summary: Fix cold database timeouts affecting quiz authorization. Area: API / Auth / Database. Files: connection helper, connection regression tests, this record and quiz handoff. Verified: tests and live read-only checks above. |
| Decision Log               | Budget cold connection establishment separately from queue waiting; retain pool limits instead of opening extra connections after acquisition failure. Alternative: increase only the auth caller timeout or keep direct fallback retries.             |
| Product Roadmap & Features | Quiz authorization reliability: locally verified after staging activation; full generated-quiz and hosted/native journeys remain open.                                                                                                                 |
| Knowledge Base             | Initialized pools enforce connection bounds. Acquisition failure never triggers extra direct connections; authoritative role/tenant reads continue to fail closed.                                                                                     |
