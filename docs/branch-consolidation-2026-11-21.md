# Branch consolidation — 21 November 2026

The user authorized committing all current application work, consolidating the
remaining branches into main, and pushing the result to GitHub.

## Included history

- `feature/settings-storage-privacy` includes `fix/reader-loading-ux` and the
  committed reader/chat/settings work after local main at `a60817f`.
- `integrate/all-branches-20261104` is already an ancestor of main. No historical
  Library experiment or reverted design is restored.
- `91948f3` records all 135 previously changed/new files, including the current
  chat reliability work, rich study outputs, tests, documentation and dependency
  locks. Python lock metadata was synchronized for the two direct dependencies.
- There is one worktree. No branch deletion or history rewrite is needed.

## Verification and integration

Publish through `verify/consolidate-20261121`, require the existing GitHub CI
pipeline, then advance main by fast-forward to the verified commit. Check branch
ancestry and remote main after the normal push. Preserve the source branches.

Fresh local baseline checks: six workspace typechecks passed, 140 web helper
tests passed, and 1,271 API tests passed with 103 service-dependent skips and two
existing framework deprecation warnings. GitHub also passed lint/typecheck,
backend tests, secret scanning and the web build on the initial commit.

The initial container check failed at packaged reranker loading. The Docker image
ships a read-only model directory, but the new cache code attempted to create a
lock before checking whether its model was already complete. Completed caches
now require no write access; incomplete caches retain locking and atomic
publication. All 15 cache tests passed, including a simulated read-only cache
with both locking and downloading forbidden. The existing non-root container
smoke remains the real deployment verification gate; it is not bypassed.

The next container run exposed a second layout boundary: a module-level default
assumed five filesystem ancestors and raised `IndexError` under `/app/app/engines`.
Default cache discovery now finds an actual workspace marker or uses the OS
temporary directory, without changing the explicit container cache setting.
Regression coverage includes the shallow installation and local workspace paths.

Hosted worker, provider availability, native-device and student release gates
remain open. Repository consolidation does not certify these integrations.

## Engineering gallery handoff

No Notion connector is available in this session. Pending concise updates:

- Session / Change Log: consolidate committed chat/reader/settings history;
  synchronize dependency locks; correct immutable model-cache loading. Area:
  Repository / API / Web. Verified only for the completed checks above and the
  final GitHub checks reported in the user handoff.
- Decision Log: preserve branch ancestry with a verified fast-forward; read
  packaged models without creating locks, while keeping locks for preparation.
  Alternatives: unnecessary merge commits, runtime-writable packaged models,
  or bypassing the failing container check.
- Product Roadmap: consolidation verification; existing hosted release gates stay
  open. Knowledge Base needs no change for this integration/corrective fix.
