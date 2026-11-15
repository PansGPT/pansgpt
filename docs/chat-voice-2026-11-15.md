# PansGPT conversation voice — 15 November 2026

User direction: PansGPT should feel like a knowledgeable, approachable senior study colleague. A reply should participate in the ongoing conversation, rather than repeatedly introduce the assistant or only state facts. This applies to both normal and document study chat.

## Scope and acceptance

- Share one voice instruction between the semantic route-or-answer prompt and every regular answer prompt. Brief replies continue to reuse the validated routing completion; do not add a second model call or phrase-based response templates.
- Use the selected conversation to resolve follow-ups, acknowledge corrections and continue the current task. Avoid repeating introductions and generic offers of help during an established exchange. Ask a follow-up only when it helps, rather than adding one to every answer.
- Be warm, candid and collaborative. Match the student's tone without forced slang, flattery or familiarity. Explain plainly and adapt depth to the student; use headings and lists only when they help. Admit a mistake and uncertainty instead of defending an earlier answer or claiming to know everything.
- Preserve AI identity, clinical evidence/safety, privacy, tenant ownership, source honesty, tools and bounded history. Do not pretend to be a human or licensed colleague, invent personal experience or memory, or become more medically authoritative through a friendly tone.
- Check actual synthetic multi-turn output as well as deterministic prompt/history and API contracts. Fixture answers verify wiring; they do not prove model conversational quality. No real student history, uploads or patient data belongs in evaluation fixtures.

No UI, API response, database schema, provider eligibility or persistent-memory change is required. Keep work on `fix/reader-loading-ux` and preserve the user's three existing loading drafts.

## Verification and Engineering handoff

Implemented a shared `ASSISTANT_VOICE` combined with the existing identity for regular prompts and placed after the router's technical protocol for direct answers. Intent labels explicitly do not prescribe a reply template. Clinical prompts now describe teaching as a senior study colleague and make headings/lists optional when conversational prose is clearer. Two short style demonstrations illustrate responsiveness without matching user text or supplying canned runtime replies.

The existing history path is intact: owned selected ancestors feed the router's bounded recent context and the deeper generator's history. No missing-history defect was found for these short exchanges. The baseline model reproduced the user's generic reset despite receiving that context.

Verification:

- **1,077 API tests passed, 90 skipped**, with the existing two dependency deprecation warnings, using `ENABLE_GOVERNANCE=false uv run pytest -q`. This includes **19 new checks** for both direct and streamed answers in normal/study chat, selected history, exclusion of other branches and forged client history, one-completion direct answers, shared voice, and preserved source rules.
- Backend Ruff lint/format passed, as did focused lint/format for the opt-in evaluation tool. UI and TypeScript are unchanged; their previous branch validation is not represented as a new browser run for this prompt change.
- **Four final live synthetic dialogue cases returned valid direct answers** through the existing configured backend routing, privacy and capacity controls. Manual review checked identity repair, continuing the agreed study plan, responding to confusion and owning a factual mistake. The baseline's identity reply ended with a generic offer of help. The final correction was: “You're right—I mixed up the name. I'm PansGPT.” The final plan reply continued the existing topic and named the planned emulsion comparison; the support reply acknowledged that the earlier explanation was abstract and offered a simpler picture.
- [Saved before/after outputs and review notes](chat-voice-evaluation-2026-11-15.json) retain the exact provider/model metadata. These are small samples across available Groq models, not a controlled model comparison or universal personality score. Early prompt revisions still produced boilerplate, and an earlier case could not complete because of capacity/provider failures. Final samples passed the stated qualitative checks; broader multilingual, long-conversation and deeper-generation live evaluation remain open. No model temperature, provider, quota or privacy setting was changed.
- Live evaluation is explicitly opt-in: from `apps/api`, run `uv run python ../../tooling/check-chat-voice.py --live --output ../../.tmp/chat-voice-review.json`; `--case` selects a smaller sample. Only the committed synthetic cases are used; no chat records, retrieval or study tools are accessed. Existing capacity accounting still applies.
- The user's three loading drafts match their original SHA-256 hashes and are excluded from this change. Work stays on `fix/reader-loading-ux`; no push or deployment is part of this task.

Notion tools are unavailable; pending entries:

- **Session / Change Log:** Give PansGPT a shared senior-colleague voice and contextual follow-through. **Date:** 2026-11-15. **Area:** AI / chat. **Files Touched:** guard and intent prompts, API voice tests, synthetic fixtures/evaluation tool, saved evaluation and canonical roadmap/plan. **Verified:** Full API suite, 19 new contract checks, lint/format and four final live synthetic cases with manual review.
- **Decision Log:** Share conversational guidance across direct and generated answers while keeping semantic routing and selected history. **Alternatives Considered:** Only change the model name, add greeting/correction phrase lists, generate every short answer twice, or increase warmth without context and accuracy boundaries.
- **Product Roadmap & Features:** Conversational voice implemented and locally verified with a small live sample; broader evaluation and release gates remain open.

Knowledge Base unchanged; this refines the existing prompt policy.
