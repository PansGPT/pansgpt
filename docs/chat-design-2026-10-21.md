# Chat page reference refinement - 21 October 2026

Status: implementation under verification.

The user selected `Downloads/PansGPT Dark Study Dashboard.png` for the chat page (the supplied `.ong` extension was a typo). Follow its centered personal greeting, wide pill composer, four suggestion pills, bottom Recent cards and sidebar New chat action. Keep the existing semantic palette, approved sidebar account menu and original sidebar/Home backgrounds. Do not restore the reference's header notification/profile controls or copy its purple/blue canvas.

## Implemented scope

- Empty chat shows the greeting, prompt input, Explain a concept / Create study notes / Generate quiz questions / Summarise a document pills and Recent cards. Suggestions only prefill and focus the input.
- Recent cards read the existing owner-verified chat/document feeds. Empty accounts show labelled Sample chat/library/quiz/note cards with local previews. No sample is saved or dispatched to an AI provider. This is not the later aggregate dashboard endpoint.
- New chat resets local conversation state and aborts an active response. Cancellation also covers the initial session-creation request, preventing a late creation response from starting inference after navigation.
- Existing FastAPI session history, streaming parser, source citations, tool badges, artifacts and academic acknowledgement remain. Session creation responses are validated before use. A successful creation refreshes recent activity.
- Desktop uses a roomy centered composer and four-column Recent row; mobile uses a compact composer, two-column suggestion pills and single-column Recent cards. Light, OLED Dark and Sepia use shared tokens. The input respects the existing 10,000-character API limit.
- Voice and attachments remain unavailable with labelled disabled controls. No browser calls an AI provider. Strict ZDR remains unchanged.

## Verification

Pending final CI and screenshot review. Extend the existing real disposable-auth shell journey to capture chat at 1764/1440/375px in all three themes, check suggestion focus, sample previews, owned session reopening, memory-only draft transfer, synthetic SSE rendering and New chat reset. Inference is disabled on the CI API; the streaming browser check intercepts the request with a synthetic SSE response.

The in-app browser connection fails during initialization (`missing field sandboxPolicy`), so repository Playwright checks and synthetic CI screenshots provide browser verification. No hosted user or provider account is used.

This is a visual refinement of the existing engine-backed chat. Phase 11's full assistant-ui integration, markdown/LaTeX, branches, message actions, live voice and attachments remain open. No migration, merge or deployment is part of this change.
