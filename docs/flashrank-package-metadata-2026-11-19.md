# FlashRank package metadata compatibility — 19 November 2026

The reported `ValueError` at `prepare_cache:97` came from our ZIP validator,
after download, rather than the earlier network timeout. The official public
TinyBERT ZIP contains both its model directory and `__MACOSX` resource-fork
metadata. The validator rejected every root outside the model directory,
including this harmless metadata. This implementation error was reproduced
before the correction.

The validator now checks member paths/types first, skips `__MACOSX` entries
without extracting them, and continues requiring model assets to live under
the expected directory. Traversal, absolute paths, unexpected roots, symlinks,
archive size/count limits and atomic publication remain enforced. Static
cache-validation reason codes are included in safe diagnostic fields, so
future warnings identify the category without dumping archive content.

## Verification

- Downloaded the actual upstream 3,421,983-byte package into ignored local
  inspection storage and inspected its twelve entries without extraction.
  Synthetic fixtures reproduce its metadata layout; no model weights were
  committed.
- Before the fix: metadata compatibility regression failed with the reported
  `ValueError` while eleven other cases passed.
- After the fix: **30 focused cache/startup/auxiliary-budget tests passed**,
  including metadata traversal and symlink rejection. Ruff passed.
- Real ONNX warmup succeeded in **2,312 ms** using the prepared cache.
  A synthetic relevant passage scored 0.9991 versus 0.0 for an unrelated passage.
  This confirms functional reranking, not general clinical/factual accuracy.
- A second real model load succeeded while HTTP download was explicitly
  forbidden, verifying cache reuse across model instances.
- Final full API regression: **1,199 passed, 100 skipped**, 121.83 seconds.
  The two existing test-client deprecation warnings were unchanged; skipped
  hosted/service checks remain unverified.

The database, JWKS and Redis initialized successfully in the supplied log.
`flashrank_warmup_pending` correctly meant startup stopped waiting while model
initialization continued; the later validation failure was the defect fixed here.
On the next worker start, the prepared cache should produce
`flashrank_model_loaded`, `flashrank_warmup_finished` with `ready: true`, and
`flashrank_prewarmed`, rather than another download.

## Engineering synchronization

Notion tools are unavailable. Pending Session / Change Log: **Fix official
FlashRank ZIP metadata compatibility**, 2026-11-19, API/Reranking; files:
cache validator, safe diagnostics, archive tests and verification docs; verified
for the checks above. Decision Log: ignore validated packaging metadata instead
of relaxing archive boundaries or extracting arbitrary ZIP roots. Product
Roadmap: real neural warmup and a basic reranking probe now verified locally;
hosted deployment, model provenance/checksum pinning and broader quality gates
remain separate. This compatibility fix does not introduce a new core pattern.
