# Legacy-inspired auth and guided onboarding ? 21 October 2026

The user requested a review of the legacy `pansgpt-eli` login and five recent Claude onboarding screenshots in Downloads. Their selected details are the original logo artwork/animation and the mobile welcome/sliding form. Desktop must have a flat form area. A later clarification requires preserving the existing green hero, copy and decorative circles, with the tracing logo added to it.

## Implementation

- The SVG geometry is copied into `apps/web/components/auth/brand-art.tsx` from the legacy `AuthHero.tsx` and `public/icon.svg`. There is no runtime dependency on the sibling repository. The original geometry is unchanged; strokes use theme-aware presentation and support pause/reduced motion.
- Desktop retains the green hero, existing text and circles, with the moving legacy mark layered behind it. The form area has no rounded panel/card border or shadow.
- Mobile login starts with a welcome screen and Sign up/Log in actions. Login opens a sliding form; Cancel returns focus to its opener and preserves entered values. Direct signup and recovery routes remain accessible.
- Onboarding is a separate full-page four-step sequence: name, university, academic level, review/agreement. The shared RadioGroup supplies level cards. Back and Edit preserve drafts; only the final accepted review submits to the existing API. There is no role selector or additional profile field.
- Authentication, invitation redemption and API-authoritative profile verification retain the existing backend contracts. No database migration or app-shell work.

## Verification

Pending the verification run for this revision. Tests cover every step at 375px/1440px in all three themes, focus/progress, validation, back/edit retention, university/save retries and absence of premature profile writes. Mobile tests cover welcome/sheet behavior and reduced motion. The existing real signup, email confirmation and password recovery journey remains in the suite.

The in-app browser connection still fails before setup (`missing field sandboxPolicy`). Repository browser tests and their captured screenshots provide the verification surface.

Hosted deployment/email delivery, actual Google/Apple OAuth, native devices, provider privacy attestations and the staging engine journey retain their existing release gates. Phase 9.3 remains unstarted.
