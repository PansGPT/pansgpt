"""Loopback-only browser/API test harness. Uses synthetic identities and local SQL.

Requires tooling/governance-test-database.py and a local PostgreSQL on port 55434.
No application credentials or hosted databases are read.
"""

import sys
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import UUID
from typing import Literal

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'apps/api'))
from tests import offline_bootstrap as _offline_bootstrap  # noqa: E402,F401
import asyncpg  # noqa: E402
import jwt  # noqa: E402
import uvicorn  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.core.database import init_db_pool,close_db_pool  # noqa: E402
from app.routers.governance import router  # noqa: E402
from app.routers.auth import router as auth_router  # noqa: E402
from app.core.rate_limit import limiter  # noqa: E402

DATABASE_URL='postgresql://postgres@127.0.0.1:55434/pansgpt_governance_test'
UNIVERSITY=UUID('019a7b20-2000-7000-8000-000000000001')
OWNER=UUID('019a7b20-2000-7000-8000-000000000002')
STUDENT=UUID('019a7b20-2000-7000-8000-000000000003')
DOCUMENT=UUID('019a7b20-2000-7000-8000-000000000004')
FACULTY=UUID('019a7b20-2000-7000-8000-000000000005')
settings.DATABASE_URL=DATABASE_URL
settings.SUPABASE_URL='https://governance-e2e.invalid'
settings.SUPABASE_JWT_SECRET='synthetic-governance-test-signing-secret-never-used-outside-tests'
settings.X_API_KEY_WEB='synthetic-governance-test-client-key'
settings.ENABLE_GOVERNANCE=True
settings.ENABLE_AI=False
settings.ENABLE_INGESTION=False
settings.LOCAL_DEV_MODE=False
settings.REDIS_URL=None
settings.UPSTASH_REDIS_URL=None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    conn=await asyncpg.connect(DATABASE_URL)
    try:
        async with conn.transaction():
            await conn.execute("INSERT INTO public.universities(id,name,slug) VALUES($1,'Integration Test University','governance-integration-test') ON CONFLICT(id) DO NOTHING",UNIVERSITY)
            for uid,email,first,role in [(OWNER,'integration-admin@example.invalid','Integration Administrator','university_admin'),(STUDENT,'integration-student@example.invalid','Integration Student','student')]:
                await conn.execute('INSERT INTO auth.users(id) VALUES($1) ON CONFLICT DO NOTHING',uid)
                await conn.execute("INSERT INTO public.users(id,email,first_name,university_id,roles,current_level,terms_accepted_at) VALUES($1,$2,$3,$4,ARRAY[$5::public.user_role],'400',now()) ON CONFLICT(id) DO UPDATE SET subscription_tier='free',account_status='active',deleted_at=NULL",uid,email,first,UNIVERSITY,role)
            await conn.execute("INSERT INTO public.admin_memberships(user_id,university_id,admin_level) VALUES($1,$2,'senior') ON CONFLICT(user_id) DO NOTHING",OWNER,UNIVERSITY)
            await conn.execute("INSERT INTO public.documents(id,university_id,uploaded_by,title,course_code,course_title,storage_key,target_levels) VALUES($1,$2,$3,'Integration review material','PCL 401','Clinical Pharmacology','synthetic-e2e-only.pdf',ARRAY['400']::public.university_level[]) ON CONFLICT(id) DO UPDATE SET status='pending_review',review_note=NULL,deleted_at=NULL,updated_at=clock_timestamp()",DOCUMENT,UNIVERSITY,OWNER)
            await conn.execute('INSERT INTO auth.users(id) VALUES($1) ON CONFLICT DO NOTHING',FACULTY)
    finally:await conn.close()
    await init_db_pool()
    yield
    await close_db_pool()


app=FastAPI(lifespan=lifespan)
app.state.limiter=limiter
app.include_router(router,prefix='/api/v1')
app.include_router(auth_router,prefix='/api/v1')


@app.get('/__governance-test/token')
async def token(user:Literal['admin','faculty']='admin') -> dict[str,str]:
    now=datetime.now(UTC)
    signed=jwt.encode({'sub':str(FACULTY if user=='faculty' else OWNER),'email':'integration-faculty@example.invalid' if user=='faculty' else 'integration-admin@example.invalid','iss':settings.SUPABASE_URL+'/auth/v1','aud':'authenticated','exp':now+timedelta(minutes=15)},settings.SUPABASE_JWT_SECRET,algorithm='HS256')
    return {'token':signed}


@app.get('/health/ready')
async def ready() -> dict[str,str]:return {'status':'ready','data':'synthetic loopback governance test only'}


if __name__=='__main__':uvicorn.run(app,host='127.0.0.1',port=4183,log_level='warning')
