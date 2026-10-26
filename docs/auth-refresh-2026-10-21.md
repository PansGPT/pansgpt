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

All **eight CI jobs passed** at source commit `6e44e670750b25e2b27bba3d30fd7db0bf90a8c4`: [verification run 39556574232](https://github.com/PansGPT/pansgpt/actions/runs/39556574232). Source is published on `verify/auth-refresh-20261021`; it has not been merged or deployed.

- **11 auth browser checks passed**, with no skipped auth tests: real signup and captured confirmation email, PKCE session exchange, API-authoritative onboarding and retries, logout/login, captured recovery email, password confirmation validation, global sign-out, old-password rejection, new-password login and rejection of a reused recovery link.
- All five form screens were checked at **375px and 1440px** in **Light, OLED Dark and Sepia**. Public-screen checks also cover field focus/errors, password visibility, theme persistence, expired links, invite retention, rate-limit recovery, enabled-provider filtering and a synthetic desktop OAuth handoff failure.
- Keyboard skip-link/form submission and primary-button text contrast (**at least 4.5:1**) passed in Chromium. Primary buttons and input containers have a 44px minimum height. The inherited design tokens remain intact; the auth presentation uses the existing darker brand token for white-text buttons and the story panel.
- Local web lint, TypeScript and **7 Node unit contracts** passed. Production Next builds passed locally and in CI. The existing **427 backend tests (14 skipped)**, **14 migrated database/worker contracts** and **122 shared-UI checks** passed, along with the container and secret-scan jobs.

The auth job starts disposable Supabase, replays migrations/seed, starts FastAPI and the production Next build, and captures actual email links in Mailpit. No hosted keys, hosted data or external AI calls were used. Its local Supabase uses explicitly configured JWT-secret verification; hosted asymmetric JWKS behavior retains the existing backend unit gates and awaits a deployed journey.

Reproduce in an isolated disposable checkout with its own local Supabase project: `pnpm exec supabase start`, `pnpm exec supabase db reset --local`, then `python tooling/run-auth-browser.py --live`. Reset discards that local project's data. Ports 3000/8000 and the configured Supabase ports must be free. The orchestrator refuses hosted Supabase targets and stops its owned test servers on exit.

Screenshots from the successful CI run: [desktop login](design-system/auth/login-desktop.png), [OLED mobile signup](design-system/auth/signup-mobile.png), [Sepia mobile password recovery](design-system/auth/password-recovery-mobile.png). Complete synthetic-account screenshots are attached to the CI run with one-day retention.

The in-app browser connection failed before opening a tab (`codex/sandbox-state-meta: missing field sandboxPolicy`). Automated browser screenshots are the visual review evidence for this session.

Remaining release gates: hosted deployment and email delivery/redirect allowlists, actual Google/Apple OAuth, native-device secure storage, provider ZDR attestations, and the existing staging engine journey. These checks do not certify production readiness.

Notion synchronization is pending: use [the concise Engineering handoff](auth-notion-sync-2026-10-21.md).
