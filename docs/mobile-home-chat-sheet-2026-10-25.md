# Mobile Home chat sheet

User-directed mobile changes, 25 October 2026. References: the two WhatsApp screenshots in Downloads. Keep PansGPT colors and the original Home input styling.

## Final scope and contracts

- Home Recents remains document-only after the user reverted the combined chat/document proposal. Preserve the existing reader-history/library states, labelled empty-state samples and desktop document cards.
- The original Home pill and plus/microphone/send controls remain. Tapping its input opens the sheet without inference; Send inside the sheet is explicit. Mobile input text is 16px.
- The nearly full-height sheet slides up/down. Its header has no logo, a circular History control, and New chat plus a horizontal ellipsis in a shared rounded surface. Match the reference proportions: History/search controls are 44px; the New chat/menu pill is 108 by 44px, with 40px-high icon buttons and a 16px side inset.
- The later 19:13 reference adds floating controls over scrolling content, with an empty middle. The user subsequently rejected glass buttons: use solid theme surfaces and a subtle border. A separate top fade with soft background blur lets scrolling text disappear behind the controls; it does not change the solid buttons. History replaces the right action group with Search. Its inline search uses the existing authenticated backend with cancellation, retry and pagination, not just filtering the loaded sidebar rows.
- History enters from the left. Selecting an owned conversation slides back to the conversation; keep the modal DOM mounted so its opening animation does not repeat. Use existing authenticated history, metadata and mutation contracts, with the desktop pin/rename/archive/delete actions in the ellipsis menu.
- Hide the conversation-title/Share header and the static study-support footer on mobile. Desktop keeps both. Metadata polling for pending conversation titles continues independently of the hidden mobile header.
- Reuse assistant-ui and the existing backend for messages, attachments, branches, streaming and presentation previews. No new API, provider, migration or public DTO is introduced.
- Closing stops generation/recording and retains the current runtime/draft/attachments only while Home stays mounted. New chat resets it; navigation/account/university changes dispose it. No draft or file content enters URLs or persistent browser storage.
- Trap modal focus, restore it on dismissal, keep hidden panes inert, honor reduced motion and use visual-viewport/safe-area sizing. Keep scrollable messages inside the sheet.
- Swipe right from chat to reveal history, left from history to return, and down from the top strip or an unscrolled pane to dismiss. Follow the finger and settle short gestures back. Preserve normal vertical scrolling, input editing, text selection and multi-touch; button alternatives remain available. Native touch listeners must cover the portalled chat DOM.
- Home's plus icon opens the native file picker and sheet, not the old Quick search handler. Hand the selected batch to the same assistant-ui composer after the study notice is accepted; enforce the existing four-file/10 MB limits. Selection does not upload, create a session or invoke inference. Clear pending handoff state on new-chat/account/university changes.

## Verification

Local verification: the complete web Node suite passed 44/44; the existing title/session API guards passed 18/18 with mocks. Desktop navigation and session-menu regressions passed during this change. All three mobile Home journeys passed across focused runs, covering document-only Recents, draft/attachment retention, streaming/cancellation, history search, saved-session switching without remount, menu actions, consent, a shortened viewport and microphone cleanup. The final 108 by 44px pill lifecycle check passed. Web typecheck and affected-file lint passed. The last top-fade amendment only changes CSS. Hosted deployment, real-device keyboard, production build/full CI and the disposable auth journey remain separate release gates.

Swipe/attachment follow-up: all five mobile Home browser journeys passed across the focused runs. Chrome native touch dispatch verified right/left navigation, down dismissal from both panes, short/cancelled gestures, editor exclusion, draft retention and normal scrolling inside a populated conversation. The coordinate-based test waits for the opening animation before sending touches. Home plus selected a local file before consent, made zero POST requests until consent and explicit Send, then uploaded and sent its owned attachment UUID successfully. Web typecheck and affected-file lint passed. These checks use synthetic fixture data and do not certify a physical iOS/Android device or hosted deployment.

## Notion handoff

Connector unavailable in this session; no Notion write claimed. After final checks, log the mobile Home sheet and responsive chat refinement under Web/UI, with the files in this change and actual verification scope. Record the choice to reuse the runtime behind a persistent modal instead of duplicating chat or reopening the sheet on session changes. Update the Phase 9.3/11 feature record without completing hosted/native gates. No stack change.

Follow-up session entry: **Summary:** Add guarded sheet swipes and fix Home attachment shortcut. **Area:** Web / Chat UX. **Files:** `mobile-home-chat.tsx`, `use-sheet-swipe.ts`, `mobile-home-chat.css`, `chat/surface.tsx`, `app-shell.tsx`, chat browser journeys and canonical docs. **Verified:** local scope above. **Decision:** physical-DOM touch listeners cover the React portals; pending files enter the existing local composer adapter rather than uploading from Home or opening search. **Roadmap:** local frontend slice verified; hosted/native gates open.

The reported repeated old titles were investigated separately: [historical placeholder and metadata-backfill findings](legacy-conversation-title-investigation-2026-10-25.md). No saved title was changed by that investigation.

## Merge verification follow-up

PR #3 exposed an outdated mobile assertion and a popup-dismissal regression. The full-page mobile journey now opens conversation actions from navigation, while confirming that the title/Share header stays hidden. Chat popups identify their portal layers so interactions and Escape dismiss the frontmost menu/dialog without closing the persistent Home sheet. Two focused browser journeys passed together with synthetic data; web typecheck passed. Current-head PR CI and the Vercel Preview deployment must be checked again after this fix. The preceding head passed eight CI jobs, including disposable database/auth verification, but failed two chat-browser checks; it was not merged. No hosted or physical-device completion is claimed.

Notion follow-up: **Summary:** Preserve the mobile sheet beneath conversation popups and update responsive action contracts. **Area:** Web / Chat UX. **Files:** `chat/dialog.tsx`, `chat/session-menu.tsx`, `shell/mobile-home-chat.tsx`, chat browser tests and this record. **Verified:** focused local browser/type checks only. **Decision:** explicitly recognize sibling runtime portal layers rather than unmounting the shared runtime or restoring the removed mobile header. **Status:** merge validation pending. Notion connector remains unavailable.
