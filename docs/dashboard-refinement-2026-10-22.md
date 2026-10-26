# Home dashboard refinement — 22 October 2026

The user approved the refinements discussed after comparing Downloads screenshots `Screenshot_22-10-2026_84816_localhost.jpeg` and `Screenshot_22-10-2026_84632_app.notion.com.jpeg`.

## Changes

1. Narrow the desktop Home content to a 1120px container, including side padding, and give the greeting more space above and below. Keep the existing mobile navigation composition.
2. Use the design system's charcoal token for Home's dark canvas. Sidebar and cards retain their secondary surface; the subsequent user-approved shared-theme follow-up below promotes this canvas globally without swapping sidebar/card surfaces or changing stored theme values.
3. Real cards show first-page previews of their actual R2 PDFs, using converted PDFs for Office uploads. With no reading history, show active university library documents under “From your library”. After the user's size feedback, use five desktop columns with 88px covers (80px on tablet); remove card avatars and retain the date. Mobile keeps the existing compact list. Only an empty library retains the labelled sample fallback.
4. Increase Learn cover height and use white backgrounds with black local SVG illustrations, following the user's subsequent correction. Add brief decorative captions; sample guides remain labelled and open local previews.
5. Add an “Up next” heading, schedule skeletons, an illustrated error/empty state and an accessible retry button shared by desktop and mobile. Retry invokes the existing dashboard reload; this improves presentation and does not claim to repair unavailable hosted schedule services.
6. Disable Next.js's floating development indicator so a saved indicator position cannot overlap the bottom-right logo chat shortcut. The chat shortcut and its tooltip remain in the approved position.

Files: `apps/web/components/shell/{app-shell.tsx,dashboard.tsx,dashboard-data.tsx,document-thumbnail.tsx,shell.css}`, `apps/web/lib/{auth-context.tsx,document-thumbnail-cache.ts}`, `apps/web/tests/document-thumbnail-cache.test.mjs`, `apps/web/next.config.ts`, `apps/api/app/{routers/library.py,engines/storage.py,engines/thumbnail.py}`, `apps/api/tests/test_document_thumbnails.py` and linked planning/verification documents. No dependency, database migration, provider-policy or authentication-mechanism change. Auth lifecycle hooks now clear the thumbnail cache.

## Private document previews

`GET /api/v1/library/{document_id}/thumbnail` (also `/api/v1/documents/{document_id}/thumbnail`) checks the existing authenticated document/university boundary, then reads the authoritative original/converted PDF from R2. It returns a PNG with `private, no-store` and `nosniff`; clients supply a bearer token in the header, not in the image URL. The frontend renders a temporary blob URL, revokes it on unmount/token changes, and loads a cover only when visible. Failed previews use a neutral document placeholder, never unrelated artwork.

Rendering runs in a short-lived subprocess with two concurrent slots per API process, a 32 MiB source-read limit, a 12-second overall deadline, an 8-second renderer deadline and a maximum 400×600px output. A timed-out/cancelled renderer is killed and reaped. Temporary files are removed; no thumbnail copies are persisted to R2 or the database. Large, corrupt, locked and unconverted files can remain without a preview.

## Windows failure and cache follow-up

The user's 10:06 screenshot showed generic fallback icons. Earlier standalone rendering and intercepted browser responses had not established that the running API's rendering transport worked. The running Windows Uvicorn reload process uses `SelectorEventLoop`; `asyncio.create_subprocess_exec` raises `NotImplementedError` there. Replace it with `subprocess.Popen` and an off-loop `wait(timeout=8)`, preserving process isolation and kill/reap cleanup. A real selector-loop rendering regression and timeout-cleanup regression now cover this failure. Failed transient frontend requests retry twice; final failures say “Preview unavailable” and log a credential-free diagnostic.

All four real R2 files subsequently returned HTTP 200 PNGs through the actual library route under the Windows selector loop, with real database scope queries and real storage/rendering. That isolated route check used a synthetic identity dependency only, not a mocked image response. The running API's localhost CORS preflight also passed. The user then explicitly confirmed that the actual document pages appeared on Home.

At the user's request, add a binary browser Cache Storage cache, scoped to the verified account and university, with a 24-hour lifetime and a 24-entry cap. Use the document's own `updated_at` as the revision, not its reading-progress timestamp. Revisions replace prior versions, writes are serialized to enforce the cap, and signing out/losing verified identity/changing accounts clears applicable caches. No bearer tokens are stored in cache keys or responses. Only documents supplied by the current authorized dashboard queries can request cached images. Blocked/quota-limited cache storage falls back to normal thumbnail loading. API transport remains `private, no-store`; this explicit user-requested application cache holds only the PNG blobs, not HTTP authorization data.

## Verification

- Web TypeScript check and lint passed.
- All 12 web unit tests passed, including five cache regressions for account/university/revision isolation, expiry, concurrent entry limits, cleanup, cancellation and unavailable storage.
- Local installed-Chrome preview: 12 viewport/theme combinations passed (1845, 1440, 1024 and 375px; Light, Dark and Sepia), including overflow checks. Reviewed desktop and mobile screenshots; screenshots are refreshed after the final white/black Learn correction.
- Desktop/mobile schedule error and retry checks passed; loading and empty-task checks passed. The preview also checked desktop collapse without sidebar overflow, the chat tooltip, monochrome Learn covers and the non-black Home canvas.
- The isolated preview mounts actual dashboard, shell and UI components with synthetic auth/data/navigation adapters. It verifies presentation and local interactions, not real authentication or hosted scheduling/persistence.
- All 446 offline API tests passed; 14 live-service tests skipped. Nineteen thumbnail checks cover authorization, foreign/missing/pending documents, converted PDFs, private response headers, malformed/oversized input, first-page rendering, bounded SDK streaming reads, the Windows reload loop and timeout cleanup. Existing native-dependency deprecation warnings remain unrelated.
- User-authorized read-only verification found four active database documents and confirmed their R2 PDFs exist. All four rendered successfully: PNGs were 400×225 or 400×518px, approximately 11–80 KiB. Browser verification displayed all four actual images using intercepted private requests and confirmed hidden mobile covers make no thumbnail requests. Temporary real-document review files were removed; committed screenshots use synthetic content. No hosted records/files were changed and no inference occurred.
- The local API responds 401 to an unauthenticated thumbnail request. This is not a new hosted-authentication certification.
- A browser check of the actual thumbnail component confirmed a reload makes zero additional thumbnail requests. Revision changes and account changes fetch again. Browser Cache Storage checks passed for cross-account cleanup, expiry, concurrent writes capped at 24 entries, token-free keys and logout cleanup; the latter exercises the cache helper wired into the auth lifecycle. The medium-size covers and absence of document avatars were checked in the same preview.
- The final isolated production build passed for the Windows/cache/size follow-up, including TypeScript and all 16 static pages. Web typecheck, lint and all 12 unit tests also passed; the existing port-3000 development server is left running.

Screenshots are retained in [design-system/dashboard-refinement/](design-system/dashboard-refinement/). The development indicator is disabled through supported Next.js configuration; the synthetic Vite preview does not render Next.js development tools.

The actual local Next.js login page also returned HTTP 200 and passed a browser check for the absence of the floating development badge after recompilation. The first browser navigation timed out during compilation; the subsequent page and browser checks passed. The isolated review server was stopped after verification; the existing app/API servers were left running.

Phase 9.3 remains in Testing for hosted rollout. Phase 10's aggregate API, study-duration capture, offline and performance gates remain open. This change has not been pushed, merged or deployed.

## Notion synchronization

No callable Notion connector is available. Apply the concise follow-up in [the Notion handoff](phase-9-3-notion-sync-2026-10-21.md); verification must retain the local/synthetic scope above.

## Shared charcoal theme follow-up

After the dashboard work was committed as `486271f`, the user requested its colors across all pages. Promote the existing gray-dark-mode-950 canvas into the shared dark `--bg-primary` extension and remove Home's scoped override. The sidebar, cards, borders, text and green accents already use shared tokens; their hierarchy stays consistent. Generated Figma exports and Light/Sepia are unchanged. The visible option is now Dark; stored `oled_dark` preferences retain the existing mapping without a data migration.

Update the existing shared-card color expectation from pure black to the approved charcoal RGB `(12, 14, 18)`. Verification for this follow-up is recorded below separately from the earlier thumbnail work.

Follow-up verification: all seven existing shared-UI card/appearance/interaction browser tests passed using installed Chrome and the compiled preview. An isolated shell check confirmed the same charcoal RGB `(12, 14, 18)` for Home, Chat, Library, Quiz, Notes and Focus navigation paths. That harness mounts real shell components with synthetic dashboard content; it does not establish complete route functionality or hosted integration. Auth remains explicitly scoped to its approved Light presentation. The full lint/typecheck/unit sequence and isolated production build were also started; their final results are recorded separately below when available.
