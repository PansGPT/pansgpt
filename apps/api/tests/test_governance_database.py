"""Real SQL on a designated disposable loopback database; never use hosted data."""

import os
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from uuid import UUID, uuid4

import asyncpg
import pytest
from fastapi import HTTPException

from app.core.config import settings
from app.core.dependencies import UserContext
from app.engines import governance as service
from app.models.governance import Command

pytestmark = [pytest.mark.live, pytest.mark.asyncio]
ROOT = Path(__file__).resolve().parents[3]


@pytest.fixture(autouse=True)
def enable_governance(monkeypatch):
    monkeypatch.setattr(settings, "ENABLE_GOVERNANCE", True)


@asynccontextmanager
async def auth_client(conn, monkeypatch, uid, email):
    import jwt
    from fastapi import FastAPI
    from httpx import ASGITransport, AsyncClient

    from app.core import dependencies
    from app.routers import auth

    monkeypatch.setattr(
        settings, "SUPABASE_JWT_SECRET", "synthetic-governance-invitation-test-secret"
    )
    monkeypatch.setattr(settings, "SUPABASE_URL", "https://governance-invitation.example.invalid")
    monkeypatch.setattr(auth.limiter, "enabled", False)

    @asynccontextmanager
    async def database(**kwargs):
        yield conn

    monkeypatch.setattr(auth, "get_db_connection", database)
    monkeypatch.setattr(dependencies, "get_db_connection", database)
    app = FastAPI()
    app.include_router(auth.router, prefix="/api/v1")
    token = jwt.encode(
        {
            "sub": str(uid),
            "email": email,
            "iss": settings.SUPABASE_URL + "/auth/v1",
            "aud": "authenticated",
            "exp": datetime.now(UTC) + timedelta(minutes=5),
        },
        settings.SUPABASE_JWT_SECRET,
        algorithm="HS256",
    )
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": "Bearer " + token},
    ) as client:
        yield client


def invitation_token(url):
    return parse_qs(urlparse(url).query)["invite"][0]


@pytest.fixture
async def governance_database():
    url = os.getenv("GOVERNANCE_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Disposable GOVERNANCE_TEST_DATABASE_URL not configured")
    parsed = urlparse(url)
    if (
        parsed.hostname not in {"127.0.0.1", "localhost"}
        or parsed.path != "/pansgpt_governance_test"
    ):
        pytest.fail("Only the isolated loopback pansgpt_governance_test database is accepted")
    conn = await asyncpg.connect(url, statement_cache_size=0)
    # Each test rolls back its synthetic records, including immutable audit events.
    tx = conn.transaction()
    await tx.start()
    try:
        yield conn
    finally:
        await tx.rollback()
        await conn.close()


async def seed(conn, role="university_admin", level="senior", university=None):
    university = university or await conn.fetchval(
        "INSERT INTO public.universities(name,slug) VALUES('Synthetic University',$1) RETURNING id",
        uuid4().hex,
    )
    uid = uuid4()
    await conn.execute("INSERT INTO auth.users(id) VALUES($1)", uid)
    await conn.execute(
        "INSERT INTO public.users(id,email,first_name,university_id,roles,current_level) VALUES($1,$2,'Synthetic',$3,ARRAY[$4::public.user_role],'400')",
        uid,
        f"{uid}@example.invalid",
        university,
        role,
    )
    if role == "university_admin":
        await conn.execute(
            "INSERT INTO public.admin_memberships(user_id,university_id,admin_level) VALUES($1,$2,$3)",
            uid,
            university,
            level,
        )
    return UserContext(
        id=uid,
        email=f"{uid}@example.invalid",
        role=role,
        roles=[role],
        university_id=university,
        current_level="400",
    )


async def command(conn, user, resource, action="create", fields=None, row=None):
    actor = await service.identity(conn, user)
    async with conn.transaction():
        return await service.mutate(
            conn,
            user,
            actor,
            resource,
            user.university_id,
            Command(
                action=action,
                id=row.id if row else None,
                expected_version=row.updated_at if row else None,
                reason="Synthetic integration verification",
                fields=fields or {},
            ),
        )


async def listing(conn, user, resource, status=""):
    return await service.listing(
        conn, user, await service.identity(conn, user), resource, user.university_id, "", status, 1
    )


async def test_every_projection_executes_without_private_columns(governance_database):
    conn = governance_database
    user = await seed(conn, "super_admin")
    for resource in service.TABLES:
        page = await listing(conn, user, resource)
        assert page.total >= 0
        for row in page.items:
            assert not {"storage_key", "password", "chat_messages"} & row.fields.keys()


async def test_material_review_outbox_and_audit_are_one_transaction(governance_database):
    conn = governance_database
    user = await seed(conn)
    lecturer = await seed(conn, "lecturer", university=user.university_id)
    doc = await conn.fetchval(
        "INSERT INTO public.documents(university_id,uploaded_by,title,course_code,course_title,storage_key) VALUES($1,$2,'Synthetic lecture','PCL 401','Pharmacology',$3) RETURNING id",
        user.university_id,
        lecturer.id,
        uuid4().hex + ".pdf",
    )
    row = (await listing(conn, user, "materials")).items[0]
    await command(conn, user, "materials", "approve", row=row)
    assert await conn.fetchval("SELECT status FROM public.documents WHERE id=$1", doc) == "active"
    assert (
        await conn.fetchval("SELECT status FROM public.background_jobs WHERE document_id=$1", doc)
        == "pending"
    )
    assert (
        await conn.fetchval(
            "SELECT count(*) FROM public.audit_logs WHERE target_id=$1 AND action='materials.approve'",
            doc,
        )
        == 1
    )


async def test_schedule_conflicts_and_tenant_isolation(governance_database):
    conn = governance_database
    user = await seed(conn)
    other = await seed(conn)
    fields = {
        "course_code": "PCL 401",
        "course_title": "Synthetic Pharmacology",
        "level": "400",
        "day": "Monday",
        "start_time": "09:00",
        "end_time": "11:00",
        "venue": "Test room",
        "academic_session": "2026/2027",
        "semester": "first",
    }
    await command(conn, user, "timetable", fields=fields)
    assert (await listing(conn, other, "timetable")).total == 0
    with pytest.raises(HTTPException) as error:
        await command(
            conn,
            user,
            "timetable",
            fields={**fields, "course_code": "PCL 402", "start_time": "10:00", "end_time": "12:00"},
        )
    assert error.value.status_code == 409


async def test_student_subscription_status_and_stale_edits(governance_database):
    conn = governance_database
    user = await seed(conn)
    student = await seed(conn, "student", university=user.university_id)
    await conn.execute(
        "UPDATE public.users SET updated_at=now()-interval '1 day' WHERE id=$1", student.id
    )
    row = (await listing(conn, user, "students")).items[0]
    await command(
        conn, user, "students", "update", {"subscription_tier": "pro", "current_level": "500"}, row
    )
    assert (
        await conn.fetchval("SELECT subscription_tier FROM public.users WHERE id=$1", student.id)
        == "pro"
    )
    # clock_timestamp in the fixture trigger makes successive version tokens distinct.
    with pytest.raises(HTTPException) as error:
        await command(conn, user, "students", "suspend", row=row)
    assert error.value.status_code == 409


async def test_lecturer_restriction_assignment_and_server_times(governance_database):
    conn = governance_database
    user = await seed(conn, "lecturer")
    start = datetime.now(UTC) + timedelta(hours=1)
    fields = {
        "title": "Synthetic assessment",
        "course_code": "PCL 401",
        "level": "400",
        "start_time": start.isoformat(),
        "end_time": (start + timedelta(hours=1)).isoformat(),
    }
    with pytest.raises(HTTPException) as error:
        await command(conn, user, "restrictions", fields=fields)
    assert error.value.status_code == 403
    await conn.execute(
        "INSERT INTO public.lecturer_course_assignments(user_id,university_id,course_code) VALUES($1,$2,$3)",
        user.id,
        user.university_id,
        "PCL 401",
    )
    await command(conn, user, "restrictions", fields=fields)
    assert (await listing(conn, user, "restrictions")).total == 1


async def test_four_eyes_applies_once_and_audit_cannot_be_rewritten(governance_database):
    conn = governance_database
    author = await seed(conn, "super_admin")
    reviewer = await seed(conn, "super_admin", university=author.university_id)
    await conn.execute(
        "INSERT INTO public.system_settings(id,system_prompt) VALUES(1,'Synthetic baseline')"
    )
    fields = {
        "system_prompt": "Synthetic revised guidance",
        "temperature": "0.5",
        "rag_threshold": "0.4",
        "maintenance_mode": "false",
        "web_search_enabled": "true",
    }
    await command(conn, author, "settings", fields=fields)
    row = (await listing(conn, author, "settings")).items[0]
    with pytest.raises(HTTPException) as error:
        await command(conn, author, "settings", "approve", row=row)
    assert error.value.status_code == 409 or error.value.status_code == 403
    await command(conn, reviewer, "settings", "approve", row=row)
    assert (
        await conn.fetchval("SELECT system_prompt FROM public.system_settings WHERE id=1")
        == fields["system_prompt"]
    )
    with pytest.raises(asyncpg.RaiseError):
        async with conn.transaction():
            await conn.execute("UPDATE public.audit_logs SET action='tampered'")
        # A failed SQL statement aborts the savepoint; its rollback is handled below.


async def test_new_governance_tables_reject_direct_browser_access(governance_database):
    conn = governance_database
    for table in ["admin_memberships", "lecturer_course_assignments", "governance_proposals"]:
        assert await conn.fetchval(
            "SELECT relrowsecurity FROM pg_class WHERE oid=$1::regclass", "public." + table
        )
        assert not await conn.fetchval(
            "SELECT has_table_privilege('authenticated',$1,'INSERT')", "public." + table
        )
        assert not await conn.fetchval(
            "SELECT has_table_privilege('authenticated',$1,'SELECT')", "public." + table
        )


async def test_provisioning_creates_one_term_and_email_bound_senior_invite(governance_database):
    conn = governance_database
    user = await seed(conn, "super_admin")
    result = await command(
        conn,
        user,
        "universities",
        fields={
            "name": "Synthetic New University",
            "short_name": "SNU",
            "slug": uuid4().hex,
            "admin_email": "new-senior@example.invalid",
            "academic_session": "2026/2027",
            "semester": "first",
        },
    )
    assert result.invite_url and "/signup?invite=" in result.invite_url
    invitation = await conn.fetchrow(
        "SELECT * FROM public.invitations WHERE university_id=$1", UUID(result.id)
    )
    assert invitation["grant_roles"] == ["university_admin"]
    assert invitation["grant_admin_level"] == "senior"
    assert (
        invitation["target_email"] == "new-senior@example.invalid" and invitation["max_uses"] == 1
    )
    assert (
        await conn.fetchval(
            "SELECT count(*) FROM public.academic_terms WHERE university_id=$1", UUID(result.id)
        )
        == 1
    )


async def test_http_student_batch_reports_success_and_foreign_failure(
    governance_database, monkeypatch
):
    from fastapi import FastAPI
    from httpx import ASGITransport, AsyncClient

    from app.core.dependencies import get_current_user, require_api_key
    from app.routers.governance import router

    conn = governance_database
    user = await seed(conn)
    student = await seed(conn, "student", university=user.university_id)
    foreign = await seed(conn, "student")
    row = (await listing(conn, user, "students")).items[0]

    @asynccontextmanager
    async def database():
        yield conn

    monkeypatch.setattr(service, "database", database)
    monkeypatch.setattr(settings, "ENABLE_GOVERNANCE", True)
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[require_api_key] = lambda: "web"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        identity_response = await client.get("/api/v1/governance/identity")
        assert identity_response.json()["role"] == "senior"
        response = await client.post(
            "/api/v1/governance/students/batch",
            json={
                "commands": [
                    {
                        "action": "update",
                        "id": row.id,
                        "expected_version": row.updated_at,
                        "reason": "Synthetic batch verification",
                        "fields": {"subscription_tier": "pro"},
                    },
                    {
                        "action": "update",
                        "id": str(foreign.id),
                        "expected_version": row.updated_at,
                        "reason": "Synthetic foreign account check",
                        "fields": {"subscription_tier": "pro"},
                    },
                ]
            },
        )
    assert response.status_code == 200
    assert [item["success"] for item in response.json()["items"]] == [True, False]
    assert (
        await conn.fetchval("SELECT subscription_tier FROM public.users WHERE id=$1", student.id)
        == "pro"
    )
    assert (
        await conn.fetchval("SELECT subscription_tier FROM public.users WHERE id=$1", foreign.id)
        == "free"
    )


async def test_support_internal_notes_are_hidden_from_lecturer(governance_database):
    conn = governance_database
    senior = await seed(conn)
    lecturer = await seed(conn, "lecturer", university=senior.university_id)
    await command(
        conn,
        lecturer,
        "support",
        fields={
            "subject": "Synthetic faculty question",
            "category": "content",
            "message": "Please review this sample issue.",
        },
    )
    row = (await listing(conn, senior, "support")).items[0]
    await command(
        conn,
        senior,
        "support",
        "reply",
        {"message": "Synthetic internal investigation note", "is_internal_note": "true"},
        row,
    )
    assert (
        "Synthetic internal investigation note"
        in (await listing(conn, senior, "support")).items[0].fields["conversation"]
    )
    assert (
        "Synthetic internal investigation note"
        not in (await listing(conn, lecturer, "support")).items[0].fields["conversation"]
    )


async def test_removed_schedule_is_retained_but_disappears_from_catalog(governance_database):
    conn = governance_database
    user = await seed(conn)
    await command(
        conn,
        user,
        "knowledge",
        fields={
            "course_code": "PCL 401",
            "level": "400",
            "knowledge_text": "Synthetic academic context.",
        },
    )
    row = (await listing(conn, user, "knowledge")).items[0]
    await command(conn, user, "knowledge", "delete", row=row)
    assert (await listing(conn, user, "knowledge")).total == 0
    assert await conn.fetchval(
        "SELECT deleted_at IS NOT NULL FROM public.course_knowledge WHERE id=$1", UUID(row.id)
    )


async def test_email_bound_senior_invitation_and_staff_onboarding_with_real_bearer(
    governance_database, monkeypatch
):
    conn = governance_database
    issuer = await seed(conn, "super_admin")
    result = await command(
        conn,
        issuer,
        "universities",
        fields={
            "name": "Invited University",
            "short_name": "IU",
            "slug": uuid4().hex,
            "admin_email": "new-owner@example.invalid",
            "academic_session": "2026/2027",
            "semester": "first",
        },
    )
    uid = uuid4()
    await conn.execute("INSERT INTO auth.users(id) VALUES($1)", uid)
    token = invitation_token(result.invite_url)
    async with auth_client(conn, monkeypatch, uid, "new-owner@example.invalid") as client:
        accepted = await client.post(f"/api/v1/auth/invites/{token}/redeem")
        assert accepted.status_code == 200, accepted.text
        assert (
            await conn.fetchval(
                "SELECT admin_level FROM public.admin_memberships WHERE user_id=$1", uid
            )
            == "senior"
        )
        onboard = await client.post(
            "/api/v1/auth/onboard",
            json={
                "first_name": "Invited",
                "last_name": "Administrator",
                "university_id": result.id,
                "current_level": None,
                "terms_accepted": True,
            },
        )
        assert onboard.status_code == 200, onboard.text
        profile = (await client.get("/api/v1/auth/me")).json()
        assert (
            profile["is_onboarded"]
            and profile["role"] == "university_admin"
            and profile["current_level"] is None
        )
        assert (await client.post(f"/api/v1/auth/invites/{token}/redeem")).status_code == 200
    assert (
        await conn.fetchval("SELECT current_uses FROM public.invitations WHERE token=$1", token)
        == 1
    )
    assert (
        await conn.fetchval(
            "SELECT count(*) FROM public.audit_logs WHERE action='invitations.accept' AND target_id=$1",
            uid,
        )
        == 1
    )


async def test_invitation_email_and_revoked_issuer_are_enforced(governance_database, monkeypatch):
    conn = governance_database
    issuer = await seed(conn)
    uid = uuid4()
    email = "faculty-applicant@example.invalid"
    _, url = await service.create_invitation(conn, issuer, issuer.university_id, "lecturer", email)
    await conn.execute("INSERT INTO auth.users(id) VALUES($1)", uid)
    token = invitation_token(url)
    async with auth_client(conn, monkeypatch, uid, "different@example.invalid") as client:
        assert (await client.post(f"/api/v1/auth/invites/{token}/redeem")).status_code == 403
    await conn.execute(
        "UPDATE public.admin_memberships SET admin_level='standard' WHERE user_id=$1", issuer.id
    )
    async with auth_client(conn, monkeypatch, uid, email) as client:
        assert (await client.post(f"/api/v1/auth/invites/{token}/redeem")).status_code == 403
    assert (
        await conn.fetchval("SELECT current_uses FROM public.invitations WHERE token=$1", token)
        == 0
    )
    assert await conn.fetchval("SELECT count(*) FROM public.users WHERE id=$1", uid) == 0


async def test_disabled_governance_never_reinterprets_bound_invites_as_legacy(
    governance_database, monkeypatch
):
    conn = governance_database
    issuer = await seed(conn)
    uid = uuid4()
    email = "paused-faculty@example.invalid"
    _, url = await service.create_invitation(conn, issuer, issuer.university_id, "lecturer", email)
    await conn.execute("INSERT INTO auth.users(id) VALUES($1)", uid)
    monkeypatch.setattr(settings, "ENABLE_GOVERNANCE", False)
    async with auth_client(conn, monkeypatch, uid, email) as client:
        response = await client.post(f"/api/v1/auth/invites/{invitation_token(url)}/redeem")
        assert response.status_code == 503


async def test_invites_cannot_bypass_existing_administrator_protection(
    governance_database, monkeypatch
):
    conn = governance_database
    issuer = await seed(conn, "super_admin")
    recipient = await seed(conn, "student", university=issuer.university_id)
    _, url = await service.create_invitation(
        conn, issuer, issuer.university_id, "university_admin", recipient.email, "standard"
    )
    await conn.execute(
        "UPDATE public.users SET roles=ARRAY['university_admin']::public.user_role[] WHERE id=$1",
        recipient.id,
    )
    await conn.execute(
        "INSERT INTO public.admin_memberships(user_id,university_id,admin_level) VALUES($1,$2,'senior')",
        recipient.id,
        recipient.university_id,
    )
    async with auth_client(conn, monkeypatch, recipient.id, recipient.email) as client:
        response = await client.post(f"/api/v1/auth/invites/{invitation_token(url)}/redeem")
        assert response.status_code == 409, response.text
    assert (
        await conn.fetchval(
            "SELECT admin_level FROM public.admin_memberships WHERE user_id=$1", recipient.id
        )
        == "senior"
    )
    with pytest.raises(HTTPException) as error:
        await service.create_invitation(
            conn, issuer, issuer.university_id, "university_admin", issuer.email, "senior"
        )
    assert error.value.status_code == 409


async def test_direct_browser_invitation_writes_are_revoked(governance_database):
    for privilege in ["INSERT", "UPDATE", "DELETE"]:
        assert not await governance_database.fetchval(
            "SELECT has_table_privilege('authenticated','public.invitations',$1)", privilege
        )


async def test_internal_notes_rls_filters_students_and_foreign_admins(governance_database):
    conn = governance_database
    senior = await seed(conn)
    lecturer = await seed(conn, "lecturer", university=senior.university_id)
    foreign = await seed(conn)
    await command(
        conn,
        lecturer,
        "support",
        fields={"subject": "RLS sample issue", "category": "content", "message": "Public reply"},
    )
    row = (await listing(conn, senior, "support")).items[0]
    await command(
        conn,
        senior,
        "support",
        "reply",
        {"message": "Internal review only", "is_internal_note": "true"},
        row,
    )
    await conn.execute(
        "GRANT SELECT ON public.support_tickets,public.support_ticket_replies TO authenticated"
    )
    await conn.execute(
        "CREATE POLICY fixture_ticket_access ON public.support_tickets FOR SELECT TO authenticated USING(true)"
    )
    await conn.execute(
        "CREATE POLICY fixture_reply_access ON public.support_ticket_replies FOR SELECT TO authenticated USING(true)"
    )
    for user, expected in [(lecturer, 1), (senior, 2), (foreign, 1)]:
        await conn.fetchval("SELECT set_config('request.jwt.claim.sub',$1,true)", str(user.id))
        await conn.execute("SET LOCAL ROLE authenticated")
        try:
            assert (
                len(
                    await conn.fetch(
                        "SELECT message FROM public.support_ticket_replies WHERE ticket_id=$1",
                        UUID(row.id),
                    )
                )
                == expected
            )
        finally:
            await conn.execute("RESET ROLE")


async def test_semester_rollover_changes_student_schedule_without_deleting_history(
    governance_database,
):
    conn = governance_database
    senior = await seed(conn)
    student = await seed(conn, "student", university=senior.university_id)
    await command(
        conn, senior, "terms", fields={"academic_session": "2026/2027", "semester": "first"}
    )
    base = {
        "course_code": "PCL 401",
        "course_title": "First semester class",
        "level": "400",
        "day": "Monday",
        "start_time": "09:00",
        "end_time": "11:00",
        "venue": "Test room",
        "academic_session": "2026/2027",
        "semester": "first",
    }
    await command(conn, senior, "timetable", fields=base)
    await command(
        conn,
        senior,
        "timetable",
        fields={
            **base,
            "course_code": "PCL 402",
            "course_title": "Second semester class",
            "semester": "second",
        },
    )
    await conn.execute("GRANT SELECT ON public.timetables,public.academic_terms TO authenticated")
    await conn.execute(
        "CREATE POLICY fixture_timetable_access ON public.timetables FOR SELECT TO authenticated USING(true)"
    )
    await conn.execute(
        "CREATE POLICY fixture_term_access ON public.academic_terms FOR SELECT TO authenticated USING(true)"
    )

    async def visible_classes():
        await conn.fetchval("SELECT set_config('request.jwt.claim.sub',$1,true)", str(student.id))
        await conn.execute("SET LOCAL ROLE authenticated")
        try:
            return [
                r["course_code"]
                for r in await conn.fetch(
                    "SELECT course_code FROM public.timetables WHERE university_id=$1",
                    student.university_id,
                )
            ]
        finally:
            await conn.execute("RESET ROLE")

    assert await visible_classes() == ["PCL 401"]
    term = (await listing(conn, senior, "terms")).items[0]
    await command(
        conn,
        senior,
        "terms",
        "update",
        {"academic_session": "2026/2027", "semester": "second"},
        term,
    )
    assert await visible_classes() == ["PCL 402"]
    assert (await listing(conn, senior, "timetable")).total == 2
    assert (
        await conn.fetchval("SELECT current_level::text FROM public.users WHERE id=$1", student.id)
        == "400"
    )
