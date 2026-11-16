# Settings review and core study recovery — 16 November 2026

Reviewed `0318cad36598321453374d796c323cc6db550537` on `feature/settings-storage-privacy` against the storage/privacy handoff. The follow-up changes are local and uncommitted. No push, merge, deployment, hosted mutation or provider inference was performed.

## Review outcome

The submitted Settings implementation connects useful owner controls, but its report overstated some recovery and verification coverage. This review corrected the following:

| Finding                                                                              | Resulting behavior                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cache reads could fail silently and appear as zero usage; size headers were trusted  | Read failures remain recoverable errors; measurements use response-body bytes, including expired entries still occupying storage. These are app-managed body bytes, not an estimate of all origin storage or browser overhead.                                                       |
| A pending reader/thumbnail write could recreate removed data                         | Work captures an owner/category epoch before downloading. Removal invalidates older work and coordinates with writers. Web Locks serialize operations across supported tabs; an in-process queue supports the fallback. Future authorized reads can still cache new copies.          |
| Cache management did not reconcile other-tab changes                                 | Measurements and an open saved-document list refresh on storage-change notifications and focus; stale list reads cannot replace newer results. Removal preserves other account/university namespaces, saved PDFs when clearing previews, cloud records, auth and drafts.             |
| Saved-copy rows displayed IDs with no useful metadata                                | Available titles resolve through authenticated, authorized reader metadata; rows show cached dates and measured sizes, with a fallback when metadata is inaccessible.                                                                                                                |
| Reopening dialogs or changing accounts could retain old lists or accept late results | Dialogs mount for each opening and owner/university identity. Initial private-list requests check cancellation; account changes close/reset Settings and reject the old list.                                                                                                        |
| Uploads, feedback, archives and trash stopped at the first page                      | Management lists offer bounded pagination and preserve existing rows when another page fails. Mutation results reconcile offsets.                                                                                                                                                    |
| Bulk deletion kept successfully deleted rows selected after a partial failure        | Successful rows are removed; a deliberate retry targets remaining failures. Work stops scheduling further deletes after close/account change. Existing backend soft deletion, run cancellation and retention remain authoritative.                                                   |
| Active history review excluded document studies and could not page                   | `GET /api/v1/ai/chat/sessions` accepts bounded `offset` and `scope=chat\|all`. Normal history defaults to its previous scope; Settings explicitly requests all active owned sessions. Owner/university/document checks remain backend-controlled and responses are private/no-store. |
| Owned upload listing did not validate the attachment's stored tenant namespace       | Results require an owned undeleted conversation, the current university's canonical attachment key and an accessible university document context where applicable. Referenced attachments remain protected against removal.                                                          |
| Some new UI classes had no styles; empty meters retained sample widths               | List controls and loading indicators use existing patterns/tokens; zero/unavailable storage does not display a sample filled meter.                                                                                                                                                  |
| Privacy text overstated exclusions and omitted the Tavily exception                  | Disclosures distinguish approved Google and public-query Tavily exceptions, local provider attestation and hosted verification. Export/sharing controls visibly remain unavailable. Local copies do not promise complete offline access.                                             |

The agent's reported Session/Decision Notion entries were supplied by the user; this session could not independently read them back. The implementation still does not certify all of Phase 17.

## Three confirmed core study defects fixed

1. **Quiz navigation:** an in-memory draft scoped to owner, university and attempt preserves unsaved answers/flags across client-side navigation before the 550 ms autosave. Restoration requires the same server revision and an in-progress attempt. Successful saves reconcile newer edits; submission, explicit saved-attempt reload, sign-out and account changes clear applicable drafts. No score, answer key or timing authority moved to the client. Full browser reload/offline persistence remains outside this transient recovery mechanism; the existing unsaved-navigation warning remains.
2. **Snip Ask AI:** upload failure restores its generated question when the composer was empty, retaining the image for deliberate Send. Existing text is preserved, and closing/cancelling still prevents a late send.
3. **Quiz retry:** a successful load clears the previous error. Retrying a saved attempt/job/result keeps the requested route rather than redirecting to the dashboard.

Two reader tests were reconciled with the committed loading design: reader chrome remains visible while app chrome stays absent, and the reader fills the viewport instead of assuming a 25 px fixture offset.

## Verification

- Web unit suite: **122 passed** (`node --test apps/web/tests/*.test.mjs`). Includes cache read errors, body-size measurement, old revision aggregation, owner separation, failed deletion, a blocked active write and stale-download fencing, plus draft ownership/revision reconciliation.
- Final full offline API suite: **1,127 passed, 95 skipped**, with two dependency deprecation warnings. The private-header and bounded-query contract slice also passed **53 tests**.
- Next.js production build: passed, including a final build after the cross-tab list correction. The final changed storage component also passed ESLint.
- Browser checks: **23 unique scenarios passed**, using synthetic preview adapters and real Chrome: eight quiz scenarios, six reader/snippet scenarios, five original Settings scenarios and four new Settings review scenarios. Includes actual Cache Storage measurement/removal and live updates to the open manager from a same-origin second tab, account changes with a delayed response, pagination and partial-delete retry. The account-change test was corrected to reopen Settings after its intentional identity-change close; its final rerun passed.
- `pnpm lint`: passed (two configured workspace tasks); changed Python files also passed Ruff checks/formatting. `pnpm typecheck`: six workspace tasks passed.
- All four protected draft files match their original SHA-256 snapshot. The production build preserves/restores `next-env.d.ts`. No user draft was staged or committed.
- No schema migration was required. Two transactional real-SQL regressions were added to the existing explicitly gated live fixture for upload tenant filtering and feedback internal-note exclusion/pagination. They remain skipped without a configured disposable test database; mocked API tests do not prove SQL execution.

Local evidence: `.tmp/review-web-unit.log`, `.tmp/review-api-final-full.log`, `.tmp/review-api-final-contracts.log`, `.tmp/review-quiz-browser.log`, `.tmp/review-reader-browser.log`, `.tmp/review-settings-edge-browser.log`, `.tmp/review-settings-account-browser.log`, `.tmp/review-settings-mobile-browser.log`, `.tmp/review-settings-cross-tab-browser.log`, `.tmp/review-lint-all.log`, `.tmp/review-typecheck-all.log`, `.tmp/review-build.log`.

## Remaining acceptance and feature boundaries

- Hosted Supabase/auth/R2 journeys, real database execution, true cross-tab contention on supported devices and native/real-device checks remain open. The browser preview uses explicit synthetic API/auth adapters. No provider privacy or production gate is marked verified by these checks.
- The original review identified direct archive opening as a handoff gap. It is now implemented in the [mobile/private-read follow-up](settings-mobile-and-downloads-2026-11-16.md), preserving the session and study document context.
- The original review identified upload preview/download as a handoff gap. The [follow-up](settings-mobile-and-downloads-2026-11-16.md) adds supported image previews and a bounded, authenticated original-file download endpoint. This does not implement general account export or public sharing.
- General account export/DSAR, public chat sharing, OS Downloads folder access and a complete offline PWA remain separate work. No fake success/empty results were added for these controls.
- The four original loading/configuration drafts remain user-owned. Follow-up fixes were not committed, pushed or merged.

## Pending Notion synchronization

No Notion tool is available in this session; do not claim synchronization.

- **Session / Change Log:** Summary: Settings review corrections and core study recovery. Date: 2026-11-16. Area: Settings / Reader / Chat / Quiz. Files Touched: scoped cache helpers, Settings dialogs/styles and session-list/upload reads; quiz draft/runtime recovery; matching tests, shared query DTO and canonical docs. Verified: local checks above only; hosted and real-SQL gates remain open.
- **Decision Log:** Retain quiz navigation drafts in scoped memory, preserving existing autosave and backend revision authority. Alternatives: unmount-only writes can fail/race; persistent browser storage/outbox would expand privacy and offline scope. Coordinate cache removal with epochs and supported browser locks rather than claiming success from uncoordinated deletion or clearing other owners' namespaces.
- **Product Roadmap & Features:** Settings owner controls and core recovery are locally verified increments; retain in-progress status and the listed acceptance gaps. Export, sharing and hosted verification remain pending.
- **Knowledge Base:** If updating core patterns, record transient scoped quiz drafts and cache writer/removal coordination only; do not change the stack or provider eligibility policy.
