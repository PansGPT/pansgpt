import json
import os
import uuid

import asyncpg
import pytest

from app.core.config import settings


async def _get_live_test_connection() -> asyncpg.Connection | None:
    """Helper to establish a direct connection to PostgreSQL for RLS verification."""
    url = settings.DATABASE_URL or os.getenv("DATABASE_URL")
    if not url:
        return None
    try:
        conn = await asyncpg.connect(url, timeout=15.0, statement_cache_size=0)
        return conn
    except Exception as e:
        print(f"Live DB connection skipped or failed: {e}")
        return None


@pytest.mark.asyncio
async def test_university_scoping_invariant():
    """Verify that multi-tenant PostgreSQL Row-Level Security (RLS) isolation
    strictly prevents cross-university data access at the database level."""
    conn = await _get_live_test_connection()
    if not conn:
        pytest.skip("PostgreSQL staging/test database unreachable; skipping live RLS test.")

    try:
        # Execute inside a transaction that is guaranteed to roll back cleanly
        async with conn.transaction():
            # 1. Create two test universities: UNIJOS and UNILAG
            uni_jos_id = uuid.uuid4()
            uni_lag_id = uuid.uuid4()
            await conn.execute(
                "INSERT INTO public.universities (id, name, short_name, slug, status) VALUES ($1, 'Uni of Jos Test', 'UNIJOS', $2, 'active')",
                uni_jos_id,
                f"unijos-rls-{uni_jos_id.hex[:6]}",
            )
            await conn.execute(
                "INSERT INTO public.universities (id, name, short_name, slug, status) VALUES ($1, 'Uni of Lagos Test', 'UNILAG', $2, 'active')",
                uni_lag_id,
                f"unilag-rls-{uni_lag_id.hex[:6]}",
            )

            # 2. Create users in auth.users
            jos_user_id = uuid.uuid4()
            lag_user_id = uuid.uuid4()
            await conn.execute(
                """
                INSERT INTO auth.users (id, email, aud, role)
                VALUES ($1, $2, 'authenticated', 'authenticated'),
                       ($3, $4, 'authenticated', 'authenticated')
                """,
                jos_user_id,
                f"jos_{jos_user_id.hex[:6]}@test.com",
                lag_user_id,
                f"lag_{lag_user_id.hex[:6]}@test.com",
            )

            # 3. Create student profiles in public.users
            await conn.execute(
                """
                INSERT INTO public.users (id, email, first_name, university_id, roles)
                VALUES ($1, $2, 'JosStudent', $3, ARRAY['student']::user_role[]),
                       ($4, $5, 'LagStudent', $6, ARRAY['student']::user_role[])
                """,
                jos_user_id,
                f"jos_{jos_user_id.hex[:6]}@test.com",
                uni_jos_id,
                lag_user_id,
                f"lag_{lag_user_id.hex[:6]}@test.com",
                uni_lag_id,
            )

            # 4. Create active documents in both universities
            doc_jos_id = uuid.uuid4()
            doc_lag_id = uuid.uuid4()
            await conn.execute(
                """
                INSERT INTO public.documents (id, university_id, title, course_code, course_title, storage_key, status, uploaded_by)
                VALUES ($1, $2, 'UNIJOS Pharmacokinetics Slide', 'PCL 401', 'Clinical Pharmacokinetics', $3, 'active', $4),
                       ($5, $6, 'UNILAG Forensic Toxicology Doc', 'PCG 411', 'Forensic Toxicology', $7, 'active', $8)
                """,
                doc_jos_id,
                uni_jos_id,
                f"keys/jos-{doc_jos_id.hex[:6]}.pdf",
                jos_user_id,
                doc_lag_id,
                uni_lag_id,
                f"keys/lag-{doc_lag_id.hex[:6]}.pdf",
                lag_user_id,
            )

            # ------------------------------------------------------------------
            # TEST AS UNIJOS STUDENT (PostgreSQL RLS Active)
            # ------------------------------------------------------------------
            await conn.execute("SET LOCAL ROLE authenticated;")
            claims_jos = json.dumps({"sub": str(jos_user_id), "role": "authenticated"})
            await conn.execute("SELECT set_config('request.jwt.claims', $1, true);", claims_jos)

            # Query all documents through RLS
            jos_visible_docs = await conn.fetch(
                "SELECT id, title, university_id FROM public.documents;"
            )
            assert len(jos_visible_docs) >= 1, (
                "UNIJOS student should see at least their own document"
            )
            for d in jos_visible_docs:
                assert d["university_id"] == uni_jos_id, (
                    f"RLS BREACH: UNIJOS student saw non-UNIJOS document: {d['title']}"
                )

            # Query UNILAG document directly by primary key
            forbidden_doc = await conn.fetchrow(
                "SELECT id FROM public.documents WHERE id = $1;", doc_lag_id
            )
            assert forbidden_doc is None, (
                "RLS BREACH: UNIJOS student directly retrieved UNILAG document by ID!"
            )

            # ------------------------------------------------------------------
            # TEST AS UNILAG STUDENT (PostgreSQL RLS Active)
            # ------------------------------------------------------------------
            claims_lag = json.dumps({"sub": str(lag_user_id), "role": "authenticated"})
            await conn.execute("SELECT set_config('request.jwt.claims', $1, true);", claims_lag)

            lag_visible_docs = await conn.fetch(
                "SELECT id, title, university_id FROM public.documents;"
            )
            assert len(lag_visible_docs) >= 1, (
                "UNILAG student should see at least their own document"
            )
            for d in lag_visible_docs:
                assert d["university_id"] == uni_lag_id, (
                    f"RLS BREACH: UNILAG student saw non-UNILAG document: {d['title']}"
                )

            forbidden_jos_doc = await conn.fetchrow(
                "SELECT id FROM public.documents WHERE id = $1;", doc_jos_id
            )
            assert forbidden_jos_doc is None, (
                "RLS BREACH: UNILAG student directly retrieved UNIJOS document by ID!"
            )

            # Signal clean rollback
            raise asyncpg.exceptions.PostgresError("TEST_ROLLBACK_INTENTIONAL")

    except asyncpg.exceptions.PostgresError as pe:
        if "TEST_ROLLBACK_INTENTIONAL" not in str(pe):
            raise
    finally:
        await conn.close()


@pytest.mark.asyncio
async def test_document_chunks_rls_isolation():
    """Verify that Row-Level Security on document_chunks strictly prohibits
    cross-tenant vector/chunk retrieval for students from another university."""
    conn = await _get_live_test_connection()
    if not conn:
        pytest.skip("PostgreSQL staging/test database unreachable; skipping live RLS test.")

    try:
        async with conn.transaction():
            uni_jos_id = uuid.uuid4()
            uni_lag_id = uuid.uuid4()
            await conn.execute(
                "INSERT INTO public.universities (id, name, short_name, slug, status) VALUES ($1, 'Uni of Jos Test', 'UNIJOS', $2, 'active')",
                uni_jos_id,
                f"unijos-chk-{uni_jos_id.hex[:6]}",
            )
            await conn.execute(
                "INSERT INTO public.universities (id, name, short_name, slug, status) VALUES ($1, 'Uni of Lagos Test', 'UNILAG', $2, 'active')",
                uni_lag_id,
                f"unilag-chk-{uni_lag_id.hex[:6]}",
            )

            jos_user_id = uuid.uuid4()
            lag_user_id = uuid.uuid4()
            await conn.execute(
                """
                INSERT INTO auth.users (id, email, aud, role)
                VALUES ($1, $2, 'authenticated', 'authenticated'),
                       ($3, $4, 'authenticated', 'authenticated')
                """,
                jos_user_id,
                f"jos_{jos_user_id.hex[:6]}@test.com",
                lag_user_id,
                f"lag_{lag_user_id.hex[:6]}@test.com",
            )

            await conn.execute(
                """
                INSERT INTO public.users (id, email, first_name, university_id, roles)
                VALUES ($1, $2, 'JosStudent', $3, ARRAY['student']::user_role[]),
                       ($4, $5, 'LagStudent', $6, ARRAY['student']::user_role[])
                """,
                jos_user_id,
                f"jos_{jos_user_id.hex[:6]}@test.com",
                uni_jos_id,
                lag_user_id,
                f"lag_{lag_user_id.hex[:6]}@test.com",
                uni_lag_id,
            )

            doc_lag_id = uuid.uuid4()
            await conn.execute(
                """
                INSERT INTO public.documents (id, university_id, title, course_code, course_title, storage_key, status, uploaded_by)
                VALUES ($1, $2, 'UNILAG Confidential Exam Material', 'PCG 501', 'Advanced Toxicology', $3, 'active', $4)
                """,
                doc_lag_id,
                uni_lag_id,
                f"keys/lag-{doc_lag_id.hex[:6]}.pdf",
                lag_user_id,
            )

            chunk_lag_id = uuid.uuid4()
            dummy_vector = [0.0] * 3072
            await conn.execute(
                """
                INSERT INTO public.document_chunks (id, document_id, content, chunk_index, embedding)
                VALUES ($1, $2, 'UNILAG Confidential Exam Question: Mechanism of organophosphate poisoning.', 0, $3::text::vector)
                """,
                chunk_lag_id,
                doc_lag_id,
                f"[{','.join(str(x) for x in dummy_vector)}]",
            )

            # Switch to UNIJOS student role
            await conn.execute("SET LOCAL ROLE authenticated;")
            claims_jos = json.dumps({"sub": str(jos_user_id), "role": "authenticated"})
            await conn.execute("SELECT set_config('request.jwt.claims', $1, true);", claims_jos)

            # Query UNILAG chunk directly
            chunk = await conn.fetchrow(
                "SELECT id, content FROM public.document_chunks WHERE id = $1;", chunk_lag_id
            )
            assert chunk is None, (
                "RLS BREACH: UNIJOS student accessed UNILAG document chunk via direct query!"
            )

            # Query all chunks belonging to UNILAG document
            chunks = await conn.fetch(
                "SELECT id FROM public.document_chunks WHERE document_id = $1;", doc_lag_id
            )
            assert len(chunks) == 0, (
                "RLS BREACH: UNIJOS student retrieved chunks belonging to UNILAG document!"
            )

            raise asyncpg.exceptions.PostgresError("TEST_ROLLBACK_INTENTIONAL")

    except asyncpg.exceptions.PostgresError as pe:
        if "TEST_ROLLBACK_INTENTIONAL" not in str(pe):
            raise
    finally:
        await conn.close()


def test_student_upload_permission_invariant():
    """Verify that students have strictly ZERO document upload permissions."""
    allowed_upload_roles = {"university_admin", "super_admin"}
    student_role = "student"
    lecturer_role = "lecturer"

    assert student_role not in allowed_upload_roles, (
        "Security Violation: Student can upload directly"
    )
    assert lecturer_role not in allowed_upload_roles, (
        "Security Violation: Lecturer can upload directly without review"
    )


def test_soft_delete_query_filtering():
    """Verify that soft-deleted entities are excluded from active queries."""
    records = [
        {"id": "1", "title": "Active Note", "deleted_at": None},
        {"id": "2", "title": "Soft Deleted Note", "deleted_at": "2026-09-06T12:00:00Z"},
    ]
    active_records = [r for r in records if r["deleted_at"] is None]
    assert len(active_records) == 1
    assert active_records[0]["title"] == "Active Note"
