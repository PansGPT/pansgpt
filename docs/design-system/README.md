# PansGPT design system

The reusable core library is ready in `packages/ui`. On 2026-10-11, the user narrowed the deliverable to the basic components used to build other interfaces. Exhaustive Figma compositions are deferred. The Figma source is [PansGPT](https://www.figma.com/design/upwm9MZsrE4V0XAIj3wWAw/PansGPT).

Build with tokens and themes, typography, buttons, inputs and textareas, selects and comboboxes, checkboxes, radios and toggles, badges and tags, avatars, tabs, breadcrumbs, dropdowns, tooltips, dialogs, dividers, sliders and progress indicators. Components expose typed props, accessible interactions and caller-owned application actions. Existing composed components remain available, but are not required for this deliverable.

## Scope and evidence

[Coverage](coverage.md) applies all 24 page exclusions requested by the user, including the entire Misc icons page. [The family ledger](coverage.json) tracks the earlier exhaustive Figma scope, including source variants and compositions. Its partial statuses do not indicate that the core library is unavailable. Exported static icon masters have a separate asset-ready status.

Archived source data lives in `packages/ui/design`: 785 variables across seven collections, 990 paint-style definitions, 44 text styles, 24 effect styles, and 1,921 component families. The paint archive preserves full precision, bindings, gradient definitions and image hashes; bitmap exports and complete CSS mappings remain separate work. Its integrity is checked against the original Figma export checksum. The page inventory's top-level nodes are a discovery sample, not a complete layout tree. Component-family discovery does not establish that every screen has been visually inspected.

## Use the shared package

[Component contracts](component-contracts.md) describe caller-owned state, upload transport boundaries, empty-state actions, code-snippet tabs/copy/expansion, and source fixture coverage.

Import `@pansgpt/ui/styles.css` once in the application's root stylesheet/layout, then import controls from `@pansgpt/ui`:

```tsx
import "@pansgpt/ui/styles.css";
import { Button, Input, ThemeProvider, Typography } from "@pansgpt/ui";

<ThemeProvider>
  <Typography variant="text-md-regular">Study materials</Typography>
  <Input label="Document title" required hint="Use a descriptive title." />
  <Button leadingIcon={null} trailingIcon={null}>
    Upload document
  </Button>
</ThemeProvider>;
```

The stylesheet bundles locally hosted Plus Jakarta Sans, generated Figma variables, exact text-style metrics, theme extensions, and control styles. The default button includes the Figma placeholder icons; set those slots to `null` for text-only buttons, or pass the intended original icon asset. Icon-only buttons require an accessible label. Form inputs retain native required, disabled, and submission behavior; overlays and keyboard interactions use Radix primitives.

Tailwind v4 projects can additionally import `@pansgpt/ui/tailwind.css` after `@import "tailwindcss"`. This exposes semantic color utilities, spacing, radius, and typography mappings. Plain CSS projects need only `styles.css`.

Use `ThemeProvider` and `useTheme()` for Light, OLED Dark, and Sepia. The provider persists the preference in localStorage and sets `data-theme` on the document root. OLED and Sepia are project extensions in `themes.css`; the generated Figma modes remain intact. Server rendering does not yet include a theme bootstrap to prevent an initial theme flash, and preferences are not yet synchronized to a user profile.

## Preview and checks

```sh
pnpm --filter @pansgpt/ui preview:dev
pnpm --filter @pansgpt/ui lint
pnpm --filter @pansgpt/ui typecheck
pnpm --filter @pansgpt/ui test
pnpm --filter @pansgpt/ui preview:build
```

The isolated preview runs at `http://127.0.0.1:4173`. It is a component workbench and does not add product routes. Playwright verifies form semantics, keyboard interactions, dialog focus containment/restoration, persistence, mobile overflow, reduced motion, local asset loading, default geometry, and typography metrics. Browser installation is a one-time requirement: `pnpm --filter @pansgpt/ui exec playwright install chromium`.

Regenerate foundations with `tokens:generate` and `typography:generate`. Regenerate the ledger with `coverage:generate` after updating its implementation mapping. Lint checks that generated files match their source archives. Hand-edit project theme extensions and control styles, not generated tokens.

## Completed core scope

The source workbench now checks all 666 badge combinations, 300 standard/destructive buttons, 158 input/select variants, 270 checkbox/toggle/textarea/select-row specimens, 72 tags and 216 selectable cards/groups. The card library covers radio, checkbox, icon, pricing, avatar and payment layouts in both sizes and breakpoints. Date pickers, calendars, tables, navigation and foundations also have complete source matrices.

The reusable Dialog is implemented. Exhaustive modal layouts, marketing sections and application screen compositions are deferred under the revised scope. Product integration is a separate task. See [verification.md](verification.md) for the completed checks and their limits.

The logo families, miscellaneous icons and all previously excluded pages remain outside this work. Notion updates are queued in [notion-sync.md](notion-sync.md) because its connector is unavailable.
