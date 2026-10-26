# Conversation titles and artifact progress — 25 October 2026

User approved naming social/greeting exchanges and replacing that provisional name when a substantive study topic emerges. Manual names remain authoritative.

Implementation contract:

- Internal `TitleSuggestion` returns `{title: string|null, provisional: boolean}`. The model reads selected server-owned history to distinguish social from substantive exchanges; no greeting phrase catalogue. Names use 2–6 descriptive words; social names stay `title_source=pending` and can be replaced after a later successful exchange. Substantive names become `generated`. Manual/generated names and deleted chats are protected by the existing conditional write. No database or public DTO change.
- Header polling publishes provisional titles to the sidebar and continues its existing bounded retry schedule. Completing another answer restarts the check.
- Artifact classification emits the existing allowlisted `creating_materials` progress before waiting for generation. Tool status still begins only when actual dispatch occurs. Raw provider reasoning remains excluded from SSE/history. Provider selection and reasoning settings are unchanged.
- Delete copy identifies the restore path: archive icon beside Recent chats → Deleted → Restore. The archive button's tooltip mentions both archived and deleted chats.

The user's successful trace shows Groq routing in about one second, Google 31B server failure, Google 26B generating the tool arguments, `create_pptx` dispatch after about 32 seconds, and an authenticated artifact download returning 200. Python's presentation tool builds the `.pptx`; Google 26B supplies its content. The earlier interrupted trace alone did not prove generation failure.

## Verification

- All 571 offline API checks passed (26 live checks excluded; two existing framework deprecation warnings). New tests cover provisional-to-final naming, selected context, manual rename races, strict output validation, greeting title scheduling and preparation progress before tool dispatch without raw reasoning.
- Live Groq synthetic-only title-schema probe passed: a greeting returned `Casual Greeting` with `provisional=true`; adding a substantive question returned `Photosynthesis explanation` with `provisional=false`. No database records or real conversation content were sent in that probe.
- Three affected Chrome journeys passed: provisional title → substantive title → manual rename/pin/archive/delete/restore; artifact download retry; and early preparation progress on desktop/mobile before execution, without raw planning or premature Working status. The in-app browser still failed with runtime metadata initialization; installed Chrome/Playwright supplied verification.
- Web TypeScript, affected-component ESLint, all 25 web unit tests, full API Ruff lint and formatting passed. No new production build, hosted rollout or updated live database integration suite is certified by these checks. No migration is required.
- Reviewed screenshots: [provisional title](design-system/chat-titles-and-progress-2026-10-25/provisional-chat-title-desktop.png), [restore instructions](design-system/chat-titles-and-progress-2026-10-25/delete-conversation-desktop.png), [desktop preparation](design-system/chat-titles-and-progress-2026-10-25/artifact-preparation-desktop.png), [mobile preparation](design-system/chat-titles-and-progress-2026-10-25/artifact-preparation-mobile.png).

## Notion handoff

No Notion connector is available in the session; synchronization is pending.

- **Session / Change Log:** Add provisional social chat names and early artifact preparation progress; clarify deleted-chat recovery. Date: 2026-10-25. Area: API + Web. Files: chat_titles.py, chat.py; header.tsx, session-menu.tsx; API/browser tests and canonical plan records. Verified for the explicit checks recorded here.
- **Decision Log:** Keep social titles pending so a later substantive topic can replace them; let the title model classify the selected conversation instead of keyword rules. Publish existing allowlisted preparation progress before generation; do not expose scratchpads or claim tool execution early. Alternatives: leaving all greetings as New chat, permanently finalizing a greeting title, exposing provider reasoning, or changing providers/thinking settings based on a successful generation trace.
- **Product Roadmap:** Update the naming/progress slice under Phase 11; retain hosted integration and release gates.
- **Knowledge Base:** Clarify existing pending/generated/manual title semantics if maintaining a current title-policy entry; no stack change.
