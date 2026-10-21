# Auth refresh — 21 October 2026

Scope authorized by the user: finish recovery, refresh existing auth screens with the inherited design system, and verify journeys, responsive layouts and Light/OLED Dark/Sepia themes. Phase 9.3 remains unstarted.

## Implementation

- Existing `/login`, `/signup`, `/forgot-password`, `/onboarding` URLs retained; added `/update-password`.
- Shared auth layout consumes `@pansgpt/ui/auth` and existing semantic tokens, fields, buttons, selectors and theme provider. No app-shell work or database migrations.
- Confirmation/recovery emails use the PKCE callback. Reset completion updates the password, revokes refresh sessions through global sign-out, and returns to login. Existing access JWTs remain valid until expiry, as enforced by Supabase.
- Callback destinations are restricted to internal application paths; errors use fixed public messages. Redirects preserve refreshed/cleared session cookies, and onboarding invite query parameters survive the login boundary.
- Universities and profile/roles remain API-authoritative. University selection has no default; failed requests can be retried with drafts retained. Existing desktop OAuth bridge remains supported; external sign-in buttons appear only for enabled Supabase providers.
- Local Supabase now requires email confirmation and permits local callback URLs. Hosted Auth settings are unchanged.

## Verification

Pending the verification branch CI run. The new auth browser job starts disposable Supabase, replays migrations/seed, starts FastAPI and the built Next app, and captures real signup/recovery emails in Mailpit. No hosted keys or external AI calls are required.

Local public-screen checks cover mobile/desktop, three themes, field errors, password visibility, expired-link handling, invite preservation, request failures and a synthetic desktop OAuth failure. The live disposable journey also checks onboarding retries, sign-out, old-password rejection, replacement-password login and used-link rejection.

The in-app browser connection failed before opening a tab (`codex/sandbox-state-meta: missing field sandboxPolicy`). Automated browser screenshots are the visual review evidence for this session.

Remaining release gates: hosted deployment and email delivery/redirect allowlists, actual Google/Apple OAuth, native-device secure storage, provider ZDR attestations, and the existing staging engine journey. These checks do not certify production readiness.
