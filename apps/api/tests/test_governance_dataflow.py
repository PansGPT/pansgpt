"""Real database boundaries for revoked invitations and approved shared curricula."""

from uuid import UUID, uuid4

import pytest

from app.engines import governance as service
from app.engines.governance_policy import load_policy
from tests.test_governance_database import (
    auth_client,
    command,
    invitation_token,
    listing,
    seed,
)
from tests.test_governance_database import (
    enable_governance as enable_governance,
)
from tests.test_governance_database import (
    governance_database as governance_database,
)

pytestmark = [pytest.mark.live, pytest.mark.asyncio]


async def test_invitation_revocation_blocks_acceptance_and_redacts_the_audit(
    governance_database, monkeypatch
):
    conn = governance_database
    issuer = await seed(conn)
    uid = uuid4()
    email = "revoked@example.invalid"
    _, url = await service.create_invitation(conn, issuer, issuer.university_id, "lecturer", email)
    token = invitation_token(url)
    await conn.execute("INSERT INTO auth.users(id) VALUES($1)", uid)
    row = (await listing(conn, issuer, "invitations")).items[0]
    assert "token" not in row.fields
    await command(conn, issuer, "invitations", "cancel", row=row)
    async with auth_client(conn, monkeypatch, uid, email) as client:
        assert (await client.post(f"/api/v1/auth/invites/{token}/redeem")).status_code == 410
    audit = await conn.fetchval(
        "SELECT metadata::text FROM public.audit_logs WHERE action='invitations.cancel' AND target_id=$1",
        UUID(row.id),
    )
    assert token not in audit


async def test_shared_curriculum_is_bounded_and_scoped_to_university_level_and_course(
    governance_database,
):
    conn = governance_database
    senior = await seed(conn)
    other = await seed(conn)
    await command(
        conn,
        senior,
        "knowledge",
        fields={
            "level": "400",
            "course_code": "PCL 401",
            "knowledge_text": "Approved PCL 401 objectives.",
        },
    )
    await command(
        conn,
        senior,
        "knowledge",
        fields={
            "level": "400",
            "course_code": "PCT 403",
            "knowledge_text": "Another course context.",
        },
    )
    await command(
        conn,
        senior,
        "knowledge",
        fields={
            "level": "300",
            "course_code": "PCL 401",
            "knowledge_text": "Another cohort context.",
        },
    )
    await command(
        conn,
        other,
        "knowledge",
        fields={
            "level": "400",
            "course_code": "PCL 401",
            "knowledge_text": "Foreign university context.",
        },
    )
    policy = await load_policy(conn, senior.university_id, "400", "pcl 401")
    assert policy.curriculum_context == "Approved PCL 401 objectives."
    assert len(policy.curriculum_context) <= 12000
    assert not (await load_policy(conn, senior.university_id, "400", None)).curriculum_context
    # More than eight long entries exercise the actual character and row bounds.
    await conn.executemany(
        """INSERT INTO public.course_knowledge(university_id,level,course_code,knowledge_text,updated_at)
        VALUES($1,'400','PCL 401',$2,now()+interval '1 day')""",
        [(senior.university_id, str(index) * 2000) for index in range(9)],
    )
    bounded = await load_policy(conn, senior.university_id, "400", "PCL 401")
    assert len(bounded.curriculum_context) == 12000
    assert len(bounded.curriculum_context.split("\n\n")) == 8
    await conn.execute(
        "UPDATE public.course_knowledge SET deleted_at=now() WHERE university_id=$1",
        senior.university_id,
    )
    assert not (await load_policy(conn, senior.university_id, "400", "PCL 401")).curriculum_context
