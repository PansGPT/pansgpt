"""Tenant-scoped governance. SQL identifiers come only from static allowlists."""

import json
import re
import secrets
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from uuid import UUID

import asyncpg
from fastapi import HTTPException

from app.core.config import settings
from app.core.database import get_db_connection
from app.core.dependencies import UserContext
from app.core.ids import uuid7
from app.models.governance import (
    Action,
    Analytics,
    Command,
    Daily,
    Identity,
    Metric,
    Mutation,
    Page,
    Provider,
    Record,
    Resource,
    Role,
)

ACADEMIC: list[Resource] = [
    "materials",
    "timetable",
    "exams",
    "restrictions",
    "knowledge",
    "support",
    "audit",
]
RESOURCES: dict[Role, list[Resource]] = {
    "super_admin": [
        "universities",
        "students",
        "lecturers",
        "administrators",
        "invitations",
        *ACADEMIC,
        "terms",
        "settings",
    ],
    "senior": ["students", "lecturers", "administrators", "invitations", *ACADEMIC, "terms"],
    "standard": ACADEMIC,
    "lecturer": ["materials", "restrictions", "support"],
}
TABLES: dict[Resource, str] = {
    "invitations": "invitations",
    "universities": "universities",
    "students": "users",
    "lecturers": "users",
    "administrators": "users",
    "materials": "documents",
    "timetable": "timetables",
    "exams": "exam_timetables",
    "restrictions": "exam_restrictions",
    "knowledge": "course_knowledge",
    "terms": "academic_terms",
    "support": "support_tickets",
    "audit": "audit_logs",
    "settings": "governance_proposals",
}
FIELDS: dict[Resource, set[str]] = {
    "invitations": set(),
    "universities": {
        "name",
        "short_name",
        "slug",
        "state",
        "country",
        "admin_email",
        "academic_session",
        "semester",
        "max_storage_bytes",
        "monthly_token_quota",
        "status",
    },
    "students": {"email", "current_level", "subscription_tier"},
    "lecturers": {"email", "course_codes"},
    "administrators": {"email", "admin_level"},
    "materials": {
        "title",
        "course_code",
        "course_title",
        "topic",
        "academic_session",
        "semester",
        "target_level",
        "replacement_id",
    },
    "timetable": {
        "level",
        "day",
        "start_time",
        "end_time",
        "course_code",
        "course_title",
        "venue",
        "academic_session",
        "semester",
    },
    "exams": {
        "target_level",
        "exam_date",
        "start_time",
        "end_time",
        "course_code",
        "course_title",
        "venue",
        "academic_session",
        "semester",
    },
    "restrictions": {"title", "course_code", "level", "start_time", "end_time"},
    "knowledge": {"level", "course_code", "knowledge_text"},
    "terms": {"academic_session", "semester"},
    "support": {"subject", "category", "status", "priority", "message", "is_internal_note"},
    "audit": set(),
    "settings": {
        "system_prompt",
        "temperature",
        "maintenance_mode",
        "web_search_enabled",
        "rag_threshold",
    },
}


@asynccontextmanager
async def database() -> AsyncIterator[asyncpg.Connection]:
    async with get_db_connection() as conn:
        if conn is None:
            raise HTTPException(503, "Administrative storage is unavailable. Please retry.")
        yield conn


async def identity(conn: asyncpg.Connection, user: UserContext) -> Identity:
    roles = set(user.roles) | {user.role}
    if "super_admin" in roles:
        role: Role = "super_admin"
    elif "university_admin" in roles:
        level = await conn.fetchval(
            "SELECT admin_level FROM public.admin_memberships WHERE user_id=$1 AND university_id=$2",
            user.id,
            user.university_id,
        )
        role = "senior" if level == "senior" else "standard"
    elif "lecturer" in roles:
        role = "lecturer"
    else:
        raise HTTPException(403, "This workspace is available to administrators and lecturers.")
    if role != "super_admin" and user.university_id is None:
        raise HTTPException(403, "A university assignment is required.")
    name = (
        await conn.fetchval("SELECT name FROM public.universities WHERE id=$1", user.university_id)
        if user.university_id
        else None
    )
    return Identity(
        user_id=str(user.id),
        name=" ".join(filter(None, [user.first_name, user.last_name])) or user.email,
        role=role,
        university_id=str(user.university_id) if user.university_id else None,
        university_name=name or "All universities",
        resources=RESOURCES[role],
    )


def tenant(user: UserContext, actor: Identity, requested: UUID | None) -> UUID | None:
    if actor.role == "super_admin":
        return requested
    if requested is not None and requested != user.university_id:
        raise HTTPException(403, "This university is outside your workspace.")
    return user.university_id


def permit(actor: Identity, resource: Resource) -> None:
    if resource not in actor.resources:
        raise HTTPException(403, "Your role does not permit this operation.")


def actions(resource: Resource, state: str, actor: Identity, owner: bool = False) -> list[Action]:
    if resource == "invitations":
        return ["cancel"] if state == "pending" else []
    if resource in {"audit"}:
        return []
    if resource == "settings":
        return ["approve", "reject"] if state == "pending" and not owner else []
    if resource == "materials":
        if state == "cancelled":
            return []
        if actor.role == "lecturer":
            return (
                ["cancel"]
                if state == "pending_review"
                else ["resubmit"]
                if state == "rejected"
                else []
            )
        if state == "deleted":
            return ["restore"]
        return (
            (["approve", "reject"] if state == "pending_review" else [])
            + ["update", "delete"]
            + (["retry"] if state == "active" else [])
        )
    if resource == "restrictions":
        return ["cancel"] if state in {"active", "scheduled"} else []
    if resource in {"students", "lecturers", "administrators"}:
        if state == "deleted":
            return ["restore"]
        return (["approve", "reject"] if resource == "lecturers" and state == "pending" else []) + [
            "update",
            "suspend" if state == "active" else "activate",
            "delete",
        ]
    if resource == "universities":
        return ["update", "activate" if state != "active" else "suspend", "archive"]
    if resource == "support":
        return ["reply"] if actor.role == "lecturer" else ["update", "reply"]
    return ["update"] if resource == "terms" else ["update", "delete"]


# Deliberate display projections; never expose storage paths, auth metadata or private study content.
def projection(resource: Resource) -> str:
    if resource in {"students", "lecturers", "administrators"}:
        return """u.id, concat_ws(' ',u.first_name,u.last_name) AS title,u.email AS subtitle,
        CASE WHEN u.deleted_at IS NOT NULL THEN 'deleted' ELSE u.account_status END AS status,u.updated_at,
        jsonb_build_object('email',u.email,'current_level',u.current_level,'subscription_tier',u.subscription_tier,
        'university_id',u.university_id,'university',n.name,'admin_level',m.admin_level,'status_reason',u.status_reason,
        'academic_title',u.academic_title,'phone',u.phone,'course_codes',
        (SELECT string_agg(c.course_code,', ' ORDER BY c.course_code) FROM public.lecturer_course_assignments c WHERE c.user_id=u.id AND c.university_id=u.university_id)) AS fields"""
    return {
        "invitations": """u.id,coalesce(u.target_email,'Institutional invitation') AS title,array_to_string(u.grant_roles,', ') AS subtitle,
        CASE WHEN NOT u.is_active THEN 'cancelled' WHEN u.expires_at<=now() THEN 'expired' WHEN u.max_uses>0 AND u.current_uses>=u.max_uses THEN 'accepted' ELSE 'pending' END AS status,u.updated_at,
        jsonb_build_object('email',u.target_email,'grant_roles',array_to_string(u.grant_roles,', '),'admin_level',u.grant_admin_level,'expires_at',u.expires_at,'current_uses',u.current_uses,'max_uses',u.max_uses) AS fields""",
        "universities": """u.id,u.name AS title,concat_ws(' · ',u.short_name,u.state) AS subtitle,u.status,u.updated_at,
        jsonb_build_object('name',u.name,'short_name',u.short_name,'slug',u.slug,'state',u.state,'country',u.country,
        'max_storage_bytes',u.max_storage_bytes,'monthly_token_quota',u.monthly_token_quota,
        'students',(SELECT count(*) FROM public.users s WHERE s.university_id=u.id AND 'student'=ANY(s.roles) AND s.deleted_at IS NULL),
        'storage_bytes',(SELECT coalesce(sum(d.file_size_bytes),0) FROM public.documents d WHERE d.university_id=u.id AND d.deleted_at IS NULL)) AS fields""",
        "materials": """u.id,u.title,u.course_code AS subtitle,
        CASE WHEN u.submission_cancelled_at IS NOT NULL THEN 'cancelled' WHEN u.deleted_at IS NOT NULL THEN 'deleted' ELSE u.status::text END AS status,u.updated_at,
        jsonb_build_object('title',u.title,'course_code',u.course_code,'course_title',u.course_title,'topic',u.topic,
        'academic_session',u.academic_session,'semester',u.semester,'target_level',array_to_string(u.target_levels,', '),
        'processing',u.embedding_status,'progress',u.embedding_progress,'review_note',u.review_note,
        'uploaded_by',u.uploaded_by,'parent_submission_id',u.parent_submission_id,
        'replacement_id',(SELECT d.id FROM public.documents d WHERE d.parent_submission_id=u.id),
        'size_bytes',u.file_size_bytes,'reviewed_at',u.reviewed_at) AS fields""",
        "timetable": """u.id,u.course_code AS title,u.course_title AS subtitle,'published'::text AS status,u.updated_at,
        jsonb_build_object('course_code',u.course_code,'course_title',u.course_title,'level',u.level,'day',u.day,
        'start_time',u.start_time,'end_time',u.end_time,'venue',u.venue,'academic_session',u.academic_session,'semester',u.semester) AS fields""",
        "exams": """u.id,u.course_code AS title,u.course_title AS subtitle,'published'::text AS status,u.updated_at,
        jsonb_build_object('course_code',u.course_code,'course_title',u.course_title,'target_level',u.target_level,
        'exam_date',u.exam_date,'start_time',u.start_time,'end_time',u.end_time,'venue',u.venue,
        'academic_session',u.academic_session,'semester',u.semester) AS fields""",
        "restrictions": """u.id,u.title,coalesce(u.course_code,'All courses') AS subtitle,
        CASE WHEN u.status='cancelled' THEN 'cancelled' WHEN u.end_time<=now() THEN 'completed'
        WHEN u.start_time<=now() THEN 'active' ELSE 'scheduled' END AS status,u.updated_at,
        jsonb_build_object('title',u.title,'course_code',u.course_code,'level',u.level,'start_time',u.start_time,
        'end_time',u.end_time,'reason',u.reason,'created_by',u.created_by) AS fields""",
        "knowledge": """u.id,coalesce(u.course_code,'Academic context') AS title,concat(u.level,' level') AS subtitle,'published'::text AS status,u.updated_at,
        jsonb_build_object('course_code',u.course_code,'level',u.level,'knowledge_text',u.knowledge_text) AS fields""",
        "terms": """u.id,u.academic_session AS title,concat(initcap(u.semester),' semester') AS subtitle,'current'::text AS status,u.updated_at,
        jsonb_build_object('academic_session',u.academic_session,'semester',u.semester) AS fields""",
        "support": """u.id,u.subject AS title,u.category AS subtitle,u.status,u.updated_at,
        jsonb_build_object('subject',u.subject,'category',u.category,'priority',u.priority,'status',u.status,'user_id',u.user_id,
        'conversation',(SELECT string_agg(concat(CASE WHEN r.is_internal_note THEN '[Internal] ' ELSE '' END,s.first_name,': ',r.message),E'\\n\\n' ORDER BY r.created_at) FROM public.support_ticket_replies r LEFT JOIN public.users s ON s.id=r.sender_id WHERE r.ticket_id=u.id AND (NOT r.is_internal_note OR $3::boolean))) AS fields""",
        "audit": """u.id,u.action AS title,coalesce(u.actor_email,'System') AS subtitle,'recorded'::text AS status,u.created_at AS updated_at,
        jsonb_build_object('actor',u.actor_email,'role',u.actor_role,'target_type',u.target_type,'target_id',u.target_id,'change',u.metadata) AS fields""",
        "settings": """u.id,'Configuration proposal'::text AS title,u.reason AS subtitle,u.status,u.updated_at,
        jsonb_build_object('proposed_by',u.proposed_by,'before',u.before_values,'proposed',u.proposed_values) AS fields""",
    }[resource]


async def listing(
    conn: asyncpg.Connection,
    user: UserContext,
    actor: Identity,
    resource: Resource,
    university: UUID | None,
    search: str,
    status: str,
    page: int,
) -> Page:
    permit(actor, resource)
    scope = tenant(user, actor, university)
    table = TABLES[resource]
    is_staff = actor.role != "lecturer"
    where = "($1::uuid IS NULL OR u.university_id=$1)"
    joins = ""
    if resource == "universities":
        where = "($1::uuid IS NULL OR u.id=$1)"
    elif resource == "settings":
        where = "TRUE"
    elif resource in {"students", "lecturers", "administrators"}:
        role = {
            "students": "student",
            "lecturers": "lecturer",
            "administrators": "university_admin",
        }[resource]
        where += f" AND '{role}'=ANY(u.roles) AND NOT 'super_admin'=ANY(u.roles)"
        if resource == "students":
            where += (
                " AND NOT (u.roles && ARRAY['lecturer','university_admin']::public.user_role[])"
            )
        elif resource == "lecturers":
            where += " AND NOT 'university_admin'=ANY(u.roles)"
        joins = " LEFT JOIN public.universities n ON n.id=u.university_id LEFT JOIN public.admin_memberships m ON m.user_id=u.id AND m.university_id=u.university_id"
    elif resource == "support":
        joins = " JOIN public.users owner ON owner.id=u.user_id"
        where = "($1::uuid IS NULL OR coalesce(u.university_id,owner.university_id)=$1)"
    if resource in {"timetable", "exams", "knowledge"}:
        where += " AND u.deleted_at IS NULL"
    if actor.role == "lecturer":
        owner_key = {
            "materials": "uploaded_by",
            "restrictions": "created_by",
            "support": "user_id",
        }[resource]
        where += f" AND u.{owner_key}=$2"
    else:
        where += " AND $2::uuid IS NOT NULL"
    # Reference typed parameters consistently, including projections without staff-specific fields.
    where += " AND ($3::boolean OR NOT $3::boolean) AND ($1::uuid IS NULL OR $1::uuid IS NOT NULL)"
    query = f"SELECT {projection(resource)} FROM public.{table} u {joins} WHERE {where}"
    if resource == "settings":
        query += """ UNION ALL SELECT '00000000-0000-7000-8000-000000000001'::uuid,'Active configuration','Current platform configuration','active',s.updated_at,
        jsonb_build_object('system_prompt',s.system_prompt,'temperature',s.temperature,'rag_threshold',s.rag_threshold,'maintenance_mode',s.maintenance_mode,'web_search_enabled',s.web_search_enabled)
        FROM public.system_settings s WHERE id=1"""
    base = f"WITH view AS ({query}) SELECT * FROM view WHERE ($4='' OR title ILIKE $4 OR subtitle ILIKE $4) AND ($5='' OR status=$5)"
    pattern = (
        "%" + search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        if search
        else ""
    )
    args = [scope, user.id, is_staff, pattern, status]
    total = await conn.fetchval(f"SELECT count(*) FROM ({base}) counted", *args)
    rows = await conn.fetch(
        base + " ORDER BY updated_at DESC,id DESC LIMIT 20 OFFSET $6", *args, (page - 1) * 20
    )
    items: list[Record] = []
    for row in rows:
        fields = json.loads(row["fields"]) if isinstance(row["fields"], str) else row["fields"]
        clean = {
            k: ""
            if v is None
            else str(v).lower()
            if isinstance(v, bool)
            else str(v)
            if not isinstance(v, (dict, list))
            else json.dumps(v, indent=2)
            for k, v in fields.items()
        }
        owner = clean.get("proposed_by") == str(user.id)
        available = actions(resource, row["status"], actor, owner)
        if resource == "materials" and clean.get("replacement_id"):
            available = [a for a in available if a != "resubmit"]
        items.append(
            Record(
                id=str(row["id"]),
                title=row["title"],
                subtitle=row["subtitle"] or "",
                status=row["status"],
                updated_at=row["updated_at"].isoformat(),
                fields=clean,
                actions=available,
            )
        )
    return Page(items=items, total=total, page=page, page_size=20)


def validate_fields(resource: Resource, command: Command) -> dict[str, str]:
    values = command.fields
    if values.keys() - FIELDS[resource]:
        raise HTTPException(422, "Unknown fields for this operation.")
    account_create = {
        "students": {"email", "current_level"},
        "lecturers": {"email"},
        "administrators": {"email", "admin_level"},
    }
    if (
        command.action == "create"
        and resource in account_create
        and values.keys() - account_create[resource]
    ):
        raise HTTPException(
            422,
            "Invitations only accept identity and access fields. Edit other details after acceptance.",
        )
    if command.action == "update":
        update_fields = {
            "students": {"current_level", "subscription_tier"},
            "lecturers": {"course_codes"},
            "administrators": {"admin_level"},
            "support": {"status", "priority"},
            "universities": FIELDS["universities"]
            - {"admin_email", "academic_session", "semester"},
            "materials": FIELDS["materials"] - {"replacement_id"},
        }
        if resource in update_fields and values.keys() - update_fields[resource]:
            raise HTTPException(422, "These fields are not editable in this operation.")
        if not values:
            raise HTTPException(422, "Provide at least one change.")
    if command.action not in {"create", "update", "resubmit", "reply"} and values:
        raise HTTPException(422, "This action accepts a reason only.")
    if (
        resource == "universities"
        and "status" in values
        and (
            command.action != "update"
            or values["status"]
            not in {"active", "suspended", "read_only", "archived", "provisioning"}
        )
    ):
        raise HTTPException(422, "Choose a valid university access mode.")
    for key, value in values.items():
        if key in {"level", "current_level", "target_level"} and value not in {
            "100",
            "200",
            "300",
            "400",
            "500",
            "600",
        }:
            raise HTTPException(422, "Select a level between 100 and 600.")
        if key == "subscription_tier" and value not in {"free", "pro"}:
            raise HTTPException(422, "Select Free or Pro.")
        if key == "semester" and value not in {"first", "second"}:
            raise HTTPException(422, "Select a valid semester.")
        if key == "admin_level" and value not in {"senior", "standard"}:
            raise HTTPException(422, "Select a valid administrator level.")
        if key == "academic_session" and (
            not re.fullmatch(r"20\d{2}/20\d{2}", value) or int(value[-4:]) != int(value[:4]) + 1
        ):
            raise HTTPException(422, "Use consecutive years, for example 2026/2027.")
        if key in {"email", "admin_email"} and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
            raise HTTPException(422, "Enter a valid email address.")
        if key == "slug" and not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", value):
            raise HTTPException(422, "Use a lowercase URL slug.")
        if key in {"max_storage_bytes", "monthly_token_quota"} and (
            not value.isdigit() or not 0 < int(value) <= 10**15
        ):
            raise HTTPException(422, "Quota must be a positive bounded number.")
        if key in {"temperature", "rag_threshold"}:
            try:
                valid = 0 <= float(value) <= 1
            except ValueError:
                valid = False
            if not valid:
                raise HTTPException(422, "Use a number between 0 and 1.")
        if key in {"maintenance_mode", "web_search_enabled", "is_internal_note"} and value not in {
            "true",
            "false",
        }:
            raise HTTPException(422, "Select Enabled or Disabled.")
        limit = (
            16000
            if key in {"system_prompt", "knowledge_text", "message"}
            else 1000
            if key == "course_codes"
            else 255
        )
        if not value or len(value) > limit:
            raise HTTPException(
                422,
                f"{key.replace('_', ' ').capitalize()} is required and must be at most {limit} characters.",
            )
    return values


def required(values: dict[str, str], keys: set[str]) -> None:
    if keys - values.keys():
        raise HTTPException(
            422, "Complete all required fields: " + ", ".join(sorted(keys - values.keys()))
        )


async def audit(
    conn: asyncpg.Connection,
    user: UserContext,
    resource: Resource,
    target: UUID,
    university: UUID | None,
    command: Command,
    before: str | None,
) -> None:
    # Only public/administrative values; never tokens, stored files or private student data.
    previous = json.loads(before) if before else None
    if previous:
        for private_key in ("token", "storage_key", "converted_key"):
            previous.pop(private_key, None)
    await conn.execute(
        """INSERT INTO public.audit_logs(actor_user_id,actor_email,actor_role,university_id,action,target_type,target_id,metadata)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)""",
        user.id,
        user.email,
        user.role,
        university,
        f"{resource}.{command.action}",
        resource,
        target,
        json.dumps(
            {
                "reason": command.reason,
                "before": previous,
                "changes": command.fields,
            }
        ),
    )


async def mutate(
    conn: asyncpg.Connection,
    user: UserContext,
    actor: Identity,
    resource: Resource,
    university: UUID | None,
    command: Command,
) -> Mutation:
    permit(actor, resource)
    if resource == "audit":
        raise HTTPException(403, "Audit records are immutable.")
    if resource == "invitations" and command.action != "cancel":
        raise HTTPException(
            422,
            "Use the appropriate account directory to issue invitations; existing invitations may only be revoked.",
        )
    values = validate_fields(resource, command)
    scope = tenant(user, actor, university)
    if resource == "universities" and command.id is not None:
        scope = command.id
    if resource not in {"universities", "settings"} and scope is None:
        raise HTTPException(422, "Choose a university before making this change.")
    if scope:
        institution = await conn.fetchrow(
            "SELECT status FROM public.universities WHERE id=$1 FOR SHARE", scope
        )
        if not institution:
            raise HTTPException(404, "University not found.")
        if institution["status"] != "active" and resource != "universities":
            raise HTTPException(423, "This university is not accepting changes.")
    if (
        actor.role == "lecturer"
        and resource == "materials"
        and command.action not in {"cancel", "resubmit"}
    ):
        raise HTTPException(403, "Lecturers submit materials using the upload workflow.")
    if (
        actor.role == "lecturer"
        and resource == "support"
        and (values.get("is_internal_note") == "true" or command.action not in {"create", "reply"})
    ):
        raise HTTPException(403, "This support action is restricted.")
    target = command.id or uuid7()
    before: str | None = None
    row: asyncpg.Record | None = None
    table = TABLES[resource]
    if command.action != "create":
        if command.id is None or command.expected_version is None:
            raise HTTPException(422, "A record and its current version are required.")
        scope_column = "id" if resource == "universities" else "university_id"
        condition = (
            "TRUE"
            if resource == "settings"
            else "id IN (SELECT s.id FROM public.support_tickets s JOIN public.users o ON o.id=s.user_id WHERE coalesce(s.university_id,o.university_id)=$2)"
            if resource == "support"
            else f"{scope_column}=$2"
        )
        query = f"SELECT *,to_jsonb(t)::text AS snapshot FROM public.{table} t WHERE id=$1 AND {condition} FOR UPDATE"
        row = (
            await conn.fetchrow(query, target)
            if resource == "settings"
            else await conn.fetchrow(query, target, scope)
        )
        if row is None:
            raise HTTPException(404, "Record not found in this university.")
        if row["updated_at"].isoformat() != command.expected_version:
            raise HTTPException(409, "This record changed. Refresh it before trying again.")
        before = row["snapshot"]
        if actor.role == "lecturer":
            owner_key = {
                "materials": "uploaded_by",
                "restrictions": "created_by",
                "support": "user_id",
            }[resource]
            if row[owner_key] != user.id:
                raise HTTPException(404, "Record not found.")
        state = (
            "cancelled"
            if row.get("submission_cancelled_at") is not None
            else "deleted"
            if row.get("deleted_at")
            else row.get("account_status") or row.get("status") or "published"
        )
        if resource == "invitations":
            state = (
                "pending"
                if row["is_active"]
                and (row["expires_at"] is None or row["expires_at"] > datetime.now(UTC))
                and (row["max_uses"] == 0 or row["current_uses"] < row["max_uses"])
                else "unavailable"
            )
        if command.action not in actions(resource, state, actor, row.get("proposed_by") == user.id):
            raise HTTPException(409, "This action is not available for the current record state.")
    invite_url: str | None = None
    async with conn.transaction():
        if resource == "invitations":
            await conn.execute(
                "UPDATE public.invitations SET is_active=false,updated_at=now() WHERE id=$1", target
            )
        elif resource in {"students", "lecturers", "administrators"}:
            if command.action == "create":
                required(
                    values, {"email", "admin_level"} if resource == "administrators" else {"email"}
                )
                if (
                    resource == "administrators"
                    and actor.role != "super_admin"
                    and values["admin_level"] != "standard"
                ):
                    raise HTTPException(
                        403, "Only a platform administrator can invite senior administrators."
                    )
                target, invite_url = await create_invitation(
                    conn,
                    user,
                    scope,
                    {
                        "students": "student",
                        "lecturers": "lecturer",
                        "administrators": "university_admin",
                    }[resource],
                    values["email"],
                    values.get("admin_level"),
                    values.get("current_level"),
                )
            else:
                target = await mutate_user(conn, user, actor, resource, scope, command, row)
        elif resource == "universities":
            target, invite_url = await mutate_university(conn, user, target, command, row)
            scope = target
        elif resource == "materials":
            await mutate_material(conn, user, target, scope, command, row)
        elif resource == "settings":
            await mutate_settings(conn, user, target, command, row)
        elif resource == "support":
            await mutate_support(conn, user, target, scope, command, row)
        else:
            await mutate_academic(conn, user, target, scope, resource, command, row)
        await audit(conn, user, resource, target, scope, command, before)
    return Mutation(
        id=str(target),
        message="Change saved."
        if resource != "settings" or command.action != "create"
        else "Proposal saved. A second platform administrator must review it.",
        invite_url=invite_url,
    )


async def create_invitation(
    conn: asyncpg.Connection,
    user: UserContext,
    scope: UUID | None,
    role: str,
    email: str,
    level: str | None = None,
    target_level: str | None = None,
) -> tuple[UUID, str]:
    if scope is None:
        raise HTTPException(422, "Choose a university for this invitation.")
    if role == "university_admin" and level not in {"senior", "standard"}:
        raise HTTPException(422, "Select an administrator level.")
    existing = await conn.fetchrow(
        "SELECT id,university_id,roles FROM public.users WHERE lower(email)=lower($1) AND deleted_at IS NULL",
        email,
    )
    if existing and (
        existing["university_id"] not in {None, scope} or "super_admin" in existing["roles"]
    ):
        raise HTTPException(409, "This account is already assigned to another workspace.")
    if existing and (
        existing["id"] == user.id
        or (role == "university_admin" and "university_admin" in existing["roles"])
    ):
        raise HTTPException(
            409,
            "Manage existing administrators through their directory. Invitations cannot change your own access.",
        )
    target = uuid7()
    token = secrets.token_urlsafe(32)
    await conn.execute(
        """INSERT INTO public.invitations(id,token,university_id,issued_by,grant_roles,target_level,max_uses,expires_at,target_email,grant_admin_level)
    VALUES($1,$2,$3,$4,ARRAY[$5::public.user_role],$6::public.university_level,1,now()+interval '7 days',$7,$8)""",
        target,
        token,
        scope,
        user.id,
        role,
        target_level,
        email.lower(),
        level,
    )
    return target, f"{settings.FRONTEND_URL.rstrip('/')}/signup?invite={token}"


async def mutate_user(
    conn: asyncpg.Connection,
    user: UserContext,
    actor: Identity,
    resource: Resource,
    scope: UUID | None,
    command: Command,
    row: asyncpg.Record | None,
) -> UUID:
    values = command.fields
    if command.action == "create":
        if resource == "students":
            raise HTTPException(422, "Students register through the student onboarding flow.")
        required(values, {"email", "admin_level"} if resource == "administrators" else {"email"})
        row = await conn.fetchrow(
            "SELECT * FROM public.users WHERE lower(email)=lower($1) AND university_id=$2 AND deleted_at IS NULL FOR UPDATE",
            values["email"],
            scope,
        )
        if not row:
            raise HTTPException(
                404,
                "An existing verified university account is required. Ask this person to register first.",
            )
    assert row is not None
    target: UUID = row["id"]
    target_roles = set(row["roles"])
    expected = {
        "students": "student",
        "lecturers": "lecturer",
        "administrators": "university_admin",
    }[resource]
    if command.action != "create" and expected not in target_roles:
        raise HTTPException(404, "Account not found in this directory.")
    if "super_admin" in target_roles or target == user.id:
        raise HTTPException(403, "You cannot modify this privileged account or your own access.")
    membership = await conn.fetchval(
        "SELECT admin_level FROM public.admin_memberships WHERE user_id=$1", target
    )
    if actor.role != "super_admin" and (
        "university_admin" in target_roles or values.get("admin_level") == "senior"
    ):
        if (
            resource != "administrators"
            or membership == "senior"
            or values.get("admin_level") == "senior"
        ):
            raise HTTPException(
                403, "Only a platform administrator can modify senior administrators."
            )
    if resource == "students" and target_roles & {"lecturer", "university_admin"}:
        raise HTTPException(403, "Manage staff through the appropriate staff directory.")
    if (
        resource == "administrators"
        and membership == "senior"
        and command.action in {"delete", "suspend", "update"}
    ):
        # Serialize all membership changes for a tenant, preserving its last senior administrator.
        await conn.fetchval("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", str(scope))
        count = await conn.fetchval(
            "SELECT count(*) FROM public.admin_memberships m JOIN public.users u ON u.id=m.user_id WHERE m.university_id=$1 AND m.admin_level='senior' AND u.account_status='active' AND u.deleted_at IS NULL",
            scope,
        )
        if count <= 1:
            raise HTTPException(
                409, "Assign another active senior administrator before changing this account."
            )
    if command.action == "create":
        await conn.execute(
            "UPDATE public.users SET roles=array_append(roles,$2::public.user_role),updated_at=now() WHERE id=$1 AND NOT $2::public.user_role=ANY(roles)",
            target,
            expected,
        )
    if resource == "administrators" and command.action in {"create", "update"}:
        required(values, {"admin_level"})
        if actor.role != "super_admin" and values["admin_level"] != "standard":
            raise HTTPException(
                403, "Senior administrators may assign standard administrators only."
            )
        await conn.execute(
            """INSERT INTO public.admin_memberships(user_id,university_id,admin_level,assigned_by)
        VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET admin_level=EXCLUDED.admin_level,assigned_by=EXCLUDED.assigned_by,updated_at=now()""",
            target,
            scope,
            values["admin_level"],
            user.id,
        )
    elif resource == "students" and command.action == "update":
        if not values:
            raise HTTPException(422, "Choose an academic level or subscription tier.")
        for key in ("current_level", "subscription_tier"):
            if key in values:
                cast = "::public.university_level" if key == "current_level" else ""
                await conn.execute(
                    f"UPDATE public.users SET {key}=$2{cast},updated_at=now() WHERE id=$1",
                    target,
                    values[key],
                )
    elif (
        resource == "lecturers"
        and command.action in {"create", "update"}
        and "course_codes" in values
    ):
        courses = sorted({s.strip().upper() for s in values["course_codes"].split(",")})
        if len(courses) > 30 or any(
            not re.fullmatch(r"[A-Z0-9][A-Z0-9 -]{1,19}", c) for c in courses
        ):
            raise HTTPException(422, "Use at most 30 comma-separated course codes.")
        await conn.execute(
            "DELETE FROM public.lecturer_course_assignments WHERE user_id=$1 AND university_id=$2",
            target,
            scope,
        )
        for course in courses:
            await conn.execute(
                "INSERT INTO public.lecturer_course_assignments(user_id,university_id,course_code,assigned_by) VALUES($1,$2,$3,$4)",
                target,
                scope,
                course,
                user.id,
            )
    transitions = {
        "approve": "active",
        "activate": "active",
        "suspend": "suspended",
        "reject": "rejected",
    }
    if command.action in transitions:
        await conn.execute(
            "UPDATE public.users SET account_status=$2,status_reason=$3,updated_at=now() WHERE id=$1",
            target,
            transitions[command.action],
            command.reason,
        )
    elif command.action == "delete":
        await conn.execute(
            "UPDATE public.users SET deleted_at=now(),status_reason=$2,updated_at=now() WHERE id=$1",
            target,
            command.reason,
        )
    elif command.action == "restore":
        if row["deleted_at"] is None or (datetime.now(UTC) - row["deleted_at"]).days >= 30:
            raise HTTPException(409, "The 30-day recovery period has ended.")
        await conn.execute(
            "UPDATE public.users SET deleted_at=NULL,updated_at=now() WHERE id=$1", target
        )
    await conn.execute("UPDATE public.users SET updated_at=now() WHERE id=$1", target)
    return target


async def mutate_university(
    conn: asyncpg.Connection,
    user: UserContext,
    target: UUID,
    command: Command,
    row: asyncpg.Record | None,
) -> tuple[UUID, str | None]:
    values = command.fields
    invite_url: str | None = None
    if command.action == "create":
        required(
            values, {"name", "short_name", "slug", "admin_email", "academic_session", "semester"}
        )
        await conn.execute(
            """INSERT INTO public.universities(id,name,short_name,slug,country,state,max_storage_bytes,monthly_token_quota)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8)""",
            target,
            values["name"],
            values["short_name"],
            values["slug"],
            values.get("country", "Nigeria"),
            values.get("state"),
            int(values.get("max_storage_bytes", "16106127360")),
            int(values.get("monthly_token_quota", "100000000")),
        )
        _, invite_url = await create_invitation(
            conn, user, target, "university_admin", values["admin_email"], "senior"
        )
        await conn.execute(
            "INSERT INTO public.academic_terms(university_id,academic_session,semester,updated_by) VALUES($1,$2,$3,$4)",
            target,
            values["academic_session"],
            values["semester"],
            user.id,
        )
    elif command.action == "update":
        for key in (
            "name",
            "short_name",
            "slug",
            "country",
            "state",
            "max_storage_bytes",
            "monthly_token_quota",
            "status",
        ):
            if key in values:
                value = (
                    int(values[key])
                    if key in {"max_storage_bytes", "monthly_token_quota"}
                    else values[key]
                )
                await conn.execute(
                    f"UPDATE public.universities SET {key}=$2,updated_at=now() WHERE id=$1",
                    target,
                    value,
                )
    else:
        await conn.execute(
            "UPDATE public.universities SET status=$2,updated_at=now() WHERE id=$1",
            target,
            {"activate": "active", "suspend": "suspended", "archive": "archived"}[command.action],
        )
    return target, invite_url


async def mutate_material(
    conn: asyncpg.Connection,
    user: UserContext,
    target: UUID,
    scope: UUID | None,
    command: Command,
    row: asyncpg.Record | None,
) -> None:
    if row is None:
        raise HTTPException(422, "Upload materials using the document upload form.")
    if command.action == "resubmit":
        required(command.fields, {"replacement_id"})
        try:
            replacement = UUID(command.fields["replacement_id"])
        except ValueError as exc:
            raise HTTPException(422, "Choose a valid replacement submission.") from exc
        changed = await conn.fetchval(
            """UPDATE public.documents SET parent_submission_id=$2,updated_at=now()
        WHERE id=$1 AND university_id=$3 AND uploaded_by=$4 AND status='pending_review'
        AND parent_submission_id IS NULL AND deleted_at IS NULL AND id!=$2 RETURNING id""",
            replacement,
            target,
            scope,
            user.id,
        )
        if not changed:
            raise HTTPException(409, "The replacement must be your own pending submission.")
        return
    if command.action in {"approve", "retry"}:
        # Durable outbox is committed with approval. Existing worker retries delivery.
        from app.engines.job_outbox import record_job

        if command.action == "retry":
            await conn.execute("SELECT public.prepare_document_reembed($1)", target)
            return
        if command.action == "approve":
            await conn.execute(
                "UPDATE public.documents SET status='active',review_note=$2,reviewed_by=$3,reviewed_at=now(),updated_at=now() WHERE id=$1",
                target,
                command.reason,
                user.id,
            )
        await record_job(str(target), row["storage_key"], "ingest_document_job", connection=conn)
    elif command.action == "reject":
        await conn.execute(
            "UPDATE public.documents SET status='rejected',review_note=$2,reviewed_by=$3,reviewed_at=now(),updated_at=now() WHERE id=$1",
            target,
            command.reason,
            user.id,
        )
    elif command.action == "cancel":
        await conn.execute(
            "UPDATE public.documents SET submission_cancelled_at=now(),deleted_at=now(),updated_at=now() WHERE id=$1",
            target,
        )
    elif command.action == "delete":
        await conn.execute(
            "UPDATE public.documents SET deleted_at=now(),updated_at=now() WHERE id=$1", target
        )
    elif command.action == "restore":
        if row["deleted_at"] is None or (datetime.now(UTC) - row["deleted_at"]).days >= 30:
            raise HTTPException(409, "The 30-day recovery period has ended.")
        await conn.execute(
            "UPDATE public.documents SET deleted_at=NULL,updated_at=now() WHERE id=$1", target
        )
    elif command.action == "update":
        for key, value in command.fields.items():
            if key == "replacement_id":
                raise HTTPException(422, "Use the resubmission workflow.")
            if key == "target_level":
                await conn.execute(
                    "UPDATE public.documents SET target_levels=ARRAY[$2::public.university_level],updated_at=now() WHERE id=$1",
                    target,
                    value,
                )
            else:
                await conn.execute(
                    f"UPDATE public.documents SET {key}=$2,updated_at=now() WHERE id=$1",
                    target,
                    value,
                )


async def mutate_academic(
    conn: asyncpg.Connection,
    user: UserContext,
    target: UUID,
    scope: UUID | None,
    resource: Resource,
    command: Command,
    row: asyncpg.Record | None,
) -> None:
    values = dict(command.fields)
    table = TABLES[resource]
    if command.action == "delete":
        # Academic rows remain in the immutable audit snapshot, while the student schedule is updated.
        await conn.execute(
            f"UPDATE public.{table} SET deleted_at=now(),updated_at=now() WHERE id=$1 AND university_id=$2",
            target,
            scope,
        )
        return
    if command.action == "cancel":
        if row is None or row["end_time"] <= datetime.now(UTC) or row["status"] == "cancelled":
            raise HTTPException(409, "This restriction has already ended.")
        await conn.execute(
            "UPDATE public.exam_restrictions SET status='cancelled',updated_at=now() WHERE id=$1",
            target,
        )
        return
    if resource in {"timetable", "exams"}:
        required(values, {"academic_session", "semester"})
        required(
            values,
            {"course_code", "course_title", "start_time", "end_time", "level", "day"}
            if resource == "timetable"
            else {
                "course_code",
                "course_title",
                "start_time",
                "end_time",
                "target_level",
                "exam_date",
                "venue",
            },
        )
        for key in ("start_time", "end_time"):
            if not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", values[key]):
                raise HTTPException(422, "Use 24-hour times in HH:MM format.")
        if values["start_time"] >= values["end_time"]:
            raise HTTPException(422, "End time must be after start time.")
        if resource == "timetable" and values["day"] not in [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
        ]:
            raise HTTPException(422, "Choose a valid teaching day.")
        # Prevent concurrent overlapping events for the same cohort.
        await conn.fetchval(
            "SELECT pg_advisory_xact_lock(hashtextextended($1,0))", str(scope) + resource
        )
        level = values.get("level") or values["target_level"]
        day_key = "day" if resource == "timetable" else "exam_date"
        level_key = "level" if resource == "timetable" else "target_level"
        conflict = await conn.fetchval(
            f"""SELECT EXISTS(SELECT 1 FROM public.{table} WHERE university_id=$1
        AND deleted_at IS NULL AND {level_key}=$2::public.university_level AND {day_key}::text=$3 AND id!=$4
        AND coalesce(start_time::text,'00:00')<$6 AND coalesce(end_time::text,'23:59')>$5
        AND (academic_session IS NULL OR academic_session=$7) AND (semester IS NULL OR semester=$8))""",
            scope,
            level,
            values[day_key],
            target,
            values["start_time"],
            values["end_time"],
            values["academic_session"],
            values["semester"],
        )
        if conflict:
            raise HTTPException(
                409, "This event overlaps another event for the same academic level."
            )
        if resource == "timetable":
            values["time_slot"] = f"{values['start_time']} - {values['end_time']}"
    elif resource == "restrictions":
        required(values, {"title", "level", "start_time", "end_time"})
        try:
            start, end = [
                datetime.fromisoformat(values[k].replace("Z", "+00:00"))
                for k in ("start_time", "end_time")
            ]
        except ValueError as exc:
            raise HTTPException(422, "Enter valid exam dates with a timezone.") from exc
        if (
            start.tzinfo is None
            or end.tzinfo is None
            or end <= start
            or end <= datetime.now(UTC)
            or (end - start).total_seconds() > 86400
        ):
            raise HTTPException(
                422,
                "Choose an upcoming restriction of at most 24 hours, with an end after its start.",
            )
        if user.role == "lecturer":
            code = values.get("course_code", "").upper()
            assigned = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM public.lecturer_course_assignments WHERE user_id=$1 AND university_id=$2 AND course_code=$3)",
                user.id,
                scope,
                code,
            )
            if not assigned:
                raise HTTPException(403, "You may only restrict courses assigned to you.")
        values["created_by"] = str(user.id)
        values["reason"] = command.reason
    elif resource == "knowledge":
        required(values, {"level", "knowledge_text"})
    elif resource == "terms":
        required(values, {"academic_session", "semester"})
        values["updated_by"] = str(user.id)
    casts = {
        "level": "::public.university_level",
        "target_level": "::public.university_level",
        "created_by": "::text::uuid",
        "updated_by": "::text::uuid",
    }
    if resource == "exams":
        casts.update(exam_date="::text::date", start_time="::text::time", end_time="::text::time")
    elif resource == "restrictions":
        casts.update(start_time="::text::timestamptz", end_time="::text::timestamptz")
    keys = list(values)
    params = [f"${i + 3}{casts.get(key, '')}" for i, key in enumerate(keys)]
    if command.action == "create":
        await conn.execute(
            f"INSERT INTO public.{table}(id,university_id,{','.join(keys)}) VALUES($1,$2,{','.join(params)})",
            target,
            scope,
            *values.values(),
        )
    else:
        sets = ",".join(f"{key}={param}" for key, param in zip(keys, params, strict=True))
        await conn.execute(
            f"UPDATE public.{table} SET {sets},updated_at=now() WHERE id=$1 AND university_id=$2",
            target,
            scope,
            *values.values(),
        )


async def mutate_settings(
    conn: asyncpg.Connection,
    user: UserContext,
    target: UUID,
    command: Command,
    row: asyncpg.Record | None,
) -> None:
    if command.action == "create":
        required(command.fields, FIELDS["settings"])
        current = await conn.fetchval(
            "SELECT to_jsonb(s)::text FROM public.system_settings s WHERE id=1 FOR UPDATE"
        )
        if not current:
            raise HTTPException(
                409, "Initialize the baseline system settings before proposing changes."
            )
        await conn.execute(
            "INSERT INTO public.governance_proposals(id,proposed_by,before_values,proposed_values,reason) VALUES($1,$2,$3::jsonb,$4::jsonb,$5)",
            target,
            user.id,
            current,
            json.dumps(command.fields),
            command.reason,
        )
        return
    assert row is not None
    if row["proposed_by"] == user.id:
        raise HTTPException(403, "A second administrator must review this proposal.")
    if command.action == "approve":
        current = await conn.fetchval(
            "SELECT to_jsonb(s)::text FROM public.system_settings s WHERE id=1 FOR UPDATE"
        )
        before = (
            json.loads(row["before_values"])
            if isinstance(row["before_values"], str)
            else row["before_values"]
        )
        if json.loads(current) != before:
            raise HTTPException(409, "Active settings have changed. Create a fresh proposal.")
        values = (
            json.loads(row["proposed_values"])
            if isinstance(row["proposed_values"], str)
            else row["proposed_values"]
        )
        await conn.execute(
            """INSERT INTO public.system_settings_history(system_prompt,temperature,maintenance_mode,web_search_enabled,rag_threshold,changed_by,change_reason)
        SELECT system_prompt,temperature,maintenance_mode,web_search_enabled,rag_threshold,$1,$2 FROM public.system_settings WHERE id=1""",
            user.id,
            command.reason,
        )
        await conn.execute(
            """UPDATE public.system_settings SET system_prompt=$1,temperature=$2,maintenance_mode=$3,web_search_enabled=$4,rag_threshold=$5,updated_by=$6,updated_at=now() WHERE id=1""",
            values["system_prompt"],
            float(values["temperature"]),
            values["maintenance_mode"] == "true",
            values["web_search_enabled"] == "true",
            float(values["rag_threshold"]),
            user.id,
        )
    await conn.execute(
        "UPDATE public.governance_proposals SET status=$2,reviewed_by=$3,updated_at=now() WHERE id=$1",
        target,
        "approved" if command.action == "approve" else "rejected",
        user.id,
    )


async def mutate_support(
    conn: asyncpg.Connection,
    user: UserContext,
    target: UUID,
    scope: UUID | None,
    command: Command,
    row: asyncpg.Record | None,
) -> None:
    values = command.fields
    if command.action == "create":
        required(values, {"subject", "category", "message"})
        await conn.execute(
            "INSERT INTO public.support_tickets(id,user_id,subject,category,university_id) VALUES($1,$2,$3,$4,$5)",
            target,
            user.id,
            values["subject"],
            values["category"],
            scope,
        )
    if command.action in {"create", "reply"}:
        required(values, {"message"})
        await conn.execute(
            "INSERT INTO public.support_ticket_replies(ticket_id,sender_id,message,is_internal_note) VALUES($1,$2,$3,$4)",
            target,
            user.id,
            values["message"],
            values.get("is_internal_note") == "true",
        )
    elif command.action == "update":
        for key in ("status", "priority"):
            if key in values:
                allowed = (
                    {"open", "in_progress", "resolved", "closed"}
                    if key == "status"
                    else {"low", "normal", "high", "urgent"}
                )
                if values[key] not in allowed:
                    raise HTTPException(422, "Select a valid ticket status and priority.")
                await conn.execute(
                    f"UPDATE public.support_tickets SET {key}=$2 WHERE id=$1", target, values[key]
                )
    await conn.execute("UPDATE public.support_tickets SET updated_at=now() WHERE id=$1", target)


async def analytics(
    conn: asyncpg.Connection, user: UserContext, actor: Identity, university: UUID | None
) -> Analytics:
    if actor.role == "lecturer":
        raise HTTPException(403, "Analytics are available to administrators.")
    scope = tenant(user, actor, university)
    row = await conn.fetchrow(
        """SELECT count(*) AS requests,coalesce(sum(prompt_tokens+completion_tokens),0) AS tokens,
    coalesce(avg(latency_ms),0) AS latency,count(*) FILTER(WHERE status IN ('error','timeout')) AS failures
    FROM public.ai_telemetry WHERE ($1::uuid IS NULL OR university_id=$1) AND created_at>=now()-interval '30 days' """,
        scope,
    )
    days = await conn.fetch(
        """SELECT created_at::date::text AS date,count(*) AS requests,sum(prompt_tokens+completion_tokens) AS tokens
    FROM public.ai_telemetry WHERE ($1::uuid IS NULL OR university_id=$1) AND created_at>=now()-interval '30 days'
    GROUP BY created_at::date ORDER BY created_at::date""",
        scope,
    )
    providers = await conn.fetch(
        """SELECT provider::text,count(*) AS requests,coalesce(sum(prompt_tokens+completion_tokens),0) AS tokens,
    coalesce(avg(latency_ms),0) AS latency_ms,count(*) FILTER(WHERE status IN ('error','timeout')) AS failures
    FROM public.ai_telemetry WHERE ($1::uuid IS NULL OR university_id=$1) AND created_at>=now()-interval '30 days' GROUP BY provider""",
        scope,
    )
    return Analytics(
        metrics=[
            Metric(label="AI requests", value=row["requests"], unit="requests"),
            Metric(label="Tokens used", value=row["tokens"], unit="tokens"),
            Metric(label="Average latency", value=round(row["latency"]), unit="ms"),
            Metric(label="Failed requests", value=row["failures"], unit="requests"),
        ],
        daily=[Daily(**dict(r)) for r in days],
        providers=[Provider(**dict(r)) for r in providers],
    )
