# Mobile Settings pages and saved-file recovery

Requested on 16 November 2026: reuse the mobile Change password page pattern for Privacy/Data management, investigate missing local PDFs, and finish the previously agreed archive-open and upload preview/download actions.

## Contracts and acceptance

- Desktop retains the current dialogs. Mobile privacy information, uploads, feedback, archived/deleted chats, saved copies and history review use the existing Settings subpage styles, one Back header, focus management and Escape navigation. Destructive confirmation remains a confirmation dialog.
- An authenticated session with unavailable/unverified profile data must not trigger a destructive cache clear. Sign-out clears private copies; successful verification retains only the verified account/university namespace. Existing document authorization still precedes cached reading. Measure actual stored copies; OS Downloads files cannot be measured by this app.
- Archive Open preserves the session and document context. Ordinary reader openings still start an empty study chat; an explicit owned session link loads its validated saved history.
- Existing image preview remains `GET /api/v1/ai/chat/sessions/{session_id}/attachments/{attachment_id}/preview?size=large`: authenticated, normalized PNG bytes, private/no-store, browser blob URL only.
- New download contract: `GET /api/v1/ai/chat/sessions/{session_id}/attachments/{attachment_id}/download`, bearer identity and normal client-auth policy, no request body or user-provided storage URL/key. Shared request identity is `ChatAttachmentReadRequest`. Response is bounded binary attachment data (maximum 10 MiB), `application/octet-stream`, private/no-store, nosniff, safely encoded Content-Disposition. Authorize the owned active conversation/document and attachment; require the exact university/user/session/attachment storage key. A referenced attachment may be read but remains protected against removal. Return 404 for inaccessible/missing records, 503 for temporary storage failures; errors exclude private storage details. No migrations or AI calls are required.
- Loading and failures retain the file list, offer deliberate retry and clear temporary object URLs across close/account changes. Synthetic browser/API fixtures do not certify hosted R2, mobile devices or full offline operation.

## Missing saved PDFs: cause and fix

The auth cleanup previously treated two incomplete states as reasons to clear all private caches: the startup fallback ending before an auth event arrived, and a signed-in session whose profile verification had failed. In either case, an undefined `keep` owner reached `clearPdfCopies`/`clearThumbnailCaches`, whose documented meaning is to remove all owned namespaces. Previews could subsequently regenerate without restoring the PDF copies.

Cleanup now waits for a resolved auth event. A signed-in but unverified profile preserves disk copies without permitting access to them. Successful verification keeps only the verified account/university namespace; explicit sign-out or verified removal of university access clears private copies. This changes neither document authorization nor the cache size/age limits.

Previously cleared copies cannot be recovered from browser storage. Opening those PDFs again saves fresh copies through the normal authorized reader path. Files saved to the OS Downloads folder are outside this browser-managed measurement.

## Delivered UI and file actions

- New Settings detail content shares one implementation across desktop dialogs and the established mobile subpage layout. Existing mobile CSS hides the parent Settings header, leaving one Back/title header. Parent Escape handling returns to the previous Settings page. Management lists use available page height instead of the desktop dialog's inner height limit.
- Privacy information, uploads, feedback, archived/deleted chats, saved-document management and history review use this pattern. Destructive confirmation remains a confirmation dialog.
- Archived conversations have an Open action. Normal chats open in chat; document studies open the reader with an explicit session identity and validate its owned document history. A normal document opening still starts fresh.
- Uploads offer authenticated original-file download, including files already referenced by a message. Unused-file removal restrictions remain intact. Supported PNG/JPEG images also offer private normalized previews, loading/retry states and temporary blob cleanup when leaving the view/account.

## Verification

- Full offline API suite: **1,134 passed, 95 skipped**, with two dependency deprecation warnings. The focused image/attachment/Settings contract slice passed **111 tests**. Covers bounded downloads, canonical tenant/owner storage keys, private response headers, missing/corrupt storage and sanitized errors.
- Web unit suite: **122 passed**. TypeScript workspace gate: **six tasks passed**.
- Browser regressions: **21 distinct scenarios passed** across the regression run and targeted reruns. Covers mobile page navigation, actual saved-copy measurements/removal, two-PDF retention after profile failure/startup delay, explicit sign-out and university-scope removal, archive routing, image preview retry/blob cleanup and actual file download on desktop/mobile. One old layout test expected the previous offline-reading wording; its browser-copy description assertion was corrected and the rerun passed.
- `pnpm lint` passed; final changed components and the full Python Ruff checks also passed. The Next.js production build passed, including its TypeScript check. All four original loading/configuration drafts still match their protected SHA-256 snapshot after the build.
- The auth/cache regression mounts the real `AuthProvider` with an explicit synthetic auth client and mocked profile API. Real browser Cache Storage holds two synthetic copies, including a 7.8 MB copy. After recovery, the real Settings measurement reports two files and their actual 8.3 MB total. No hosted account, real student file or provider inference is used.
- Existing protected loading/configuration drafts are preserved. No new migration, push, merge, deployment or hosted data mutation was performed.

Hosted database/Auth/R2, real-device/native and complete offline PWA acceptance remain open. Account export/DSAR and public chat sharing are still separate unfinished features. Local API/browser fixtures do not certify these release gates.

## Pending Notion synchronization

No Notion connector is available in this session; do not claim synchronization.

- **Session / Change Log:** Summary: Mobile Settings pages, private upload read actions and saved-PDF recovery. Date: 2026-11-16. Area: Settings / Auth / Reader. Files Touched: responsive detail view and Settings pages/styles; auth cache cleanup; owned upload reader/API/shared path DTO; reader session-link handling; synthetic fixtures/tests and canonical docs. Verified: the local checks above only.
- **Decision Log:** Reuse the existing mobile subpage pattern with shared desktop content. Preserve caches during unresolved auth/profile failure, while retaining verified-owner authorization and explicit sign-out cleanup. Read original uploads through a bounded owned API rather than exposing R2 links; image previews reuse the existing normalized private endpoint. Alternatives: duplicate mobile screens, clear all caches during temporary verification failures, or use public object URLs.
- **Product Roadmap & Features:** Mobile owner controls and archive/upload actions locally implemented; hosted/native acceptance, exports and sharing remain open.
- **Knowledge Base:** Auth data cleanup must distinguish incomplete verification from confirmed sign-out. Private upload reads require owned session/document identity, canonical tenant storage key, a download size bound and no public storage URL.
