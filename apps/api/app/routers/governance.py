"""Administrative API. Authentication, client identity and role checks always apply."""

from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, Response

from app.core.config import settings
from app.core.dependencies import UserContext, get_current_user, require_api_key
from app.engines import governance as service
from app.models.governance import (
    Analytics,
    BatchCommand,
    BatchItem,
    BatchResult,
    Command,
    Identity,
    Mutation,
    Page,
    Resource,
)
from app.models.library import ConfirmUploadResponse


async def enabled() -> None:
    if not settings.ENABLE_GOVERNANCE:
        raise HTTPException(
            503, "Administrative access is being configured. Please try again shortly."
        )


router = APIRouter(
    prefix="/governance",
    tags=["Administrative governance"],
    dependencies=[Depends(require_api_key), Depends(enabled)],
)


@router.get("/identity", response_model=Identity)
async def identity(response: Response, user: UserContext = Depends(get_current_user)) -> Identity:
    response.headers["Cache-Control"] = "private, no-store"
    async with service.database() as conn:
        return await service.identity(conn, user)


@router.get("/analytics", response_model=Analytics)
async def analytics(
    response: Response,
    university_id: UUID | None = None,
    user: UserContext = Depends(get_current_user),
) -> Analytics:
    response.headers["Cache-Control"] = "private, no-store"
    async with service.database() as conn:
        actor = await service.identity(conn, user)
        return await service.analytics(conn, user, actor, university_id)


@router.get("/{resource}", response_model=Page)
async def listing(
    resource: Resource,
    response: Response,
    university_id: UUID | None = None,
    search: str = Query(default="", max_length=150),
    status: str = Query(default="", max_length=40),
    page: int = Query(default=1, ge=1, le=10000),
    user: UserContext = Depends(get_current_user),
) -> Page:
    response.headers["Cache-Control"] = "private, no-store"
    async with service.database() as conn:
        actor = await service.identity(conn, user)
        return await service.listing(
            conn, user, actor, resource, university_id, search, status, page
        )


@router.get("/materials/{document_id}/file")
async def material_file(
    document_id: UUID,
    university_id: UUID | None = None,
    user: UserContext = Depends(get_current_user),
) -> Response:
    from app.routers.library import _download_storage_file

    async with service.database() as conn:
        actor = await service.identity(conn, user)
        service.permit(actor, "materials")
        scope = service.tenant(user, actor, university_id)
        row = await conn.fetchrow(
            """SELECT title,storage_key FROM public.documents WHERE id=$1
        AND ($2::uuid IS NULL OR university_id=$2) AND deleted_at IS NULL
        AND ($3::boolean OR uploaded_by=$4)""",
            document_id,
            scope,
            actor.role != "lecturer",
            user.id,
        )
    if not row:
        raise HTTPException(404, "Material not found.")
    extension = row["storage_key"].rsplit(".", 1)[-1]
    return await _download_storage_file(row["storage_key"], row["title"] + "." + extension)


@router.post("/students/batch", response_model=BatchResult)
async def batch(
    payload: BatchCommand,
    response: Response,
    university_id: UUID | None = None,
    user: UserContext = Depends(get_current_user),
) -> BatchResult:
    response.headers["Cache-Control"] = "private, no-store"
    results: list[BatchItem] = []
    async with service.database() as conn:
        actor = await service.identity(conn, user)
        service.permit(actor, "students")
        service.tenant(user, actor, university_id)
        for command in payload.commands:
            if command.id is None or command.action not in {
                "update",
                "suspend",
                "activate",
                "delete",
                "restore",
            }:
                raise HTTPException(
                    422, "Batch operations require an account ID and a supported student action."
                )
        if len({command.id for command in payload.commands}) != len(payload.commands):
            raise HTTPException(422, "Each student may appear only once in a batch.")
        for command in payload.commands:
            try:
                async with conn.transaction():
                    result = await service.mutate(
                        conn, user, actor, "students", university_id, command
                    )
                results.append(BatchItem(id=result.id, success=True, message=result.message))
            except HTTPException as exc:
                results.append(
                    BatchItem(id=str(command.id), success=False, message=str(exc.detail))
                )
    return BatchResult(items=results)


@router.post("/{resource}", response_model=Mutation)
async def mutate(
    resource: Resource,
    command: Command,
    response: Response,
    university_id: UUID | None = None,
    user: UserContext = Depends(get_current_user),
) -> Mutation:
    response.headers["Cache-Control"] = "private, no-store"
    try:
        async with service.database() as conn, conn.transaction():
            actor = await service.identity(conn, user)
            return await service.mutate(conn, user, actor, resource, university_id, command)
    except asyncpg.UniqueViolationError as exc:
        raise HTTPException(
            409, "This record already exists or a replacement has already been submitted."
        ) from exc
    except (
        asyncpg.CheckViolationError,
        asyncpg.InvalidTextRepresentationError,
        asyncpg.InvalidDatetimeFormatError,
    ) as exc:
        raise HTTPException(422, "Check the form values and try again.") from exc


@router.post("/uploads/{document_id}/confirm", response_model=ConfirmUploadResponse)
async def confirm_material_upload(
    document_id: UUID, user: UserContext = Depends(get_current_user)
) -> ConfirmUploadResponse:
    from app.routers.library import confirm_document_upload

    async with service.database() as conn:
        actor = await service.identity(conn, user)
        service.permit(actor, "materials")
        scope = service.tenant(user, actor, None)
        row = await conn.fetchrow(
            """SELECT d.university_id FROM public.documents d JOIN public.universities n ON n.id=d.university_id
        WHERE d.id=$1 AND d.uploaded_by=$2 AND d.deleted_at IS NULL AND n.status='active'
        AND ($3::uuid IS NULL OR d.university_id=$3)""",
            document_id,
            user.id,
            scope,
        )
    if row is None:
        raise HTTPException(404, "Upload not found in your workspace.")
    scoped = UserContext(**{**dict(user), "university_id": row["university_id"]})
    return await confirm_document_upload(
        str(document_id), auth_user=scoped, _document_scope=str(document_id)
    )
