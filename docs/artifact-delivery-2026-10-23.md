# Artifact delivery fixes — 23 October 2026

User report: PPTX download returned 404, slide content appeared both in chat and the file, and tool execution created a redundant box beneath Thinking.

- The card sent generated `artifacts/...` keys to `/library/documents/download`, which checks library document records. It now uses `/library/artifacts/download`, preserving backend owner/university checks. Key-only metadata and historical API links resolve to the canonical route. Download credentials go only to the configured API origin, never arbitrary payload URLs.
- Download failures appear on the card with a retry action. Blob URLs are released after dispatch; pending downloads are cancelled when the component/account changes. Attachment filenames support Unicode; missing R2 objects return 404, storage outages return 503, and bytes use `private, no-store`.
- The skill engine formerly advertised a download after failed/unconfigured storage in local development. Every downloadable artifact now requires a successful upload. Storage failure emits failed tool/error events and no download card. Synthetic test uploads are explicitly mocked; there is no implicit local success path.
- The previous tool result explicitly requested an educational summary after generating a file. Successful document/PDF/PPTX/Markdown file calls now finish with a brief server-owned confirmation, skip a second synthesis call and suppress that file-call turn's visible outline/preamble. Ordinary answers and research-tool synthesis remain supported. The prompt no longer requests public internal deliberations.
- Public tool status appears inside the existing Steps panel. Native assistant-ui tool parts remain available to the runtime; the generic standalone fallback box is hidden. The download card uses shared semantic theme colors and works at desktop/mobile sizes.

Existing messages/files are not rewritten. Correcting the route makes stored files accessible; an old card whose upload never succeeded requires regeneration. No migration or live AI call was needed. Provider privacy, clinical grounding and tenancy checks remain in place.

Verification:

- Full offline API suite: **505 passed**, 20 live cases deselected; two existing dependency deprecation warnings. A regression generates actual PPTX bytes, uploads to an explicit in-memory test store, downloads through the authenticated API, verifies identical bytes and opens the slide deck. Foreign-owner access remains 404. Storage failure/unconfigured storage, Unicode headers and missing-object/outage handling are covered.
- Web unit suite: **22 passed**; source TypeScript and affected ESLint/Ruff checks passed.
- Three browser journeys passed, covering existing chat/session behavior plus PPTX download, 404-to-retry recovery, byte equality, canonical API authorization and tool-status consolidation. After adding scoped theme styles, the artifact journey passed again at desktop/mobile sizes.
- Isolated Next.js 16.3.8 production build passed, including TypeScript and all 16 routes. It reported the same 204 existing generated CSS warnings from Figma slash-variable classes; the running development server was left intact.
- The browser/API file checks use synthetic fixtures, not live R2 or provider inference. Hosted rollout, live provider journeys and remaining Phase 11 release gates remain open.

Reviewed previews: [desktop card](design-system/artifact-delivery-2026-10-23/presentation-card-desktop.png), [mobile card](design-system/artifact-delivery-2026-10-23/presentation-card-mobile.png), [inline retry](design-system/artifact-delivery-2026-10-23/artifact-download-retry-desktop.png).

Files: web artifact card/styles, artifact-download helper and unit tests; chat reasoning/message/runtime rendering; API skills, LLM, guard and library router; artifact-delivery/storage/security regressions; synthetic browser deck and interaction fixture; canonical roadmap/implementation plan and this record.

Notion handoff: no Notion connector is callable in this session; remote entries have **not** been updated.

- Session / Change Log: Fix generated artifact downloads and file-only responses; 2026-10-23; Web / API; files above; Verified for the completed checks recorded here.
- Decision Log: Require successful storage before announcing downloadable files and finish file-generation turns with a concise confirmation. Rationale: prevent dead links, duplicate slide outlines and unnecessary synthesis calls. Alternatives: local phantom links and model-generated post-file summaries.
- Product Roadmap: Phase 11 remains In Progress; record completed delivery checks without certifying hosted release.
- Knowledge Base: clarify the artifact transport contract: owned `artifacts/{university}/{owner}/...` keys use the artifact endpoint; storage precedes announcement; status belongs in Steps; file content belongs in the attachment. No stack change.
