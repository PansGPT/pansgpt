# Matrix answer ordering - 27 October 2026

User request: eliminate the repeated true/false answer pattern and make false statements plausible, closely confusable distractors.

- The prompt's fixed `true,false,true,false,true` example anchored model output. Its syntax example is now randomized.
- The server independently shuffles each matrix's statement/truth pairs using `SystemRandom`, then assigns displayed A-E labels before persistence. This applies to freshly generated and reused inventory questions. No truth value is flipped to manufacture a pattern.
- Matrices require exactly three true and two false statements, following the user's stated format. Uniform statement permutations allow all ten possible three-true answer-position combinations; occasional repeated patterns remain valid randomness.
- Prompt instructions favor subtle mechanism, substrate, target, site, pathway-step and condition confusions, parallel wording and comparable length. Distractors must be unambiguously false from the evidence. Obvious double negatives and absolute wording clues are discouraged. Each false statement must provide a corrected counterpart plus the single correct/wrong source term substitution in the same generation response. The server checks that the edit reproduces the false statement, both terms occur as complete terms in cited evidence, and the substitution is not a simple negation or direction reversal. Corrected facts are included in post-submission explanations. These structural checks do not perform a second semantic AI review.
- Explanations must refer to claim content, not A-E labels or ordinal positions. Explicit positional explanations are rejected before storage because shuffling could make them misleading.
- Matrix inventory is versioned in existing internal job JSON. Older matrix inventory is excluded from new quiz assembly rather than relabeled with potentially stale explanations or easy distractors. Fresh/reused new-version matrices receive independent stored permutations. Request idempotency ignores this internal version metadata.
- Existing quizzes, saved answers and results are unchanged. Refresh resumes the same saved order; retries/retakes do not rewrite existing question rows. No schema migration, frontend change or second AI review was introduced.

## Verification

- Exhaustive test of all 120 permutations: each statement retains its truth value; all ten three-true patterns occur with equal permutation counts; correct scoring and incorrect-statement penalties remain exact.
- Unit regressions enforce the three/two ratio, content-based explanation instructions and positional-explanation rejection.
- Real PostgreSQL test verifies shuffled persistence, exclusion of old inventory, reshuffling on bank copy, idempotent creation, stable resume/autosave and a full-score submission based on statement content.
- Full offline API suite: 713 passed, 49 service-dependent tests skipped. Focused checks and Python lint passed.
- Real local PostgreSQL suite: 20 passed, 1 shared-Redis-dependent check skipped. An unrelated chat 20 ms deadline test failed during concurrent database testing; the sequential full-suite rerun passed.
- The live synthetic check accepted a matrix using wrong-organ and closely related receptor substitutions, with correct source counterparts in the explanation. It returned one of two requested questions; the worker already retains partial batches and generates the remainder.
- Synthetic live examples are inspected for statement/key consistency and distractor plausibility. This is a limited sample; prompt instructions and structural checks do not certify expert-level factual quality for every generated question.

## Local activation

The API and quiz worker were restarted after checking there were no active generation jobs. API liveness and full readiness returned HTTP 200; database, Redis and storage probes were healthy, and the quiz wake channel had one worker subscriber. Initial readiness probes timed out during startup; the follow-up passed.

## Notion sync pending

No Notion connector is available; entries have not been posted.

| Gallery                    | Entry                                                                                                                                                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Session / Change Log       | Summary: Randomize matrix statement/key pairs and strengthen near-miss distractors. Date: 2026-10-27. Area: Quiz / Generation / Scoring. Files: quiz_ordering.py, generation/bank/service/models, worker/pipeline, regression tests and canonical docs. Verified: tests above. |
| Decision Log               | Rationale: Server randomness removes model answer-position bias while preserving immutable attempts and correct grading. Alternatives: prompt-only randomness, arbitrary key flipping, or reshuffling during taking.                                                           |
| Product Roadmap & Features | Matrix answer ordering and distractor improvements implemented; existing attempts preserved.                                                                                                                                                                                   |
| Knowledge Base             | Store shuffled statement/truth pairs once per quiz; only order-independent explanations and compatible inventory versions can be reused safely.                                                                                                                                |
