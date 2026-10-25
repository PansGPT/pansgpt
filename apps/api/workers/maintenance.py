"""Retry external object deletion after the database's daily retention transaction."""

from typing import Any

import structlog

from app.core.config import settings
from app.core.database import close_db_pool, get_db_connection, init_db_pool
from app.engines.job_outbox import reconcile_jobs
from app.engines.storage import storage_engine

logger = structlog.get_logger(__name__)


async def startup(ctx: dict[str, Any]) -> None:
    await init_db_pool(min_size=1, max_size=3)
    await reconcile_jobs(ctx)


async def shutdown(ctx: dict[str, Any]) -> None:
    await close_db_pool()


async def cleanup_storage(ctx: dict[str, Any]) -> None:
    async with get_db_connection() as conn:
        if conn is None:
            return
        rows = await conn.fetch(
            "SELECT * FROM public.storage_cleanup_jobs ORDER BY created_at LIMIT 20;"
        )
    for row in rows:
        try:
            if row["is_prefix"]:
                async with storage_engine.get_client() as s3:
                    paginator = s3.get_paginator("list_objects_v2")
                    async for page in paginator.paginate(
                        Bucket=settings.r2_bucket_name, Prefix=row["object_key"]
                    ):
                        keys = [{"Key": obj["Key"]} for obj in page.get("Contents", [])]
                        if keys:
                            result = await s3.delete_objects(
                                Bucket=settings.r2_bucket_name, Delete={"Objects": keys}
                            )
                            if result.get("Errors"):
                                raise RuntimeError("Storage rejected object deletion")
            elif not await storage_engine.delete_object(row["object_key"]):
                raise RuntimeError("Storage object deletion failed")
            async with get_db_connection() as conn:
                if conn is not None:
                    await conn.execute(
                        "DELETE FROM public.storage_cleanup_jobs WHERE id=$1;", row["id"]
                    )
        except Exception as exc:
            logger.warning(
                "storage_cleanup_retry", job_id=str(row["id"]), error_type=type(exc).__name__
            )
            async with get_db_connection() as conn:
                if conn is not None:
                    await conn.execute(
                        "UPDATE public.storage_cleanup_jobs SET attempts=attempts+1 WHERE id=$1;",
                        row["id"],
                    )
