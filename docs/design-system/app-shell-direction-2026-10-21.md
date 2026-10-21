# App shell direction ? 21 October 2026

## Authoritative references

- Desktop: `Downloads/PansGPT Dark Study Dashboard (3).png`, selected in the latest user correction. This supersedes `PansGPT Dark Mode Study Dashboard.png`.
- Mobile: `Downloads/Dark-Mode PansGPT Dashboard.png`.

Match composition using the existing shared palette and typography. Keep the green accent; do not copy purple from the reference. Private reference screenshots are not public assets.

## Desktop composition

Brand: **PansGPT**. The collapsible sidebar contains Home, Library, Quiz, Notes, Focus and **Recent chats**. Remove Teamspaces and Private entirely. Chat history comes from the existing authenticated FastAPI session endpoint, separately from document history.

Center the greeting above six **individual recently opened document cards** with distinct cover illustrations, titles and dates. Follow with four illustrated Learn cards and an **Activities** calendar/agenda panel. The cards have separate surfaces and gaps. A circular shortcut containing our original logo sits at the **bottom-left**, with the custom keyboard/hover tooltip **Message PansGPT**, following the explicit user instruction over the image's bottom-right P+ placement.

Use locally authored SVG illustrations for covers; the reference's photographic document thumbnails are not included. Keep this visual difference explicit in verification.

## Mobile composition

Compact brand/profile header, large Library/Quiz/Notes/Focus links, recent-document list and Activity Timetable/Tasks views follow the mobile reference. One fixed message composer transfers a draft in memory to the existing chat without submitting inference. Voice remains unavailable.

## Missing data and safety boundaries

The user explicitly authorized mock content to make the intended design reviewable. Empty histories and schedules show labelled **Sample** entries, six separate document cards, four Learn cards with sample read/watch durations, and example activities. Sample documents, guides and conversations open local previews. They are never saved to an account or sent to an AI provider. Successful real history replaces samples; failed reads retain visible retry states.

Actual document history uses owner study progress joined to active, undeleted documents in the verified university. Tasks use owner and university; timetables use university and level. Chat links reopen owned sessions through FastAPI. API-verified identity gates all children; Supabase RLS remains enforced. All inference stays on FastAPI under strict ZDR.

## Roadmap reconciliation

The user-selected sidebar replaces the former top segmented navigation. The logo shortcut/mobile composer replace the former three-action bottom bar. Use the actual `/app` layout and `user_preferences.theme` table, mapping UI `dark` to database `oled_dark`. Keep appearance controls in the profile drawer, outside auth.

Phase 9.3 provides navigation, guards, profile/theme controls, loading/error recovery and reference-shaped preview content. Phase 10's aggregate API, complete widgets, realtime credit updates, offline cache and performance gates remain separate work.
