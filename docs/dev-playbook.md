# 🛠️ PansGPT 2.0 Developer Playbook

Practical engineering guide for developing, testing, and shipping in the PansGPT monorepo.

---

## 1. How to Add a Database Migration
1. Navigate to `packages/database/migrations`.
2. Name the file: `YYYYMMDDHHMMSS_action_name.sql`.
3. Include both up migration and proper constraints.
4. Verify locally using `supabase db reset`.
5. Run `pnpm --filter=@pansgpt/database db:types` to refresh `@pansgpt/types`.

---

## 2. How to Add an API Route in FastAPI
1. Place router in `apps/api/app/routers/[feature].py`.
2. Register in `apps/api/app/main.py`.
3. Add corresponding pytest in `apps/api/tests/test_[feature].py`.
4. Ensure all response models use Pydantic v2 schemas.

---

## 3. How to Connect Web to API
1. Use client functions in `apps/web/lib/api.ts`.
2. All endpoints proxy through `API_BASE_URL`.
3. Never expose private API keys in `apps/web`.
