"""Owner-authorized retry of a stopped generation request without losing its quiz."""

from uuid import UUID

from fastapi import HTTPException

from app.core.dependencies import UserContext
from app.engines.quiz_service import database, job_view, scope
from app.models.quiz import QuizJob


async def retry_job(job_id: UUID, user: UserContext) -> QuizJob:
    async with database() as conn, conn.transaction():
        await conn.execute("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", str(user.id))
        await job_view(conn, job_id, user)
        row = await conn.fetchrow(
            "SELECT status,updated_at FROM public.quiz_generation_jobs WHERE id=$1 FOR UPDATE",
            job_id,
        )
        if row["status"] == "cancelled":
            raise HTTPException(409, "This request was cancelled. Create a new quiz to continue.")
        if row["status"] != "failed":
            return await job_view(conn, job_id, user)
        busy = await conn.fetchval(
            "SELECT count(*) FROM public.quiz_generation_jobs WHERE user_id=$1 AND COALESCE(request_payload->>'bank_refill','false')!='true' AND status IN ('queued','retrieving','generating','saving')",
            user.id,
        )
        if busy >= 2:
            raise HTTPException(429, "Please finish your active quiz requests before retrying.")
        await conn.execute(
            """UPDATE public.quiz_generation_jobs SET status='queued',attempts=0,error_message=NULL,current_step='Waiting to retry your quiz',lease_id=NULL,lease_until=NULL,completed_at=NULL,request_payload=request_payload - 'capacity_waits'
        WHERE id=$1 AND user_id=$2 AND university_id=$3""",
            job_id,
            user.id,
            scope(user),
        )
        return await job_view(conn, job_id, user)
