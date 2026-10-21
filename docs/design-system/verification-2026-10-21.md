# Existing design-system verification - 21 October 2026

Status: verified for the existing shared library. All **117 Chromium browser checks** and all **seven CI jobs** passed at `f7de26e9a4bd29e3f19e95948ebc92192f2aa9fc` ([run](https://github.com/PansGPT/pansgpt/actions/runs/39520508969)). Product integration and hosted release gates remain open.

The later user-approved completion of the remaining Phase 9.2 components is recorded in [app-primitives.md](app-primitives.md), with 122 browser checks and web-consumer verification. The 117-check results below remain the baseline evidence.

## Scope

Maintain the existing Figma library from commit `ad88683`, contributed on 11 October. This work checks its existing controls, tokens and preview and reconciles roadmap entries with that implementation. Product app-shell integration remains subject to the phase 0-7/staging gate. No new product screen, migration, provider eligibility or hosted credential is introduced.

## Defect and fix

- The default Playwright run started the Vite development server. Its feed navigation requested **5,083 resources**, including source modules and asset import wrappers from unrelated families, and exceeded the unchanged **60-second** test deadline before reaching assertions. The second, warmed feed interaction test passed.
- Both unchanged feed tests passed against a freshly built preview: **2 passed in 53 seconds** including server startup. This establishes that a cold source-transformation bottleneck caused the observed navigation failure; it does not establish product rendering performance.
- `packages/ui/scripts/test.mjs` now builds once and runs Playwright with `UI_PREVIEW_BUILT=1`. It forwards CLI arguments, uses the current Node executable on Windows/Linux and propagates build/test failure. Existing assertions, individual timeouts, traces and source geometry remain intact. The interactive Vite preview remains available.
- `pnpm --filter @pansgpt/ui test` uses the compiled preview at loopback port 4174. A new `shared-ui` CI job runs that command with Chromium and its Linux dependencies, a 15-minute global test deadline and a 20-minute job cap.
- Browser readiness now waits for the rendered preview header, settles initial images, waits for fonts and the next painted layout, then starts assertions. `window.load` alone does not establish a committed React UI; [React documents asynchronous root rendering](https://react.dev/reference/react-dom/client/createRoot). Intentional unavailable-image fixtures still own their error assertions, and original source-asset checks remain strict.
- The avatar geometry test explicitly decodes its artwork before measuring an intrinsically sized verification badge.
- The exhaustive 25-page icon check is split into five bounded ranges, keeping the 60-second per-test limit. Every one of the **1,173** original names and source IDs must match the canonical manifest and keep native/rendered 24px dimensions. This adds four tests without reducing source coverage.
- Video playback uses a **1,259-byte**, locally generated, two-second VP8/WebM fixture instead of platform-dependent browser recording and manual EBML patching. It contains a synthetic solid green frame only. Upload, native decode/playback, seek, pause, captions and media errors remain actual browser checks.
- The Chromium test launch uses `--font-render-hinting=none` for subpixel text metrics. Chromium's [headless switch definition](https://chromium.googlesource.com/chromium/src/+/refs/tags/140.0.7339.50/headless/public/switches.h) documents full hinting as the default and its effect on subpixel positioning. This normalizes the comparison environment without changing component CSS or the source-geometry thresholds. Keyboard tooltip checks enter controls through actual Shift+Tab/Tab navigation rather than relying only on programmatic focus. Scroll settling precedes entry because a queued ancestor scroll dismisses the Radix tooltip; an instrumented local run confirmed open ? scroll ? closed while the trigger remained focused. No runtime tooltip behavior was overridden.
- CI retains failed fixture traces/error contexts for one day to diagnose platform issues; these are static workbench fixtures, without hosted credentials or student data.
- Vite reports a large workbench bundle. Runtime code splitting and app bundle performance remain separate work; no warning threshold was raised.

## Roadmap reconciliation

The inherited package already contains three OKLCH themes, Figma typography/spacing/radius variables, Tailwind v4 mappings, buttons, labelled fields, selects, dialogs, badges, tags, avatars and loading indicators. Its documented API uses `tertiary` for the minimal button appearance and a `destructive` option, rather than a separate `ghost` or destructive variant name. Body/display typography uses locally hosted Plus Jakarta Sans; snippets use locally hosted Roboto Mono. Existing original Figma icons remain available alongside the Lucide dependency.

Mark only source-backed and tested library items as implemented. Generic app cards, a shared initials-avatar extraction, Sonner wrapper, Skeleton, ErrorBoundary, authenticated app-shell integration, profile-synced themes and a server-rendered theme bootstrap remain open. Existing selection cards/card headers, notification controls and the web initials avatar are available for later integration.

## Verification

- Cold development-server reproduction: **1 failed, 1 passed**; failure at `page.goto`, before component assertions.
- Compiled feed check: **2 passed**, unchanged assertions.
- First Windows full attempt: **86 passed, 2 failed, 25 not run** when the 15-minute global limit was reached. It exposed the avatar image race and monolithic icon-test timeout; this is not a clean full-suite result.
- Avatar and all five icon ranges plus icon interactions after the fixes: **8 passed** on Windows, covering all 1,173 icons.
- Affected Windows component/media recheck after rendered-resource settling and the portable video fixture: **26 passed**.
- Local UI lint passed: 785 variables, 44 text styles, 24 effects, 62 stylesheet references, 990 archived paints, 1,173 original icons and 3,246 component assets validated. Strict UI typecheck passed.
- Initial Linux CI at `b665227ee02c496faea7b5c62889b9467e69206f` ([run](https://github.com/PansGPT/pansgpt/actions/runs/39516107428)): six existing gates passed; UI browser job reported **103 passed, 10 failed**. Its failures drove the resource/focus readiness and media fixture corrections; no claim of a clean run at that revision.
- Remaining previously unreached Windows families (selection cards, slideouts, sliders, step compositions, tables, text editors and uploads): **17 passed**. These targeted runs are not a single full Windows certification.
- Second Linux CI at `e2dfa7231b29516e1f2f3a28e5b44b4f2fa006f2` ([run](https://github.com/PansGPT/pansgpt/actions/runs/39518407379)): **107 passed, 10 failed**; the video fixture and exhaustive icon checks passed. Remaining failures involved rounded text metrics, tooltip focus and mobile overflow.
- Third Linux CI at `c59bb14086ec71205d8aa7c71c979f4805b31148` ([run](https://github.com/PansGPT/pansgpt/actions/runs/39519883675)): six existing gates passed; **116 browser checks passed, 1 failed**. Subpixel font rendering resolved all geometry and chart-width failures. The remaining tooltip test exposed an ancestor-scroll dismissal race.
- Windows affected-family recheck at that revision: **25 passed, 1 failed** (the same tooltip). After settling the gallery scroll before keyboard entry, that tooltip test passed locally with its original assertions.
- Final Linux CI at `f7de26e9a4bd29e3f19e95948ebc92192f2aa9fc` ([run](https://github.com/PansGPT/pansgpt/actions/runs/39520508969)): **117 passed in 4.5 minutes**; all **seven CI jobs passed**. The same run passed **427 API tests** (14 skipped) and **14 disposable database/worker contracts**, plus lint/typecheck, web build, API container/LibreOffice smoke and the configured secret/dependency scan.
- This certifies the configured Chromium workbench contracts. Other browsers, complete production variant/theme coverage, app-shell integration and hosted performance remain separate checks. No single complete Windows run is claimed.

## Notion

The connector is unavailable in this session. A concise synchronization handoff is maintained in [notion-sync.md](notion-sync.md). Do not mark the full product, app shell or staging journey verified from these component checks.
