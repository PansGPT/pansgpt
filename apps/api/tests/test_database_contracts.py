"""Executable contracts for a disposable migrated Supabase database."""

import json
import os
import uuid
from collections.abc import AsyncIterator

import asyncpg
import pytest

pytestmark = [pytest.mark.live, pytest.mark.asyncio]


@pytest.fixture
async def database() -> AsyncIterator[asyncpg.Connection]:
    url = os.getenv("RLS_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Dedicated disposable RLS_TEST_DATABASE_URL not configured")
    connection = await asyncpg.connect(url, timeout=15, statement_cache_size=0)
    transaction = connection.transaction()
    await transaction.start()
    try:
        yield connection
    finally:
        await transaction.rollback()
        await connection.close()


async def make_user(connection: asyncpg.Connection, university: uuid.UUID) -> uuid.UUID:
    user = uuid.uuid4()
    await connection.execute(
        "INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,$2,'{}')",
        user,
        f"{user}@example.com",
    )
    await connection.execute(
        "UPDATE public.users SET university_id=$2, roles=ARRAY['student']::public.user_role[] WHERE id=$1",
        user,
        university,
    )
    return user


async def make_university(connection: asyncpg.Connection) -> uuid.UUID:
    return await connection.fetchval(
        "INSERT INTO public.universities(name,slug,status) VALUES('Contract University',$1,'active') RETURNING id",
        f"contract-{uuid.uuid4()}",
    )


async def test_all_tables_enable_rls_and_use_no_uuidv4_defaults(
    database: asyncpg.Connection,
) -> None:
    unsafe = await database.fetch(
        "SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND relkind='r' AND NOT relrowsecurity"
    )
    assert not unsafe, [row["relname"] for row in unsafe]
    v4 = await database.fetch(
        "SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND column_default ILIKE '%gen_random_uuid%'"
    )
    assert not v4, [dict(row) for row in v4]
    for function in (
        "deduct_user_credits(uuid,text,text,jsonb)",
        "deduct_user_credits_internal(uuid,text,text,jsonb)",
        "refund_chat_credit(uuid,text)",
        "prepare_document_reembed(uuid)",
        "reserve_web_search_quota(uuid,date,integer)",
    ):
        for role in ("anon", "authenticated"):
            assert not await database.fetchval(
                "SELECT has_function_privilege($1,$2,'EXECUTE')", role, f"public.{function}"
            )


async def test_profile_roles_cannot_be_updated_and_peers_are_private(
    database: asyncpg.Connection,
) -> None:
    university = await make_university(database)
    actor = await make_user(database, university)
    peer = await make_user(database, university)
    await database.execute("SET LOCAL ROLE authenticated")
    await database.execute(
        "SELECT set_config('request.jwt.claims',$1,true)",
        json.dumps({"sub": str(actor), "role": "authenticated"}),
    )
    assert await database.fetchval("SELECT id FROM public.users WHERE id=$1", actor) == actor
    assert await database.fetchval("SELECT id FROM public.users WHERE id=$1", peer) is None
    with pytest.raises(asyncpg.InsufficientPrivilegeError):
        async with database.transaction():
            await database.execute(
                "UPDATE public.users SET roles=ARRAY['super_admin']::public.user_role[] WHERE id=$1",
                actor,
            )


async def test_chat_charge_and_refund_are_idempotent(database: asyncpg.Connection) -> None:
    user = await make_user(database, await make_university(database))
    reference = str(uuid.uuid4())
    first = await database.fetchval(
        "SELECT public.deduct_user_credits($1,'ai_chat_turn',$2)", user, reference
    )
    again = await database.fetchval(
        "SELECT public.deduct_user_credits($1,'ai_chat_turn',$2)", user, reference
    )
    assert again == first
    await database.execute("SELECT public.refund_chat_credit($1,$2)", user, reference)
    refunded = await database.fetchval(
        "SELECT balance FROM public.user_credits WHERE user_id=$1", user
    )
    await database.execute("SELECT public.refund_chat_credit($1,$2)", user, reference)
    assert (
        await database.fetchval("SELECT balance FROM public.user_credits WHERE user_id=$1", user)
        == refunded
    )
    assert refunded > first
    assert (
        await database.fetchval(
            "SELECT count(*) FROM public.credit_ledger WHERE user_id=$1 AND reference_id=$2",
            user,
            reference,
        )
        == 2
    )


async def test_reembed_preserves_chunks_and_records_a_durable_job(
    database: asyncpg.Connection,
) -> None:
    university = await make_university(database)
    document = await database.fetchval(
        "INSERT INTO public.documents(university_id,title,course_code,course_title,storage_key,status,embedding_status) VALUES($1,'Course','PHA100','Pharmacy',$2,'active','completed') RETURNING id",
        university,
        f"contract/{uuid.uuid4()}.pdf",
    )
    chunk = await database.fetchval(
        "INSERT INTO public.document_chunks(document_id,content,chunk_index,embedding) VALUES($1,'Preserved evidence',0,$2::vector) RETURNING id",
        document,
        "[" + ",".join(["0.01"] * 1536) + "]",
    )
    await database.execute("SELECT public.prepare_document_reembed($1)", document)
    assert (
        await database.fetchval("SELECT id FROM public.document_chunks WHERE id=$1", chunk) == chunk
    )
    job = await database.fetchrow(
        "SELECT id,status FROM public.background_jobs WHERE document_id=$1", document
    )
    assert job["status"] == "pending"
    await database.execute("SELECT public.prepare_document_reembed($1)", document)
    assert (
        await database.fetchval(
            "SELECT id FROM public.background_jobs WHERE document_id=$1", document
        )
        == job["id"]
    )


async def test_uuid_v7_defaults_work_with_restricted_caller_search_path(
    database: asyncpg.Connection,
) -> None:
    await database.execute("SET LOCAL search_path = pg_catalog")
    generated = await database.fetch(
        "SELECT public.uuid_generate_v7() AS id FROM generate_series(1, 256)"
    )
    identifiers = [row["id"] for row in generated]
    assert len(set(identifiers)) == 256
    assert all(identifier.version == 7 for identifier in identifiers)
    assert all(identifier.variant == uuid.RFC_4122 for identifier in identifiers)


async def test_web_search_quota_stops_at_the_database_limit(
    database: asyncpg.Connection,
) -> None:
    user = await make_user(database, await make_university(database))
    outcomes = [
        await database.fetchval("SELECT public.reserve_web_search_quota($1, CURRENT_DATE, 2)", user)
        for _ in range(4)
    ]
    assert outcomes == [1, 2, None, None]
    assert (
        await database.fetchval(
            "SELECT count FROM public.web_search_usage WHERE user_id=$1 AND date=CURRENT_DATE",
            user,
        )
        == 2
    )


async def test_hybrid_retrieval_runs_for_the_service_role_without_a_tenant_leak(
    database: asyncpg.Connection,
) -> None:
    await database.execute("SET LOCAL ROLE service_role")
    rows = await database.fetch(
        "SELECT * FROM public.match_documents_hybrid('migration', $1::vector)",
        "[" + ",".join(["0.01"] * 1536) + "]",
    )
    assert rows == []
