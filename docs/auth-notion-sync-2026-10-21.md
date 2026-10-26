# Auth refinement — Notion handoff

Pending synchronization: this session has no callable Notion connector. Read the final results in [the verification record](auth-refresh-2026-10-21.md) before applying this prompt.

> Update Engineering for the existing auth-screen refinement on `verify/auth-refresh-20261021`. Scope: recovery completion, shared-design-system presentation and auth journey/theme verification. Phase 9.3 was explicitly excluded.
>
> Add a Session / Change Log row: **Refresh auth screens and complete password recovery**; Date: **2026-10-21**; Area: **Web / Authentication / CI**. Files: `apps/web/{app,components/auth,lib,tests}`, `apps/web/playwright.config.ts`, `apps/web/package.json`, `packages/ui/{src/auth.ts,package.json}`, `supabase/config.toml`, `.github/workflows/ci.yml`, `tooling/run-auth-browser.py`, `.gitignore`, `pnpm-lock.yaml`, and the auth/roadmap/implementation documentation. Evidence: source `6e44e670750b25e2b27bba3d30fd7db0bf90a8c4`, [CI run 39556574232](https://github.com/PansGPT/pansgpt/actions/runs/39556574232), all eight jobs passed, including all 11 auth browser checks with real captured emails. Set Verified: true for the tested disposable scope; retain the documented hosted/native/provider limits.
>
> Add a Decision Log row: **Reuse shared auth primitives and verify with disposable services**. Rationale: retain the cofounder's design system and current route contracts, complete PKCE email recovery, and exercise actual Supabase/FastAPI behavior without exporting hosted credentials. Alternatives: replacing authentication infrastructure, inventing another UI library, testing against hosted student data, or bundling the web app shell into this change.
>
> Update the relevant auth/Phase 9 roadmap notes: `/login`, `/signup`, `/forgot-password`, email confirmation, `/update-password` and `/onboarding` share three themes and accessible form controls. Preserve invitation destinations, API-authoritative profiles and explicit university selection. Keep every Phase 9.3 app-shell item unchecked and the hosted/native/provider release gates open. Source is on a verification branch and has not been merged or deployed.
>
> Do not change the Knowledge Base: the authentication stack and its authority boundaries are unchanged. Do not mark production email delivery, real Google/Apple OAuth, native-device storage, hosted staging journeys or provider ZDR eligibility verified.


## Follow-up: legacy welcome and guided onboarding

Use [the final implementation/verification record](auth-guided-onboarding-2026-10-21.md), including its final CI evidence, for this subsequent revision. Add a separate change-log row, **Restore legacy welcome artwork and introduce full-page onboarding**, dated 2026-10-21; Area: Web / Authentication. Files: `apps/web/components/auth`, `apps/web/tests/auth`, `packages/ui/src/auth.ts`, `packages/ui/src/components/theme.tsx` and the linked docs/screenshots. Evidence: source `65a63f61ce54037e288be0c7e8208a2a2f685fbf`, [CI run 39571319509](https://github.com/PansGPT/pansgpt/actions/runs/39571319509), all eight jobs and all nine auth browser checks passed. Set Verified: true for this disposable scope; source remains unmerged/undeployed.

Record the final design decision: use the original desktop tracing logo and mobile diagonal animation/typing welcome composition, with locally copied SVG geometry and copy. Desktop uses a green artwork panel with a centered/lowered logo, stronger bottom fade, a flat white form area and the wider artwork/narrower form proportions. Mobile uses a green welcome canvas, two standalone bottom pill buttons (solid white Sign up and outlined Log in, following the supplied Velour reference), and white sliding forms. Remove Appearance controls and retain saved app preferences. Onboarding keeps four full-page steps, Back/Edit draft retention and final-only API submission. Alternatives: identical artwork/form surfaces, a rounded desktop panel, the single long onboarding form, or changes to backend auth/profile contracts. Update the auth roadmap note; keep every Phase 9.3 gate open. No Knowledge Base change is needed because stack and authority boundaries are unchanged.

The user selected desktop/mobile dashboard layout references from Downloads; see [app-shell design direction](design-system/app-shell-direction-2026-10-21.md). Record layout direction only, retain our shared palette and leave implementation gates unchecked. No Notion entries have been written by this session because no callable Notion connection is available.

The user authorized Phase 9.3 next, using the dashboard layout references after the auth push. Track shell implementation and verification as a separate change log, not as completed by this auth evidence.
