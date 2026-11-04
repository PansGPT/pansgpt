# Settings UI refinement — 29 October 2026

## Scope and decisions

- Preserved the other agent's settings prototype in commit `b6b873d` before refinement. Current work stays on `feat/settings-modal`.
- Kept the original Account / Preferences / System groups with nine separate sections: Account, Security, Credits, Appearance, Notifications, Privacy & Data, Study & Wellbeing, Data & Storage, and About PansGPT. Credits uses the same Coins icon as the balance summary.
- Security has its own page. Removed raw user IDs, provider/model internals, unrelated avatar styling and invented commercial plans. Reused shared avatars, controls and theme tokens.
- Retained downloaded-document management, storage overview, cache clearing, exports, shared chats, uploaded files, feedback and conversation management UI. Storage figures are synthetic and visibly labelled Sample.
- Removed Getting started and the shortcut list from About. Get help remains in the account menu; Keyboard shortcuts opens an optional standalone dialog. About retains feedback, version and legal rows.
- Made settings action buttons compact: 30px desktop height, 34px mobile height, 6px corner radius, tighter padding and smaller icons. This styling is scoped to settings content.
- Bounded the modal in short windows, kept mobile fields at 16px, made hidden mobile panes inert, and preserved focus when returning from sections or closing dialogs.
- Removed Log out from the Account page. On mobile, the profile card is the single entry to Account; Security and Credits remain in their group, and the root menu retains Log out.
- Extended the app's shared custom scrollbars to the portalled settings modal and settings subdialogs, including nested panes, search results and textareas. Thin theme-aware thumbs, transparent tracks and forced-color handling use the existing shared rules.
- Following the WhatsApp Account reference, removed only the outer borders from mobile detail cards and the credits summary. Preserved card backgrounds, rounded corners, padding, form styling and internal row dividers. Mobile detail headings that repeat the header are hidden. The root menu retains its grouped navigation.
- Mobile Account follows the reference's simple layout: centered avatar, one borderless rounded profile card with name/email/university/level rows, plain inline values, and a separate red Delete account row. Its form boxes, duplicate profile summary, save button and deletion explanation are hidden on mobile. The name and level draft controls remain usable, including through search.
- Mobile detail pages use grouped cards and plain inline row controls, keeping backgrounds, rounded corners and internal dividers. After the user's size correction, mobile row values/inline controls use the smaller 12px size with 13px labels. Desktop retains its earlier form typography and controls. Expanded password/feedback editors retain their existing text sizes.
- Mobile detail-card dividers are inset 18px at both ends, matching Account. Mobile-only wording removes repetitive descriptions, for example Password / Manage your account password becomes Change password, and Cached files & previews becomes Clear cache. Desktop wording is unchanged. Mobile row actions use named chevrons; retention/recovery notes remain visible where useful.
- The later Notifications WhatsApp reference clarified that helper text should be selective: retained concise mobile explanations for notification switches, wellbeing reminders, response detail, offline downloads, exports, removal/cache actions and recovery. Straightforward actions remain label-only.
- Privacy follow-up: every Privacy & Data row has a concise mobile description, including protection, data use, policy, exports, shared chats, uploaded files, feedback, archived chats and deleted chats. Desktop wording and styling are unchanged.
- Response detail follow-up: mobile uses a title/control line and a full-width description below, removing the fixed dropdown width that squeezed the explanation. Desktop layout is unchanged.
- About follow-up: Send feedback is a row alongside the other About items; its form opens in a dialog on demand, with focus returning to the row on close. The final send action remains the same disabled UI preview.
- Replaced all five native settings dropdowns with one shared `SettingsSelect` built on the existing Radix Select primitives. It uses theme tokens, compact row triggers, a floating option list, selected checkmarks, keyboard navigation, collision positioning and shared custom scrollbars. Preserved draft values and the academic-level Not set choice; no new dependency or API behavior.
- Extended the borderless-card treatment to the main mobile Settings menu: profile card, grouped menu cards and Log out keep their backgrounds/corners; group dividers are inset 18px at both ends, matching detail pages.
- Mobile Home profile now opens the Settings sheet directly, with focus returning to it on close. The root sheet omits its visible Settings title; detail-page titles remain.
- Scope correction: restored desktop's prior flat detail sections, full-width dividing lines, horizontal account identity header and bordered profile controls/save area. Mobile grouped cards, inset dividers, compact profile layout and shorter wording stay inside the mobile breakpoint. User-requested shared dropdowns, compact action buttons and on-demand feedback remain available on desktop.
- Replaced the static profile outline with a credit ring based on the owned `user_credits.balance / lifetime_earned` fields (remaining as a share of total credits received, not a monthly allowance). Credit reads refresh on window focus, return to the tab, accepted chat reservations and completed/failed/cancelled runs. Unknown balances show a neutral track; the browser never decrements the authoritative balance itself. No schema or API contract changed.

## Integration boundary

This is the user-requested UI review and refinement. Existing theme, logout and owned credit-read flows are reused. Other preference selections are local drafts; final save/payment/export/deletion actions remain disabled. No migrations, new API contracts, live storage deletion or backend settings implementation were added. Phase 17 integration gates remain open.

## Verification

- TypeScript and affected ESLint passed. ESLint also passed after the final code changes.
- Both focused desktop/mobile browser journeys passed after the compact-button adjustment, including draft state, separate Security, storage/privacy controls, short-window bounds, mobile pane focus and the optional shortcuts popup. The shared account-menu navigation journey also passed before the final visual adjustment.
- Next.js production build passed with synthetic public build configuration; all 16 static pages generated. This does not verify hosted settings integration.
- Browser preview uses synthetic account data and intercepted API requests.

Final follow-up checks: affected ESLint and TypeScript passed; all three settings/shared-navigation desktop/mobile journeys passed. Credit-ring checks use synthetic balances to verify full/partial/empty/unavailable states, direct mobile profile-to-settings opening and focus return. The latest production build passed after custom-dropdown integration, before the subsequent credit-profile wiring; the final wiring was checked with lint, TypeScript and browser journeys. Live Supabase refresh after a real debit/refund remains unverified in this UI session.

Visual review: [mobile account](previews/settings-2026-10-29/account-mobile.png), [desktop search](previews/settings-2026-10-29/search-desktop.png), [mobile menu](previews/settings-2026-10-29/menu-mobile.png), [desktop storage](previews/settings-2026-10-29/storage-desktop.png), [mobile storage](previews/settings-2026-10-29/storage-mobile.png).

Latest mobile wording review: [notifications with explanations](previews/settings-2026-10-29/notifications-mobile.png), [simple security actions](previews/settings-2026-10-29/security-mobile.png). The final mobile journey verifies 12px profile values, 18px divider insets, short mobile labels and retained notification/offline/recovery information. Desktop wording was checked in the desktop journey before the last mobile-only explanation adjustments; affected lint passed afterward.

Desktop scope restoration: [Account](previews/settings-2026-10-29/account-desktop.png), [Data & Storage](previews/settings-2026-10-29/storage-desktop.png). Desktop and mobile browser journeys both passed after this correction; the first desktop attempt timed out during the local preview's cold navigation and the isolated rerun passed. Layout assertions now distinguish flat desktop sections/bordered form fields from mobile grouped cards and inset dividers.

## Notion handoff

No Notion connector is available in this session; remote synchronization has not occurred.

- Session: Refine settings UI; 2026-10-29; Web / Settings; files under `apps/web/components/shell/settings`, account menu, app shell, shortcuts dialog and settings browser tests. Verification follows the results above.
- Decision: Retain separate categories and planned storage/privacy controls; compact settings actions and move shortcut reference out of About. Alternatives: merged categories, removed controls, inline onboarding/shortcuts block.
- Roadmap: Phase 17 UI preview under review; backend and live acceptance remain pending. No Knowledge Base update needed for this UI-only change.

Queued chat work remains tool-specific cards, richer code/diagram rendering, then quoted replies.

## Search reference implementation

- Search now preserves the full navigation and shows a floating result list with the section and matching setting, such as Account / Full name, using PansGPT theme tokens.
- Selecting a result opens its section, scrolls to the setting and focuses its enabled control (or its row when its action is disabled). Read-only rows remain discoverable.
- Added arrow-key selection, Enter to open, Escape to dismiss results before the modal, empty-result feedback and one search focus outline. Search indexes setting labels/aliases, not profile values.
- Follow-up verification passed: affected ESLint, TypeScript, both desktop/mobile browser journeys. Browser checks cover pointer/keyboard search selection, scrolling results, direct input/switch/disabled-action-row focus, no-result feedback, Escape closing the popup first, preserved navigation, custom scrollbar styles, a single mobile profile entry, matched profile-value font sizes and preserved rounded cards without outer borders. The production build passed before the final cosmetic/account-row changes; those final changes were checked with lint/TypeScript and browser journeys.

## Credits restoration ? 2026-10-30

- Restored the earlier Credits content by user request: available balance summary, Credit usage and Purchase history. Removed the replacement institutional billing content and automatic purchase-assistant entry from Settings; purchase-assistant source files remain untouched.
- Reused the existing mobile rounded cards, compact rows and inset dividers, with desktop's existing layout rules. Removed purchase-specific fullscreen state from the Settings modal and the superseded mobile billing-row CSS.
- Unknown balances display Unavailable, with no invented credit allowance or purchase records. Usage/purchase actions remain UI placeholders as before.
- Verification: affected ESLint and TypeScript passed; both existing desktop/mobile Settings browser journeys passed using synthetic data. Mobile checks cover 320/390/430px overflow, rounded borderless cards, inset dividers, restored content and unavailable balances. Visually reviewed the [restored mobile Credits page](previews/settings-2026-10-29/credits-mobile.png).
- Notion sync pending: no Notion connector is available. Session log: Restore earlier Credits settings UI; Web / Settings; account-section.tsx, settings-modal.tsx/.css and settings.spec.cjs; verified for the local UI scope above. Decision: restore the prior page rather than restyle the replacement billing prototype. Phase 17 remains UI review; no architecture/Knowledge Base change.
