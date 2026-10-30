# Quiz generation provider compatibility and stopped-job retry

The first real multi-select request stopped after three attempts with zero saved questions. Its persisted message incorrectly promised an automatic retry even though the job was terminal.

Provider diagnostics found two distinct failures: the Google primary timed out and returned HTTP 500 during a synthetic replay; Groq rejected the question schema with HTTP 400 because its constrained JSON subset does not support `propertyNames` on keyed answer maps. The old completion wrapper reduced both failures to a generic runtime error.

Changes:

- Quiz question batches use JSON-object mode on Groq with the explicit schema in the prompt; Pydantic still validates every returned question before any write. Existing routing consumers retain constrained output by default. Question audits remain a separate validated pass.
- Generation rotates through at most eight 700-character source excerpts per batch and bounds recent-question text. Output is capped at 4,000 tokens for question batches and 512 for audits. Google question creation has a bounded longer allowance; provider exceptions log only provider/model/schema/type/status, never prompts, answers, keys or raw error bodies.
- Failed jobs consistently say generation has stopped, including historical rows containing the misleading message. `POST /api/v1/quiz/jobs/{id}/retry` and the authenticated web proxy let the owner retry the same quiz while retaining saved questions and rechecking tenant scope and active-work limits.
- Redis delivery IDs include the row's update timestamp so an explicit retry cannot collide with retained ARQ results from the earlier attempt. Retries acquire the same per-owner advisory lock as new requests.
- The generation page offers **Retry this quiz**, clears stale errors when generation resumes and does not promise automatic retries for terminal/cancelled work.

Verification:

- 674 API tests passed; 40 service-dependent tests skipped. The first run under concurrent build/browser load hit an existing 20ms chat deadline assertion; that unchanged test and the full sequential replay passed.
- 14 isolated PostgreSQL lifecycle checks passed, including preserved questions/new dispatch identity on retry. The updated historical-error assertion also passed independently.
- 50 web unit tests and 14 quiz browser journeys passed; typecheck, web lint, Ruff and Next.js production build passed.
- One live multi-select question from an entirely synthetic teaching passage was generated, structurally validated and source-audited successfully through Groq after Google HTTP 500. No staging records or private course materials were used in that verification. This does not certify a full private-course quiz run or clinical correctness.

The operator replay of the original stopped request was rejected by automatic approval review. Reading the existing provider privacy register supplied additional context, but review still required explicit authorization for sending the course excerpts to Google/Groq. The operator did not replay or mutate that saved request; its last checked state remains failed, three attempts, zero questions. Do not bypass that rejection. Explicit user approval for the payload/providers is pending.

Notion connector is unavailable. Pending entries:

| Gallery                    | Entry                                                                                                                                                                                                                                                                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session / Change Log       | Date: 2026-10-26. Summary: Repair quiz provider schema compatibility and misleading retry behavior. Area: Quiz / AI / API / Web. Files: completion transport, quiz generation/service/retry/router/worker, web API/proxy/workspace, regression tests and canonical plans. Verified: checks above; original course quiz replay pending approval. |
| Decision Log               | Use provider-compatible JSON with strict backend validation for keyed maps; bound and rotate evidence; separate explicit retry from terminal failure and version ARQ delivery identities. Alternatives: weaken question validation, keep unsupported constrained schemas or reuse retained Redis job IDs.                                       |
| Product Roadmap & Features | Generation compatibility and same-request retry locally verified; synthetic live multi-select passes; private-course replay awaits explicit provider-data authorization.                                                                                                                                                                        |
| Knowledge Base             | Provider-constrained JSON is a transport capability, not the validation boundary. Strict Pydantic validation and source checks always precede persistence; durable retry identities must differ after a stopped request is requeued.                                                                                                            |
