"""Real catalog SQL against disposable loopback Supabase; all records roll back."""

import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from urllib.parse import urlsplit

import asyncpg
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.dependencies import UserContext, get_current_user
from app.core.ids import uuid7
from app.main import app
from app.routers import library_catalog
from tests.test_database_contracts import make_university, make_user

pytestmark = [pytest.mark.live, pytest.mark.asyncio]


async def test_catalog_real_sql_pagination_facets_and_owner_recent(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    url = os.getenv("RLS_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Disposable RLS_TEST_DATABASE_URL is not configured")
    assert urlsplit(url).hostname in {"localhost", "127.0.0.1"}, (
        "Catalog verification only uses disposable loopback databases"
    )
    conn = await asyncpg.connect(url, timeout=15, statement_cache_size=0)
    transaction = conn.transaction(isolation="repeatable_read")
    await transaction.start()
    overrides = dict(app.dependency_overrides)
    try:
        university = await make_university(conn)
        foreign = await make_university(conn)
        owner = await make_user(conn, university)
        other = await make_user(conn, university)
        ids = [uuid7() for _ in range(58)]
        stamp = datetime(2026, 10, 20, tzinfo=UTC)
        for index, doc_id in enumerate(ids):
            await conn.execute(
                "INSERT INTO public.documents(id,university_id,title,course_code,course_title,storage_key,status,"
                "page_count,academic_session,semester,created_at,deleted_at) "
                "VALUES($1,$2,$3,$4,'Synthetic course',$5,$6::public.document_status,16,'2025/2026','first',$7,$8)",
                doc_id,
                foreign if index == 57 else university,
                "Late clearance notes" if index == 54 else f"Synthetic material {index}",
                "HIDDEN" if index >= 55 else "PCL 401",
                f"synthetic-catalog/{doc_id}.pdf",
                "pending_review" if index == 55 else "active",
                stamp + timedelta(seconds=index),
                stamp if index == 56 else None,
            )
        for reader, doc in [(owner, ids[0]), (other, ids[1])]:
            await conn.execute(
                "INSERT INTO public.study_progress(user_id,document_id,last_page_read,total_pages) VALUES($1,$2,3,16)",
                reader,
                doc,
            )

        @asynccontextmanager
        async def connection() -> AsyncIterator[asyncpg.Connection]:
            yield conn

        monkeypatch.setattr(library_catalog, "get_db_connection", connection)
        user = UserContext(
            id=owner,
            email="catalog@example.test",
            role="student",
            roles=["student"],
            university_id=university,
        )
        app.dependency_overrides[get_current_user] = lambda: user
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/library/catalog", params={"offset": 48, "limit": 24, "sort": "oldest"}
            )
            assert response.status_code == 200, response.text
            data = response.json()
            assert data["total"] == 55
            assert len(data["items"]) == 7
            assert data["items"][-1]["title"] == "Late clearance notes"
            assert data["courses"] == [
                {"code": "PCL 401", "title": "Synthetic course", "document_count": 55}
            ]
            assert data["academic_sessions"] == ["2025/2026"]
            recent = await client.get("/api/v1/library/catalog?collection=recent")
            assert recent.status_code == 200
            assert [item["id"] for item in recent.json()["items"]] == [str(ids[0])]
            assert recent.json()["items"][0]["last_page_read"] == 3
            search = await client.get("/api/v1/library/catalog?q=Late%20clearance")
            assert search.status_code == 200
            assert search.json()["total"] == 1
            assert search.json()["items"][0]["id"] == str(ids[54])
            assert "storage_key" not in search.json()["items"][0]
            await conn.execute(
                "UPDATE public.study_progress SET last_page_read=7 WHERE user_id=$1 AND document_id=$2",
                owner,
                ids[0],
            )
            opened = await client.post(f"/api/v1/library/catalog/{ids[0]}/opened")
            assert opened.status_code == 200
            assert opened.json()["last_page_read"] == 7
            assert (
                await client.post(f"/api/v1/library/catalog/{ids[1]}/opened")
            ).status_code == 200
            assert (
                await client.post(f"/api/v1/library/catalog/{ids[57]}/opened")
            ).status_code == 404
            assert (
                await client.post(f"/api/v1/library/catalog/{ids[56]}/opened")
            ).status_code == 404
            refreshed = await client.get("/api/v1/library/catalog?collection=recent")
            assert {item["id"] for item in refreshed.json()["items"]} == {str(ids[0]), str(ids[1])}
            no_match = await client.get("/api/v1/library/catalog?semester=second")
            assert no_match.json()["total"] == 0
            # Same institution's reviewable record is visible to staff; foreign/deleted remain excluded.
            user["role"] = "university_admin"
            user["roles"] = ["university_admin"]
            staff = await client.get("/api/v1/library/catalog")
            assert staff.status_code == 200
            assert staff.json()["total"] == 56
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(overrides)
        await transaction.rollback()
        await conn.close()
