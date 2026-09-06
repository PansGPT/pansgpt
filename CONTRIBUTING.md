# Contributing to PansGPT 2.0

Thank you for contributing to PansGPT! To maintain engineering excellence and stability across our multi-platform architecture, please follow these guidelines.

---

## 🌿 Branching Strategy

- `main`: Production-ready branch. **Direct pushes to `main` are strictly blocked.**
- Feature branches: `feat/short-description` (e.g., `feat/pdf-virtualized-reader`)
- Bugfix branches: `fix/short-description` (e.g., `fix/sse-reconnect-leak`)
- Chore / Refactor: `chore/short-description` or `refactor/short-description`

---

## ✍️ Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat(web): add chemical structure drawer component`
- `fix(api): correct Presigned URL expiry to 15 minutes`
- `perf(db): add partial index on course monographs`
- `test(api): add RLS tenant isolation integration test`
- `docs(notion): update Phase 4 database schema specification`

---

## 🛡️ Pull Request Quality Gate (CI)

Every PR must satisfy the following automated gates before merge:

1. **Linting**: Zero ESLint or Ruff errors (`pnpm lint`).
2. **Typecheck**: Zero TypeScript compiler errors (`pnpm typecheck`).
3. **Tests**: All backend pytest suites pass with zero regressions.
4. **Build**: Successful Next.js and API container builds.
5. **Review**: At least 1 code review approval.
