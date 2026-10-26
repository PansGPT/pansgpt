# Phase 9.2 shared app primitives

Status: verified at `10239f2a8d3a36af11cd7810e4e6ab99ff9c9948` on `verify/phase-9-2-primitives-20261021`: **122 Chromium checks** and all **seven CI jobs passed** ([run](https://github.com/PansGPT/pansgpt/actions/runs/39525534478)). These are shared library components. App-shell and new product-screen integration retain their staging gate.

## Card

`Card` is a passive container, with `CardContent` and `CardFooter` slots. Reuse the existing `CardHeader`. Keep actual links and buttons inside; the container does not add click handling, a tab stop or nested interactive controls. Callers supply names/landmark roles when appropriate.

```tsx
import { Card, CardHeader, CardContent, CardFooter, Button } from "@pansgpt/ui";

<Card role="article" aria-labelledby="document-title">
  <CardHeader title={<span id="document-title">Pharmacology</span>} headingLevel={3} />
  <CardContent>PHA 201 ? 42 pages</CardContent>
  <CardFooter>
    <Button leadingIcon={null} trailingIcon={null} onClick={openDocument}>Open</Button>
  </CardFooter>
</Card>;
```

## UserInitialsAvatar

The shared `UserInitialsAvatar` preserves name/email inputs, deterministic identity colors and `sm`/`md`/`lg` sizes (32/40/48px). Names take priority; single names use their first two characters; email uses its local part; empty input falls back to PG. Unicode code points are not split into surrogate halves. Colors now use the inherited semantic palette.

The existing web module re-exports the component from `@pansgpt/ui/user-initials-avatar`, so existing page imports continue to work. This scoped export and its CSS module avoid importing the whole shared asset library or relying on Tailwind to scan external source. Token fallbacks keep the avatar styled before full app-theme integration. The legacy component did not expose a ref; that contract remains unchanged.

## Toast

Mount one `Toaster` inside `ThemeProvider`; call the exported Sonner `toast` API from client actions. The wrapper follows Light, OLED Dark and Sepia tokens. Sonner retains its live announcements, action callbacks, automatic/manual dismissal and reduced-motion behavior. The close control has a minimum 32px target. Additional supported Sonner options remain configurable.

```tsx
import { ThemeProvider, Toaster, toast } from "@pansgpt/ui";

<ThemeProvider>{children}<Toaster /></ThemeProvider>;
// After the application confirms a successful operation:
toast.success("Note saved", { description: "Your changes are available." });
```

## Skeleton

Use text, rectangle or circle variants, with optional custom dimensions through `style`. Skeletons are decorative (`aria-hidden`); the surrounding region owns `aria-busy` and a single loading announcement. The pulse stops under reduced motion. `animated={false}` also disables it. Replace placeholders with the actual content when loading finishes.

## ErrorBoundary

The shared wrapper uses the existing Sentry React SDK version (10.74.0). A render failure shows a friendly alert and focuses a keyboard-operable Try again button. The default fallback does not display exception text, stack traces or event IDs. `onReset` lets the caller clear/retry the failed state; a custom fallback and Sentry capture hooks remain available.

Initialize Sentry once in the application. The library does not create a client, configure a DSN or enable replay. It catches descendant render/lifecycle failures; asynchronous handlers, server rendering and network failures require their own handling. The workbench uses a synthetic failure and drops captured events in `beforeSend`, verifying capture and reset without external telemetry. Hosted Sentry delivery is not certified by this check.

## Web consumer compatibility

A compile-only fixture in `apps/web/tests/shared-ui-contract.tsx` imports the root shared exports through the actual Next.js TypeScript configuration. It exposed a pre-existing mix of Expo's hoisted React 18 JSX types and the web/shared React 19 types. The web config now sets `jsxImportSource: "react"`, while keeping Next's preserved JSX emission. A fresh compiler run with this option passed. This follows React's scoped JSX namespace and TypeScript's import-source selection; it does not change Expo's React 18 dependencies, add casts or weaken strict typing.

Primary references: [TypeScript JSX import source](https://www.typescriptlang.org/tsconfig/jsxImportSource.html), [React 19 scoped JSX namespace](https://react.dev/blog/2024/04/25/react-19-upgrade-guide#the-jsx-namespace-in-typescript).

## Verification

Workbench: `/?section=atoms` under the shared preview. New Chromium contracts cover card keyboard actions/mobile overflow/three themes, initials and Unicode cases, reduced-motion loading, toast actions/announcements/dismissal/themes, and Sentry capture plus keyboard recovery. Existing CardHeader/dialog/theme contracts were also rechecked.

- Local initial focused run: **8 passed** (five new primitive contracts, existing CardHeader and two core dialog/theme checks). After the avatar and visual refinements, all **5 primitive checks passed** again.
- UI strict typecheck and lint/source-integrity gates passed: **64 stylesheets**, with all existing 785 variables, 44 text styles, 24 effects, 1,173 icons and 3,246 original assets retained.
- A fresh web compiler run with the root-import consumer fixture passed after explicit JSX type-source selection. CI verified the actual config and the production Next.js build.
- Final [CI](https://github.com/PansGPT/pansgpt/actions/runs/39525534478) at `10239f2a8d3a36af11cd7810e4e6ab99ff9c9948`: **122 browser checks passed in 4.0 minutes**; **427 API tests passed, 14 skipped**; **14 disposable database/worker contracts passed**. All seven jobs passed, including lint/typecheck, web build, image/LibreOffice smoke and the configured security checks.
- Desktop and narrow-mobile previews were inspected in Light, OLED Dark and Sepia. The toast close target measured **32?32px**.

This certifies the shared-library contracts in configured Chromium and the consumer compiler/build. It does not certify hosted ingestion/chat, native auth, full app integration, other browser engines or delivery to a hosted Sentry account. The historical Figma family ledger remains unchanged: these app primitives do not claim additional source-family coverage.
