# Existing design-system verification - 21 October 2026

Status: feed timeout reproduced and the compiled-preview fix verified on both feed tests. Complete-suite, lint/type and CI verification are in progress.

## Scope

Maintain the existing Figma library from commit `ad88683`, contributed on 11 October. This work checks its existing controls, tokens and preview and reconciles roadmap entries with that implementation. Product app-shell integration remains subject to the phase 0-7/staging gate. No new product screen, migration, provider eligibility or hosted credential is introduced.

## Defect and fix

- The default Playwright run started the Vite development server. Its feed navigation requested **5,083 resources**, including source modules and asset import wrappers from unrelated families, and exceeded the unchanged **60-second** test deadline before reaching assertions. The second, warmed feed interaction test passed.
- Both unchanged feed tests passed against a freshly built preview: **2 passed in 53 seconds** including server startup. This establishes that a cold source-transformation bottleneck caused the observed navigation failure; it does not establish product rendering performance.
- `packages/ui/scripts/test.mjs` now builds once and runs Playwright with `UI_PREVIEW_BUILT=1`. It forwards CLI arguments, uses the current Node executable on Windows/Linux and propagates build/test failure. Existing assertions, individual timeouts, traces and source geometry remain intact. The interactive Vite preview remains available.
- `pnpm --filter @pansgpt/ui test` uses the compiled preview at loopback port 4174. A new `shared-ui` CI job runs that command with Chromium and its Linux dependencies, a 15-minute global test deadline and a 20-minute job cap.
- Vite reports a large workbench bundle. Runtime code splitting and app bundle performance remain separate work; no warning threshold was raised.

## Roadmap reconciliation

The inherited package already contains three OKLCH themes, Figma typography/spacing/radius variables, Tailwind v4 mappings, buttons, labelled fields, selects, dialogs, badges, tags, avatars and loading indicators. Its documented API uses `tertiary` for the minimal button appearance and a `destructive` option, rather than a separate `ghost` or destructive variant name. Body/display typography uses locally hosted Plus Jakarta Sans; snippets use locally hosted Roboto Mono. Existing original Figma icons remain available alongside the Lucide dependency.

Mark only source-backed and tested library items as implemented. Generic app cards, a shared initials-avatar extraction, Sonner wrapper, Skeleton, ErrorBoundary, authenticated app-shell integration, profile-synced themes and a server-rendered theme bootstrap remain open. Existing selection cards/card headers, notification controls and the web initials avatar are available for later integration.

## Verification

- Cold development-server reproduction: **1 failed, 1 passed**; failure at `page.goto`, before component assertions.
- Compiled feed check: **2 passed**, unchanged assertions.
- Normal test command: fresh preview built; **113 tests** running.
- Shared UI lint, strict typecheck and complete CI: pending.

## Notion

The connector is unavailable in this session. A concise synchronization handoff is maintained in [notion-sync.md](notion-sync.md). Do not mark the full product, app shell or staging journey verified from these component checks.
