"""Quiz API: explicit safe projections; all assessment authority stays in FastAPI."""

import asyncio
from collections.abc import AsyncIterator
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.core.dependencies import UserContext, get_current_user, require_api_key
from app.engines import quiz_service as service
from app.engines.quiz_retry import retry_job
from app.models.quiz import (
    Attempt,
    Course,
    CreateQuiz,
    QuizHistory,
    QuizJob,
    QuizResult,
    SaveAnswers,
    ShareRequest,
    ShareSummary,
)
from workers.quiz import wake_quiz_worker


def enabled(response: Response) -> None:
    response.headers["Cache-Control"] = "private, no-store"
    if not settings.ENABLE_QUIZ:
        raise HTTPException(503, "Quiz practice is being prepared. Please check back shortly.")


router = APIRouter(
    prefix="/quiz", tags=["Quiz"], dependencies=[Depends(enabled), Depends(require_api_key)]
)


@router.get("/courses", response_model=list[Course])
async def courses(user: UserContext = Depends(get_current_user)) -> list[Course]:
    return await service.courses(user)


@router.post("/jobs", response_model=QuizJob, status_code=202)
async def create(payload: CreateQuiz, user: UserContext = Depends(get_current_user)) -> QuizJob:
    if not settings.ENABLE_AI:
        raise HTTPException(503, "Question generation is temporarily unavailable.")
    result = await service.create_job(payload, user)
    await wake_quiz_worker()
    return result


@router.get("/jobs/{job_id}", response_model=QuizJob)
async def job(job_id: UUID, user: UserContext = Depends(get_current_user)) -> QuizJob:
    return await service.get_job(job_id, user)


@router.post("/jobs/{job_id}/cancel", response_model=QuizJob)
async def cancel(job_id: UUID, user: UserContext = Depends(get_current_user)) -> QuizJob:
    return await service.cancel_job(job_id, user)


@router.post("/jobs/{job_id}/retry", response_model=QuizJob)
async def retry(job_id: UUID, user: UserContext = Depends(get_current_user)) -> QuizJob:
    result = await retry_job(job_id, user)
    await wake_quiz_worker()
    return result


@router.get("/jobs/{job_id}/events")
async def events(
    job_id: UUID, request: Request, user: UserContext = Depends(get_current_user)
) -> StreamingResponse:
    await service.get_job(job_id, user)

    async def stream() -> AsyncIterator[str]:
        for _ in range(200):
            if await request.is_disconnected():
                return
            state = await service.get_job(job_id, user)
            yield "event: progress\ndata: " + state.model_dump_json() + "\n\n"
            if state.status in ("completed", "failed", "cancelled"):
                return
            await asyncio.sleep(3)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )


@router.get("/history", response_model=QuizHistory)
async def history(
    offset: int = Query(0, ge=0, le=100000),
    course: str | None = Query(None, max_length=30),
    user: UserContext = Depends(get_current_user),
) -> QuizHistory:
    return await service.history(user, offset, course)


@router.post("/quizzes/{quiz_id}/attempts", response_model=Attempt)
async def start(quiz_id: UUID, user: UserContext = Depends(get_current_user)) -> Attempt:
    return await service.start_attempt(quiz_id, user)


@router.get("/attempts/{attempt_id}", response_model=Attempt)
async def attempt(attempt_id: UUID, user: UserContext = Depends(get_current_user)) -> Attempt:
    return await service.get_attempt(attempt_id, user)


@router.put("/attempts/{attempt_id}/answers", response_model=Attempt)
async def save(
    attempt_id: UUID, payload: SaveAnswers, user: UserContext = Depends(get_current_user)
) -> Attempt:
    return await service.save_answers(attempt_id, payload, user)


@router.post("/attempts/{attempt_id}/submit", response_model=QuizResult)
async def submit(attempt_id: UUID, user: UserContext = Depends(get_current_user)) -> QuizResult:
    return await service.submit_attempt(attempt_id, user)


@router.get("/results/{result_id}", response_model=QuizResult)
async def result(result_id: UUID, user: UserContext = Depends(get_current_user)) -> QuizResult:
    return await service.get_result(result_id, user)


@router.post("/results/{result_id}/share")
async def share(result_id: UUID, user: UserContext = Depends(get_current_user)) -> dict[str, str]:
    return {"token": await service.create_share(result_id, user)}


@router.delete("/results/{result_id}/share", status_code=204)
async def revoke(result_id: UUID, user: UserContext = Depends(get_current_user)) -> Response:
    await service.revoke_shares(result_id, user)
    return Response(status_code=204)


@router.post("/shared", response_model=ShareSummary)
async def shared(payload: ShareRequest, response: Response) -> ShareSummary:
    response.headers["Cache-Control"] = "no-store"
    response.headers["Referrer-Policy"] = "no-referrer"
    return await service.public_share(payload.token)
