# Phase 9.3 - authenticated app shell

Status: implementation under verification. User authorized starting after the completed auth push. Auth evidence is preserved at source `65a63f6`, CI run 39571319509, and documentation commit `5cc49a5` on `verify/auth-guided-onboarding-20261021`.

## Scope

- Authenticated `/app` layout gates children on the existing API-verified profile. Missing sessions redirect with a safe return path; failed verification blocks workspace children and offers retry. Incomplete profiles return to onboarding.
- Reference-shaped desktop sidebar/dashboard and responsive mobile navigation/activity/composer; [authoritative design direction](design-system/app-shell-direction-2026-10-21.md). Core destinations and future-feature empty pages are reachable without fake creation actions.
- A pinned sidebar account menu opens Profile, Settings, Help and Log out. Shared Radix slideouts provide profile, help, mobile navigation and quick page search with keyboard support and focus restoration. Shared skeletons cover route/profile loading; friendly 404 and error boundaries provide recovery.
- Profile shows API-authoritative identity and university/level, with a read-only RLS-protected credit balance. Themes persist locally and to the existing owner-only `user_preferences` table. Writes are serialized and stale reads cannot replace a newer local choice. Account sync failure retains the device preference and offers retry.
- Existing library listing/upload and chat flows are retained. The mobile composer transfers a draft through component memory, never URLs or browser storage, and never starts inference by itself. The user-authorized Sample entries preview empty document/chat histories, Learn cards and activities without persistence or inference. Voice, published guide content, note editing and quiz creation remain unavailable.
- A focused `@pansgpt/ui/shell` export reuses existing primitives. Figma token exports remain untouched. Motion transitions follow [reduced-motion guidance](https://motion.dev/docs/react-accessibility).

The latest correction moves search beside Recent chats, removes notification/profile controls from the header, and places the logo chat shortcut at bottom-right. The former calendar becomes a green study streak heatmap: completed-task dates are real owner/university-scoped reads, while sample hours are explicitly labelled. Daily study duration is not recorded by the current schema and remains an open Phase 10 requirement. The collapsed rail no longer has an artificial viewport minimum height; its account footer remains pinned.

## Compatibility decisions

`@supabase/ssr` 0.5.2 inferred typed database queries as `never` with the current Supabase client. Upgrade the web SSR package to 0.12.7 and verify the complete real auth journey again. The package's browser/server cookie integration remains shared across callbacks, middleware and normal sessions.

Framer Motion 14.4.0 adds the planned route transitions. Declare its React 19 type peer explicitly in the pnpm workspace to avoid Expo's hoisted React 18 types; place server-rendered children inside a host element at the motion boundary. Keep strict TypeScript without casts or `any` workarounds.

No database migration, hosted credential upload, provider privacy change, merge or deployment.

## Verification

Pending final branch CI and screenshot review. The real disposable auth journey and a dedicated shell journey cover verified profile gates, profile data, local/account theme persistence and retries, desktop/mobile navigation, keyboard search/focus, library failure recovery and logout/deep-link protection. Dashboard screenshots exercise the actual Sample fallback for a new account; identity, onboarding, owned conversation creation/history reads and preference writes use real disposable services. No live AI call is made. Covers use distinct local SVG illustrations rather than the reference photographs.

The in-app browser tool remains unavailable before setup (`missing field sandboxPolicy`). Repository Playwright tests and artifacts are the browser verification surface. The shared port-3000 server is left running; a separate preview is used for checks.

Hosted deployment, native-device journeys, provider attestations and Phase 10's remaining data/performance/offline gates are not certified here.
