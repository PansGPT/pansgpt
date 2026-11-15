# Chat errors and notices — 15 November 2026

User decision: distinguish a failed chat action from an informational notice. Follow the supplied legacy screenshot: an inline error row with a simple message, error icon and a right-aligned rounded Retry button. Keep dismissible banners for offline status, attachment limits and validation guidance. Running/automatic-recovery progress belongs to the existing AI thinking status.

Scope: shared main/study chat response failures, retryable attachment uploads and recoverable transcription failures. Keep existing backend retry limits, owned-message recovery, tool replay restrictions, retained files/recordings, unfinished drafts, and safe public error wording. Do not display provider/network exception details such as `Failed to fetch`.

Use semantic error/background/border tokens in Light, Dark and Sepia. Center the copy and action vertically, shorten mobile copy using the existing mapping, and keep upload/transcription actions accessible as `Retry upload` and `Retry transcription` while their visible label is `Retry`. Errors remain visible until recovery; they have no dismiss button. Informational notices retain their dismiss control.

Implementation is integrated into `fix/reader-loading-ux`, as clarified by the user. Merge the tested retry-error work while preserving the branch's existing loading commit and all uncommitted loading files. The temporary design branch and worktree can be removed after verifying that their work is included.

Acceptance and verification:

- Response failures show the inline row beside its Retry action, without a dismiss button, on desktop and mobile in all three themes.
- Retry reuses the owned failed question without duplicating messages or losing an unfinished draft. Saved-answer recovery and tool replay restrictions remain enforced.
- Failed uploads retain their file, show the row above the composer, and upload only after explicit Retry. Keep the existing atomic geometry assertion.
- Transcription retries reuse the recording. Offline, attachment-count and validation notices stay dismissible banners.
- Lint, typecheck and applicable browser journeys must pass; retain screenshots for design review. Synthetic browser fixtures do not certify hosted/provider/native release gates.

Verified locally: **15 targeted browser journeys passed** (14 recovery/notice checks plus the main-chat timeout journey), including desktop/mobile error rows in all three themes, vertical alignment, no overflow, owned-message retries, saved-answer recovery, blocked tool replay, retained uploads and recordings, offline notices and attachment limits. Web typecheck, focused component lint, JavaScript syntax, formatting and diff checks passed. The initial browser run hit a Chrome launch failure and was interrupted; the final completed checks above passed. No dependencies were installed for this work; the isolated checkout reuses existing installed tools.

Design previews: [desktop](design-system/chat-error-rows-2026-11-15/chat-error-desktop.png), [mobile](design-system/chat-error-rows-2026-11-15/chat-error-mobile.png). These show synthetic test data. The design is now part of the reader loading branch and remains unpublished; no CI or hosted verification is claimed for the new design.

## Thinking-status clarification

The user clarified that "This is taking longer than usual" is live AI activity, not an error or notice banner. Reuse the existing `ThinkingStatus` for both slow responses and automatic "Trying again?" feedback. Keep its matrix loader, text swap, theme tokens and reduced-motion behavior; do not add a separate banner, dismiss control or Retry action while generation is still running. Display the thinking status during recovery even when partial answer text is already present, then remove it when the response completes. Terminal response failures still use the inline error row.

The 12-second inactivity threshold, server recovery events and safe retry rules are unchanged. Browser fixtures now hold completion until the status assertions finish, instead of leaving a short timing window before the synthetic response completes. Verify desktop/mobile slow states, recovery with partial text, single-request behavior, completion cleanup, and the existing error/notice distinction.

Thinking previews: [slow response on mobile](design-system/chat-error-rows-2026-11-15/reader-slow-thinking-mobile.png), [automatic retry on desktop](design-system/chat-error-rows-2026-11-15/chat-automatic-thinking-desktop.png).

Additional pending Engineering entry: **Summary:** Show slow and automatic-retry feedback through the existing thinking UI. **Area:** Chat / reader. **Files Touched:** shared assistant message, recovery browser journeys, this record and previews. **Decision:** Reuse the existing transitions-dev thinking-state component instead of a notice banner. **Alternatives Considered:** Dismissible progress banner or failure-style Retry row. **Verified:** Eight focused browser checks passed, covering desktop/mobile slow and retry states, partial answers, completion cleanup, failure rows, offline and validation notices. Web typecheck, lint, syntax and formatting passed.

Notion tools are unavailable. Pending Engineering entries:

| Gallery                    | Entry                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session / Change Log       | **Summary:** Separate inline chat failure rows from dismissible notices. **Date:** 2026-11-15. **Area:** Chat / reader / web. **Files Touched:** shared chat error/notice, message, attachment and CSS components; recovery browser checks; this record and previews. **Verified:** 15 targeted browser journeys, web typecheck, lint, syntax and formatting passed locally. |
| Decision Log               | **Rationale:** Give failed actions a visible recovery button while reserving dismissible banners for guidance and status. **Alternatives Considered:** Reuse the warning toast for every error; expose raw network/provider messages.                                                                                                                                        |
| Product Roadmap & Features | **Chat error presentation:** Implemented and locally verified; integrated into the reader loading branch for review.                                                                                                                                                                                                                                                         |

Knowledge Base unchanged; this is presentation within the existing recovery architecture.
