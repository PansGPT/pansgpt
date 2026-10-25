# Google sign-in visibility — 25 October 2026

Two independent causes were observed:

- The credentials form initialized an empty provider list and discovered enabled providers after hydration. Slow settings requests delayed the Google button; failed requests were silently ignored.
- A read-only probe of `https://pansgpt-web.vercel.app/login` and its public client configuration found that `/auth/v1/settings` returns **401 Invalid API key** for the deployed Supabase anon key. The project URL matches the local project; the local public key returns 200 with Google enabled and Apple disabled. No account login or OAuth authorization was attempted.

Implementation:

- Resolve public provider metadata on the server before rendering login/signup forms. Cache validated public metadata for 60 seconds, scoped to project URL and public key. Failed lookups, auth sessions and user data do not enter this metadata cache.
- Background refresh preserves verified server options on transient failure. A valid response disabling a provider still removes it. Supabase configuration remains authoritative; Google is not hardcoded as available.
- Settings lookups have a three-second deadline and respect unmount cancellation. Without verified configuration, show loading followed by a retry action instead of silently treating a failed lookup as disabled social sign-in.
- Existing password login, native OAuth handoff, callback destinations, logout and session guards retain their behavior. An invalid deployed public key can affect other Supabase client requests as well.

Deployment repair: in the Vercel project serving `pansgpt-web.vercel.app`, replace `NEXT_PUBLIC_SUPABASE_ANON_KEY` with the matching Supabase project's current **anon/public** key. Keep `NEXT_PUBLIC_SUPABASE_URL` aligned. Apply the values to Production (and Preview if used), then redeploy: `NEXT_PUBLIC_*` values are bundled at build time. Never use a service-role/secret key. No Vercel connector or authenticated Vercel CLI was available; no hosted configuration was changed. At the user's explicit request, the working public values were provided after checking the JWT's `anon` role and matching project reference. No secret key was printed and no key value was committed.

Verification: all 33 web Node tests, web TypeScript and affected-file lint passed. Regressions cover enabled/disabled providers, 401/503 and malformed settings, cancellation and a real bounded timeout. Local `/login` and `/signup` both return 200 with the enabled Google button in their server HTML. Production build/browser checks are pending; external Google account authorization is not claimed.

Follow-up evidence: the isolated production build and all nine CI jobs passed for `002273d` ([run](https://github.com/PansGPT/pansgpt/actions/runs/40198844956)). The user repaired the hosted public key: its settings request now returns 200 with Google enabled. The deployed callback without an authorization code redirects to the correct deployed login URL. A subsequent post-login failure was independently confirmed as a rejected CORS preflight; see [profile verification investigation](profile-verification-2026-10-25.md). These checks do not certify a completed hosted account journey.

Notion handoff (connector unavailable):

- **Session / Change Log:** Fix delayed/hidden OAuth options and diagnose deployed invalid public key. Date 2026-10-25; Area Web / Auth; Files: credentials form, server wrapper, public provider helpers, auth CSS/pages/tests, roadmap and this record. Verified for the checks above; hosted key repair pending.
- **Decision Log:** Render validated provider settings on the server and preserve verified options on transient refresh failure. Alternatives: hardcoding Google, duplicating enable flags, or silently hiding providers on request errors.
- **Product Roadmap:** Auth visibility locally verified; hosted provider configuration and Google journey remain open. No Knowledge Base change for this bounded auth presentation fix.
