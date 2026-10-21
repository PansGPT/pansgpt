# Legacy auth artwork and guided onboarding - 21 October 2026

## Result

Use the original `pansgpt-eli` welcome composition with the shared PansGPT palette. Desktop has a green artwork panel and a flat white form area, approximately 62%/38%. The legacy tracing logo is horizontally centered, lowered within the artwork panel, clipped and faded before its bottom edge to suppress stray animated strokes. The original pharmacy badge, messages and message selectors sit below the artwork.

Mobile uses the legacy diagonal-line animation, typing messages, top-left brand and two standalone bottom pill buttons. The welcome canvas is green, with a white Sign up button and an outlined Log in button, generous touch targets and safe-area spacing. Login/signup open a white sliding sheet. Cancel retains draft input and returns focus to the opener. Direct signup and recovery links remain supported. No Appearance control is shown on authentication or onboarding screens.

The original logo SVG paths, mobile line coordinates and message copy are stored inside the current codebase. There is no runtime dependency on the sibling legacy folder. Animations respect reduced motion, which displays a complete static message without a cursor. Screen readers receive complete text rather than per-character announcements.

Auth uses a fixed green/white palette without rewriting saved Light/OLED/Sepia app preferences. The route-scoped theme also covers shared dropdowns rendered into the document body and restores the previous document theme when its layout unmounts. Figma exports remain unchanged.

Onboarding remains a separate full-page four-step sequence: name, university, academic level, review/agreement. Back/Edit preserve drafts; only final accepted review submits to the existing API. University selection, invitation redemption and profile verification retain their existing backend contracts. No database migration or app-shell implementation.

## Verification

All eight CI jobs passed for final source `65a63f61ce54037e288be0c7e8208a2a2f685fbf` in [run 39571319509](https://github.com/PansGPT/pansgpt/actions/runs/39571319509), including all nine disposable auth browser checks. The preceding local production build passed eight public checks and skipped the live-service journey, which passed in CI. The final mobile action styling was also exercised against the development server. Tests cover both 375px and 1440px layouts, fixed form colors and button contrast, inherited app-preference preservation, absent Appearance controls, desktop artwork placement/message selectors, mobile welcome-to-signup routing, cancellation, short viewports and reduced motion. The disposable-service journey verifies real signup, captured confirmation emails, final API onboarding/retries, password replacement and invalid-link rejection.

Earlier source `9739b357141b341de7f55f202cf3633f75043b54` passed all eight jobs in [run 39564017902](https://github.com/PansGPT/pansgpt/actions/runs/39564017902), including 13 auth checks, before the final legacy-layout/palette changes. That evidence does not certify this latest revision. Source is on `verify/auth-guided-onboarding-20261021`, unmerged and undeployed.

The in-app browser connection fails before setup (`missing field sandboxPolicy`); repository Playwright tests and captured screenshots provide the browser verification surface. The user's screenshot showed the earlier welcome design; this revision addresses the requested design change rather than attributing it to a stale preview.

Hosted deployment/email delivery, actual Google/Apple OAuth, native devices, provider privacy attestations and the staging engine journey retain their existing release gates. Phase 9.3 remains unstarted. Dashboard inspiration is recorded separately in [app-shell direction](design-system/app-shell-direction-2026-10-21.md).


[Desktop login](design-system/auth-guided/login-1440-Brand.png), [mobile welcome](design-system/auth-guided/welcome-375-Brand.png) and [mobile login](design-system/auth-guided/login-375-Brand.png) come from the final successful CI artifact. The desktop screenshot confirms the lower artwork edge is covered without a detached animated line.

Two additional Velour screenshots were reviewed for design feedback: their centered focal artwork, compact desktop form and mobile hierarchy are useful references. The user selected their mobile button treatment: two standalone stacked pills, a solid primary action and an outlined secondary action, without the old outer tray. PansGPT retains the current green/white palette and legacy identity.

The user subsequently authorized proceeding to Phase 9.3 after pushing this auth work. The auth source and evidence remain preserved on this verification branch.
