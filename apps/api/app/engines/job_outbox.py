"""Durable document jobs. Redis delivery can be retried without losing a request."""

import uuid
from typing import Any

import structlog

from app.core.config import settings
from app.core.database import get_db_connection

logger = structlog.get_logger(__name__)
PICTURE_QUEUE_NAME = "arq:picture_queue"


async def record_job(document_id: str, storage_key: str, job_name: str) -> str:
    async with get_db_connection() as conn:
        if conn is None:
            raise RuntimeError("Job storage is unavailable")
        job_id = await conn.fetchval(
            "INSERT INTO public.background_jobs(document_id, storage_key, job_name) VALUES($1,$2,$3) "
            "ON CONFLICT(document_id, job_name) DO UPDATE SET "
            "id = CASE WHEN background_jobs.status IN ('completed','failed') THEN public.uuid_generate_v7() ELSE background_jobs.id END, "
            "storage_key=EXCLUDED.storage_key, status='pending', updated_at=now() RETURNING id;",
            uuid.UUID(document_id),
            storage_key,
            job_name,
        )
    return str(job_id)


async def deliver_job(redis: Any, job_id: str, name: str, document_id: str, key: str) -> str:
    queue = PICTURE_QUEUE_NAME if name == "describe_document_images_job" else "arq:queue"
    # A None result means this same id already exists in ARQ; it is not a new job.
    await redis.enqueue_job(name, document_id, key, _job_id=job_id, _queue_name=queue)
    async with get_db_connection() as conn:
        if conn is None:
            raise RuntimeError("Job storage is unavailable")
        await conn.execute(
            "UPDATE public.background_jobs SET status='delivered', dispatched_at=now(), updated_at=now() WHERE id=$1 AND status='pending';",
            uuid.UUID(job_id),
        )
    return job_id


async def reconcile_jobs(ctx: dict[str, Any]) -> None:
    if not settings.ENABLE_INGESTION or not settings.provider_privacy_allowed("google"):
        return  # Keep durable work pending while ingestion is disabled or disallowed.
    async with get_db_connection() as conn:
        if conn is None:
            return
        await conn.execute(
            "UPDATE public.background_jobs j SET status='completed', updated_at=now() FROM public.documents d WHERE d.id=j.document_id AND j.job_name='ingest_document_job' AND j.status='delivered' AND d.embedding_status='completed';"
        )
        rows = await conn.fetch(
            "SELECT j.* FROM public.background_jobs j JOIN public.documents d ON d.id=j.document_id "
            "WHERE d.deleted_at IS NULL AND d.status='active' AND (j.status='pending' OR "
            "(j.status='delivered' AND j.updated_at < now()-interval '40 minutes' AND "
            "(d.ingestion_heartbeat IS NULL OR d.ingestion_heartbeat < now()-interval '10 minutes'))) "
            "ORDER BY j.updated_at LIMIT 20;"
        )
    for row in rows:
        try:
            await deliver_job(
                ctx["redis"],
                str(row["id"]),
                row["job_name"],
                str(row["document_id"]),
                row["storage_key"],
            )
        except Exception as exc:
            logger.warning(
                "outbox_delivery_failed", job_id=str(row["id"]), error_type=type(exc).__name__
            )


async def finish_job(
    document_id: str, name: str, failed: bool = False, job_id: str | None = None
) -> None:
    async with get_db_connection() as conn:
        if conn is not None:
            await conn.execute(
                "UPDATE public.background_jobs SET status=$3, updated_at=now() WHERE document_id=$1 AND job_name=$2 AND ($4::uuid IS NULL OR id=$4);",
                uuid.UUID(document_id),
                name,
                "failed" if failed else "completed",
                uuid.UUID(job_id) if job_id else None,
            )
