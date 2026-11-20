# Rich chat outputs — implementation contract

Baseline: all prior workspace changes committed as `bc078a3` on
`feature/settings-storage-privacy`.

Scope: the shared normal/study assistant message renders all eight existing skill
outputs: Word, PDF, PowerPoint, Markdown notes, charts/diagrams, flashcards,
mnemonics and chemical metadata. Search, document reading and image analysis have
compact public execution summaries. This adds presentation, not new AI tools.

Contracts: preserve the existing artifact envelope and Chart.js-style labels and
datasets. Add bounded typed content for cards, mnemonics, chemical metadata and
line/bar/scatter/Mermaid graphs. Notes accept the backend's existing string
content. Old or malformed content must show an unavailable preview without
breaking the message, losing valid files or blocking history.

Acceptance: keyboard-operable flashcards with hints and local review progress;
chart legends, values and accessible data tables; isolated diagrams with no
scripts, network access or model configuration; accurate mnemonic notes; chemical
metadata without automatic third-party image requests; authenticated file actions;
compact tool summaries without arguments, raw results or private reasoning.
Streaming and saved history use the same renderers on mobile and desktop in all
three themes. Local review marks are not persisted study scores or SRS scheduling.

## Implementation

- Flashcards: reveal question/answer, optional hints, previous/next, restart and
  local reviewed marks. Controls work with keyboard and touch.
- Graphs: line/bar/scatter views, series toggles, point values and an accessible
  data table. Mobile axis labels remain readable and the last active series stays
  visually active. Model callbacks, arbitrary Chart.js configuration and HTML are not
  executed. The backend strips extra fields and rejects invalid/bounded data.
- Diagrams: lazy local Mermaid rendering, strict configuration, bounded source
  and edges, blocked directives/links/HTML, CSP and a sandboxed output iframe.
  Mermaid fences in assistant text wait until streaming completes. Source stays
  available when rendering fails. Rendering follows the
  [official Mermaid security configuration](https://mermaid.js.org/config/usage).
- Mnemonics: concept, numbered breakdown and optional clinical notes use the
  actual backend keys, correcting the old `drug_or_class`/`concept` mismatch.
- Chemical outputs: formula, SMILES, structure notes and an explicit PubChem
  link. The old automatic external image request was removed. No new molecular
  drawing engine or enabled composer action is claimed.
- Notes: safe Markdown/math preview and existing authenticated file downloads.
  Word/PDF/slides retain their file actions; the actual owned PPTX workspace is
  preserved, with clearer file labels.
- Tool activity: compact expandable public tool names and execution states;
  unknown tools have a neutral fallback, and interrupted runs show Stopped.
  Arguments, provider reasoning and raw result payloads are never displayed.
- History: accept text note content and nullable file fields from the actual
  backend envelope. Invalid nested rich content gets an unavailable preview
  instead of crashing the message. Shared components serve normal and study chat.

No schema migration, new provider call, persistence of review scores or deployment
is included. Existing authorization and artifact download boundaries remain.

## Local verification

- Full offline API suite: **1,141 passed, 95 skipped**. After stricter numeric
  validation, the focused artifact/tool suite: **28 passed**.
- Web unit suite: **126 passed**.
- **12 distinct browser scenarios passed**, using explicit synthetic fixtures:
  desktop/mobile rich history and reload; streaming artifacts; bar/scatter and
  three themes; desktop/mobile study flashcards; artifact progress; presentation
  preview/retry/navigation/download; and three native Markdown/public-thinking
  scenarios including reduced motion.
- One initial cold preview navigation timed out; the repeat reached the app and
  passed. Three legacy scenarios first used the wrong temporary preview port;
  their corrected run passed. The presentation label assertion was updated for
  the new label and that complete journey passed separately.
- Workspace lint and all six TypeScript checks passed. Ruff lint/format passed.
- Production web build passed, including compilation, TypeScript and route
  generation. The committed Next type-reference file is preserved.

Hosted provider generation, hosted Auth/R2, native devices and broader phase
release gates remain open. Browser fixtures prove local UI integration, not those
hosted services.

## Pending Notion synchronization

No Notion connector is available in this session; these entries were not sent.

- Session / Change Log: **Rich normal/study chat output cards and tool activity**;
  Date **2026-11-18**; Area **Chat / AI / Reader**; files: artifact components,
  message rendering, SSE/history parsing, shared/Pydantic content contracts,
  skills, tests and canonical documentation. Verified: local tests above only.
- Decision Log: **Render bounded skill output data with shared cards**; rationale:
  saved/live parity and consistent responsive presentation without executing
  model code; alternatives: generic JSON/file-only output, remote diagram
  viewers and automatic external chemical images.
- Product Roadmap & Features: tool-specific rich chat cards **locally implemented**;
  hosted/provider and phase acceptance **pending**.
