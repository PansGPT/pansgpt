# Course-neutral quiz coverage and freshness - 28 October 2026

Agreed scope: existing QuizConfig/QuizJob and taking/review contracts remain unchanged. No extra AI review call. Generation must assess the supplied course content rather than document metadata, use randomized passages spread across each eligible material (within an explicitly selected topic when supplied), and avoid previously generated questions for the same student/course, including quizzes not yet started. Existing saved attempts/results must remain unchanged.

Acceptance: mixed-course prompt checks; stratified source selection covers beginning/middle/end on synthetic long documents; batches draw from separated portions of the bounded evidence pool; saved question inventory respects coverage and prior-question exclusions; concurrent jobs cannot persist the same or near-identical prompt for the same student; full offline API and real PostgreSQL checks pass. Finite material cannot yield unlimited unique learning objectives, and text-based duplicate checks cannot prove semantic uniqueness. No unsupported facts or relaxed validation may be used to fill a requested count.

Implementation and verification follow below. Notion synchronization pending: no connector available.

## Implementation

- Generation and written-grading instructions are course-neutral. They assess the supplied subject's concepts, principles, relationships, processes and applications, exclude document metadata, and ask for new learning points/applications rather than paraphrased old questions. No subject-specific example or pharmacy assumption remains in these instructions.
- Whole-course source selection divides each eligible document into up to eight ordered sections, randomly chooses one chunk per section, and caps the evidence pool at 24. When multiple documents exceed the pool budget, beginning/end/middle section priority prevents the limit from dropping all late content. Selected passages remain ordered for spread-out batch sampling. Explicit topic queries retain their existing scoped semantic retrieval; they do not pull unrelated topics merely to cover every page.
- Each generation batch samples up to four separated positions in the evidence pool; adjacent batches shift the positions. The bounded model context remains four passages of up to 700 characters each. Random source sampling does not imply that a short quiz covers every page or every document.
- Reuse selects questions round-robin by source section, with a section quota based on the requested size and available material. Missing coverage is generated through the existing pipeline. Existing source-eligibility and duplicate checks remain in place.
- Prior-question avoidance uses all stored non-deleted interactive quiz questions for that owner/university/course, including generated-but-unstarted quizzes, rather than only 15 questions from started attempts. The model receives a bounded mix of recent/prior prompts; local duplicate checks compare the full stored set. Commit-time advisory serialization refreshes history across parallel requests so simultaneous jobs cannot both save an identical or near-identical prompt.
- An internal content_generation_version marker allows reuse only from new course-neutral generation. Old saved quizzes/results remain unchanged; old inventory is not copied into new requests. Refill identities include the new version. This uses existing JSON metadata and requires no schema migration or client DTO changes. Create-request idempotency compares only public QuizConfig fields so internal metadata cannot create false conflicts.

## Verification

- Full offline API run: 732 passed, 55 service-dependent tests skipped at that run. Python lint and formatting passed for all eight changed Python files.
- Final real PostgreSQL integration run: 27 passed, one designated Redis-dependent shared-flight test skipped. The existing isolated PostgreSQL 18 test cluster contains synthetic data only; no hosted data or migration was modified.
- New checks prove: eight-section sampling on an 80-chunk document; beginning/end coverage across four 80-chunk materials within the 24-passage cap; separated batch evidence; bank coverage across multiple sections; exclusion of pre-version inventory; all 25 unstarted questions included in repeat history; concurrent requests cannot commit the same question. Existing idempotence, cancellation, source freshness, grading and matrix bank-copy/resume checks passed. Bank-copy fixtures now explicitly model hidden inventory instead of reusing a student's prior interactive quiz, consistent with the changed contract.
- Live synthetic economics probe used three passages about opportunity cost, price ceilings and demand shifts. Gemma's configured secondary produced three accepted subject questions spanning those three topics after the primary timed out. No private material was replayed or quizzes saved. This is a sample observation, not proof of semantic uniqueness for arbitrary output.

## Limits and release gates

Text similarity rejects exact and close textual repeats; it cannot certify that every paraphrase asks a different underlying fact. The prompt asks for different learning points, but no second semantic-review call is added. Once a small material is exhausted, generation must retain its distinct-question requirement rather than silently recycle earlier questions or fabricate unsupported facts. Hosted end-to-end/provider quality and production certification remain open.

## Notion sync pending

Connector unavailable; entries have not been posted.

- Session / Change Log: Summary: Make quizzes course-neutral with stratified source coverage and fresh repeat sets. Date: 2026-10-28. Area: Quiz / Generation / Source sampling. Files: quiz_generation.py, quiz_bank.py, quiz_service.py, models/quiz.py, workers/quiz.py, quiz_pipeline.py, tests/test_quiz.py, tests/test_quiz_database.py and canonical docs. Verified: evidence above.
- Decision Log: Rationale: Use existing bounded generation and local duplicate checks with randomized section sampling and complete stored history. Alternatives: subject-specific prompts, 15-question started-only history, unrestricted old inventory reuse, or a second model review. No extra AI review call introduced.
- Product Roadmap & Features: Course-neutral quiz coverage and repeat freshness implemented and locally verified; hosted quality gates remain open.
- Knowledge Base: No stack or core architecture change; no update required.

Activation: worker restarted after an idle check and reported quiz_wake_listening. Restarted the local API after development reload stalled; full readiness returned HTTP 200 with database/Redis/storage OK. The isolated PostgreSQL test cluster was stopped after verification. No existing quiz or attempt was rewritten.
