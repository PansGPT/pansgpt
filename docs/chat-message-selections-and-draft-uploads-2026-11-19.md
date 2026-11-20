# Message selections, draft uploads and search logs

User-approved scope: show selected study tools and library PDFs in sent messages; retain them through failure, reload, Retry, regeneration and editing; upload supporting files while composing; restore readable routing and reranking details.

## Contracts and execution

`ChatMessageContext` in `packages/types/src/chat.ts` and its Pydantic counterpart contain nullable `action_mode` and `library_document: {id, title}`. The backend writes this record as `image_metadata.message_context` with the user message, returns it in SSE `init.context`, and serializes it as `context` in history. The existing JSON column needs no schema migration.

Requests retain their existing flat `action_mode` and `document_id` fields. Titles come from an active, undeleted document authorized in the authenticated university. Every replay rechecks that authorization before claiming a run; stored titles and client selections cannot bypass it.

- Retry/regenerate execute the original saved tool and source. Existing tool replay fences still apply.
- Editing restores the original selections. Omitted fields inherit them; explicit null removes them. Editing can select another supported tool or authorized library source. Omitted attachment IDs preserve the original files; an explicit empty list removes them.
- New follow-ups inherit the selected parent branch's source, never its tool. A cleared source remains cleared. Fixed reader conversations retain their original PDF.
- Library sources render as document attachment cards in the same row above the question as uploaded images/files. The card shares the uploaded-document icon, text content and existing card styles, including while editing. The selected tool appears as an icon and colored inline action phrase inside the message (for example, “Create flashcards from this source”). Legacy messages without stored selections remain readable; unknown old selections cannot be reconstructed.
- Explicit library sources also feed retrieval for study-material generation even when the router otherwise needs only a generation tool. The selected PDF ID scopes retrieval; retrieved passages reach the generation prompt. Empty retrieval remains evidence context rather than a canned refusal. Provider/routing failures still follow existing recovery policy.

## Upload lifecycle

File selection starts the authenticated backend upload and creates an Uploading tile. A successful tile becomes Ready. Send waits for every selected file to finish; inference and image analysis start only after Send, using its question. Send reuses the uploaded IDs and canonical metadata. The four-attachment limit applies to pending, ready and failed files; explicit upload Retry replaces its failed tile.

Accepted safe image questions are stored before vision starts, including their attachment IDs and message selections. A vision outage therefore retains a real question for Retry and history recovery. Successful analysis updates that question's extracted evidence for subsequent turns; failure does not continue with an answer that ignores the image. A retained failed upload owns one error/Retry notice, avoiding duplicate generic file warnings.

PNG/JPEG uploads undergo actual format/size/pixel checks, orientation normalization, metadata removal and a maximum 3072-pixel edge before private storage. JPEGs remain JPEG; PNGs retain lossless storage where size permits. This is file validation and normalization, not a claim of malware scanning or content moderation. Existing authenticated preview and owned attachment resolution remain in force.

Removing an unsent ready file deletes its unbound attachment through the existing endpoint. Removing an uploading file aborts its request. Existing hourly cleanup removes unattached rows older than 24 hours; its delete trigger queues object cleanup and the maintenance worker retries private object deletion. This covers abandoned drafts and upload/removal races. No new cleanup migration or job was introduced. Hosted scheduler/worker execution remains a release check.

## Readable diagnostics

Local routing summaries show intent, selected path, routing provider/model and elapsed time. Reranking summaries show actual provider/model, input passages, threshold passes, retained passages, top score and latency. Neural failure identifies heuristic fallback accurately. Intermediate usage remains DEBUG; INFO retains the final attempt summary. Prompts, uploaded content and private reasoning are excluded.

## Verification and release limits

Automated checks cover saved context authorization/replay/null semantics, source-to-generation retrieval, normalized upload pixels without early vision, SSE/history parsing, branch inheritance, desktop/mobile tag recovery and editing, eager uploads, upload failure/retry and retained private previews. Final command results are recorded after verification below.

| Check                                                               | Result                                                         |
| ------------------------------------------------------------------- | -------------------------------------------------------------- |
| Full API pytest (`ENABLE_GOVERNANCE=false`, existing fixture suite) | 1,234 passed; 102 skipped; 2 dependency warnings               |
| Web Node helper tests                                               | 136 passed                                                     |
| Workspace TypeScript                                                | 6 tasks passed                                                 |
| Workspace ESLint / UI checks                                        | 2 tasks passed                                                 |
| Ruff check and format check                                         | Passed; 198 Python files formatted                             |
| Targeted Playwright browser scenarios                               | 24 passed across the initial run and corrected reruns          |
| Production Next.js build                                            | Passed, including TypeScript and generation of 23 static pages |

Browser verification used the existing Vite synthetic adapter, one Chrome worker, and desktop/mobile viewports. It covered all 15 background-run scenarios, eager upload reuse, failed uploads on both viewports, private image lightbox/recovery, the broad interaction/voice/virtualized-history case, and reader supporting uploads/limits on both viewports. The initial run passed 20 scenarios. Its four failures were corrected test assumptions: geometry read across scroll frames, obsolete generic Thinking text, and two assertions that prohibited eager session creation. Three passed on their next run; the private preview case passed after explicitly waiting for its three automatic recovery attempts within the project's 15-second expectation budget. No error-state assertion was removed.

Synthetic browser/API fixtures do not certify hosted Supabase/R2 execution, provider answer quality, multi-worker generation or native device behavior. Those release gates remain open.

## Pending Engineering synchronization

### Inline tool prefix and retained editing attachments

Following the user's ChatGPT reference, the tool badge row and edit-mode tool dropdown are removed. Compose, sent questions and edits display the tool's action phrase inline with plain question text. The action stays in typed message context, separately from the textarea value; selecting/copying/editing prompt text cannot silently change it. The subsequent reference correction removes the tool's × and uses semibold action text. Backspace at a collapsed caret at position zero explicitly clears the prefix; mobile `beforeinput` deletion is supported, while deletion within the prompt and IME composition preserve the action. Native textareas retain keyboard, paste, voice and submission behavior; a measured immutable prefix reserves only first-line space, and subsequent lines use the full input width. Sent user text renders as a plain React text span with preserved whitespace, never HTML.

Desktop and mobile editing retain the same library document card. Removing it is explicit; sending edited text preserves its source ID and action mode. Fixed reader sources remain fixed. Uploaded files continue using the SDK attachment adapter. No backend or public DTO changes were needed.

Local verification: both desktop/mobile prefix-and-attachment journeys passed, including a same-line geometry assertion, cancelled edit restoration, and source/action preservation after reload, Retry and sending an edit. The broad chat interaction regression also passed, covering branching, feedback, uploads, voice, dark/light/sepia layouts, multiline inputs and virtualized history. All three final Playwright cases passed with the repository's canonical 240-second case budget. Earlier attempts hit preview startup/screenshot timeouts with the narrower audit configuration; assertions were retained. Desktop/mobile sent and edit screenshots were inspected. Web TypeScript, scoped ESLint and the production Next.js build passed (23 static pages). The existing `next-env.d.ts` contents were preserved. No live provider or hosted acceptance is claimed.

Additional Notion entries are pending connector availability: inline tool-prefix presentation, immutable action context, and retained library file cards during editing (AI Chat / Reader / Frontend; shared message-context, composer, attachment and message rendering plus browser tests).

### Follow-up: notice types and saved provider-error recovery

- Persistent offline status is a compact, full-width outlined banner directly above the input: “You're offline. Check your connection.” It remains until connectivity returns, has no close button and does not resize the input itself.
- Attachment-limit and similar transient composer notices appear in a dismissible viewport toast stack. They can coexist with the offline banner. Account/conversation unmount removes the portal content; dismissal clears local attachment warnings so a later violation can appear again.
- Browser verification exposed an SDK capture-phase drop handler that uploaded files before the composer's batch validation. Thread drops now validate the whole batch, while composer drops are claimed once by the composer. Rejecting five files creates one limit notice and zero uploads. Drag feedback clears after a drop; valid paste/drop uploads still complete before Send without starting inference.
- Generic `PROVIDER_ERROR` failures are retryable after unexpected stream errors. Historical provider flags incorrectly set to false recover Retry in history and run snapshots when there is no tool-execution fence. Recorded tool-side effects still block whole-request replay and now use explicit check-results copy rather than an unexplained generic failure. Auth, permissions, credits and validation retain their existing next actions.
- This fixes identifiable code paths; the screenshots alone do not identify the provider failure or prove which historical fence was recorded. No legacy database records were manually changed.

Follow-up verification: 138 web helper tests and 50 focused API tests passed. Eight distinct targeted browser cases passed across the final corrected runs: desktop/mobile prefix and attachment editing, legacy provider Retry after reload, artifact replay protection, desktop/mobile upload Retry, native paste/drop uploads, and simultaneous offline/attachment-limit notices at both widths. The combined-notice case asserts no uploads from a rejected batch, retained draft text, a full-width persistent banner without a dismiss button, and a separate dismissible toast that does not overlap it. The original failure assertions were retained; the capture-phase upload bug and the visually observed mobile overlap were fixed. Desktop/mobile screenshots were inspected. Web TypeScript, scoped ESLint, Ruff, and the production Next.js build passed; the existing Next environment type file was preserved. These are local synthetic checks, not live provider or hosted acceptance.

Prepared Engineering updates: keyboard prefix removal, persistent-vs-transient notices, atomic drop validation, and safe legacy-provider Retry restoration. Session log verification applies to the local checks above; hosted acceptance remains pending. The decision is to preserve persistent connectivity status above the input, use separate transient notices, and restore generic provider Retry without bypassing recorded tool-execution fences. Notion connector remains unavailable, so remote synchronization is pending.

### Attachment presentation correction and document-read Retry

20 November follow-up: a sent library document reappeared in the composer because its cleared draft selection fell back to the selected conversation's inherited source. Composer presentation now uses only its explicit unsent selection; saved message attachments, source inheritance for follow-up questions, Retry context and edit restoration remain intact. Failed or rejected submissions retain the applicable existing recovery behavior. Fixed reader documents remain conversation-bound.

The previous blocked-run message incorrectly implied generated results exist. Live and restored tool-fenced failures now say the response could not finish and ask for a new message, without asserting an artifact was created. The existing replay fence still applies to writes/unknown tools or old records without enough execution evidence. This is a recovery restriction, not a diagnosis of the underlying failure; a screenshot cannot identify the provider/timeout/tool error. Confirmed read-only document searches remain retryable for new runs.

20 November verification: 46 focused API tests, 21 focused web helper tests, and all six targeted Chrome browser cases passed. The title is tested while the response is held open, followed by a failed document read; its name remains. Desktop/mobile source-card journeys assert that accepted sends and reloads leave no composer source card, while the original message, explicit Retry and edited message retain the document ID and tool. Live/restored write-tool errors use neutral copy and retain the replay fence. Screenshots were inspected. Web TypeScript, scoped ESLint, Ruff check/format and the production Next.js build passed (23 static pages). The existing Next environment type file was preserved. No hosted provider or database release verification is implied. Notion synchronization remains pending connector availability; the title-timing record contains the prepared entries.

The user's subsequent screenshot showed three `read_document` steps followed by a failed answer without Retry. The supplied dashboard HTTP 200 line cannot identify the response failure. Inspection confirmed `read_document` performs authorized SELECTs and has no artifact side effects, but was missing from both replay-safe allowlists. Both now include it; generated files and unknown tools remain fenced. Previously persisted `retry_blocked=true` records retain their conservative fence because old records may lack enough execution detail to safely clear it. This fixes classification for new runs; it does not claim to repair the unknown generation failure in that screenshot.

Verification for this correction: 29 API run tests passed; all five targeted desktop/mobile browser cases passed (attachment presentation, reload/Retry/edit persistence, document-read Retry and generated-artifact replay protection). Web TypeScript and scoped ESLint passed. Desktop/mobile screenshots were inspected. These are local synthetic checks; the screenshot's generation failure remains unclassified pending its chat logs.

Prepared additional Engineering updates: attachment presentation uses the shared uploaded-file card; document reads are safe for explicit Retry; screenshot failure cause awaits the chat run logs. Files: attachment/message/context components, frontend/backend tool policies, run and desktop/mobile browser tests. Local checks only; Notion connector unavailable.

Notion tools are unavailable in this session. Prepared entries:

- Session / Change Log: **Message context and draft upload integration**, 2026-11-19, AI Chat / Reader / API; files: shared chat contracts, message context helpers, chat runtime/composer/tags, upload/image preparation, readable logs and tests. Verified: local automated checks listed above; hosted acceptance pending.
- Decision Log: Persist server-authorized message selections in existing message JSON rather than infer tools from prompt wording; normalize/upload while composing and analyze only on Send. Reuse the existing orphan cleanup queue rather than add duplicate jobs.
- Product Roadmap: Chat message selections and draft uploads — locally integrated, hosted acceptance pending.
- Knowledge Base: Message-context replay contract and upload preparation/inference boundary.
