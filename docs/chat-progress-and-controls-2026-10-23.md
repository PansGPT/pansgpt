# Public progress and chat polish — 23 October 2026

User feedback: generation Stop belongs in the Send position; reduce the welcome greeting, replace raw/code-formatted thoughts with readable updates, show documents without page suffixes, and improve title/sidebar popup menus.

- The primary Send arrow becomes Stop during submission/generation; the separate microphone stays visible and disabled during generation. Empty, idle Send stays gray/disabled. Original compact input geometry and inline branch controls remain as requested.
- Greeting uses a 36px desktop maximum and 26px mobile type. Conversation popups use a scoped 216px surface, regular 13px labels, consistent icons/hover rows and a separator before Delete, using shared semantic colors.
- The HTTP boundary discards provider `thinking_chunk` text and filters recognized thinking tags even when split across visible-text chunks. `thinking_chunk` now carries an allowlisted `code` and static public workflow label. Stages reflect request review, retrieval, tool use and response preparation; repeated stages are deduplicated. No extra LLM call generates these labels.
- Only public workflow labels are saved in `thinking_text` for new responses. History filters older raw thinking on read; existing database rows are not rewritten. Clients independently allowlist progress and render it as a plain list in the collapsible Steps panel, avoiding Markdown code blocks. Token/page payloads retain compatibility; inference/clinical grounding/provider privacy rules are unchanged.
- Source chips show one document title per document, without course-code/page suffixes. Original citation coordinates and chunks remain in the data for future PDF navigation. Web citations retain their external-source labeling.

Verification: full offline API suite **499 passed**, 20 live cases deselected; **6** real SQL/API journeys passed with synthetic staging transactions rolled back, including proof that raw provider/tagged reasoning never reaches saved response/history; **18** web unit tests, source TypeScript, affected ESLint/Ruff and CSS references passed. Both browser journeys pass: primary Stop cancellation restores idle Send, the mic remains separate, progress deduplicates and contains no code blocks, source labels omit pages, and existing session behavior remains intact. No schema change or live provider request was needed.

The preceding production build passed before this later refinement; it is not new build verification of this follow-up. Full CI, physical devices, hosted rollout, public share links and remaining roadmap gates stay open. The preceding migration 33 remains applied via CLI; no migration was repeated.

Files: API `engines/chat_progress.py`, chat router/history and progress regressions; shared chat event DTO; web composer, progress/source rendering, menu styles and greeting; parser/history/message helpers and verification fixtures; canonical roadmap/plan.

Notion handoff: no connector is callable, so these have not been synchronized remotely.

- Session: Public progress boundary and chat control polish; 2026-10-23; Web / API; files above; Verified for the checks explicitly recorded here.
- Decision: Show allowlisted workflow updates instead of raw provider scratchpads; filter before transport/persistence and on legacy reads, with a second client guard. Alternative: format raw reasoning or use another LLM to summarize it. Keep citation coordinates while simplifying display labels.
- Roadmap: Phase 11 remains In Progress; this does not certify hosted release or public sharing.
- Knowledge Base: record the public-progress event contract and legacy read filtering, replacing the former raw-thinking-stream pattern; no stack change.

Reviewed previews: [progress, Stop and popup](design-system/chat-progress-2026-10-23/progress-stop-and-popup.png), [smaller greeting](design-system/chat-progress-2026-10-23/welcome-smaller-greeting.png).
