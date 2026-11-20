"""Bounded API-worker runs. Browser transports subscribe; only Stop cancels work.

Final answers remain in PostgreSQL. Snapshots are short-lived and owner scoped.
This intentionally does not claim durability across API process termination.
"""

import asyncio
import json
import time
from collections.abc import AsyncIterator, Awaitable, Callable
from dataclasses import dataclass, field
from typing import Any

import structlog
from fastapi import HTTPException

from app.core.diagnostics import error_fields
from app.engines.chat_progress import PROGRESS_LABELS
from app.engines.tool_policy import retry_safe_tool
from app.models.chat import ArtifactReadyPayload, CitationItem
from app.models.chat_runs import ChatRunSnapshot, RunToolSnapshot
from app.models.progress import PublicProgressUpdate

logger = structlog.get_logger(__name__)


@dataclass
class ManagedRun:
    session_id: str
    owner_id: str
    university_id: str
    snapshot: ChatRunSnapshot
    started: float = field(default_factory=time.monotonic)
    touched: float = field(default_factory=time.monotonic)
    queue: asyncio.Queue[str | None] = field(default_factory=lambda: asyncio.Queue(maxsize=64))
    task: asyncio.Task[None] | None = None
    attached: bool = True
    outcome: str | None = None
    first_output_ms: int | None = None
    ready: asyncio.Event = field(default_factory=asyncio.Event)

    def publish(self, frame: str | None) -> None:
        if not self.attached:
            return
        if self.queue.full():
            # Coalesce adjacent text, preserving init, artifacts and control
            # frames. Dropping the oldest frame can lose canonical message IDs.
            compact: list[str | None] = []
            text: list[str] = []

            def flush() -> None:
                if text:
                    compact.append(
                        "event: text_chunk\ndata: " + json.dumps({"token": "".join(text)}) + "\n\n"
                    )
                    text.clear()

            while not self.queue.empty():
                queued = self.queue.get_nowait()
                if queued and queued.startswith("event: text_chunk\ndata: "):
                    value = json.loads(queued.split("data: ", 1)[1])
                    text.append(str(value.get("token") or value.get("delta") or ""))
                else:
                    flush()
                    compact.append(queued)
            flush()
            if len(compact) >= self.queue.maxsize:
                # A saturated control-only subscriber must reconnect through
                # the snapshot endpoint; inference and side effects continue.
                self.attached = False
                self.queue.put_nowait(None)
                logger.warning("chat_subscriber_backlog_overflow", run_id=self.snapshot.run_id)
                return
            for queued in compact:
                self.queue.put_nowait(queued)
        self.queue.put_nowait(frame)

    def emit(self, frame: str) -> None:
        self.touched = time.monotonic()
        name = ""
        data: Any = None
        for line in frame.splitlines():
            if line.startswith("event: "):
                name = line[7:]
            elif line.startswith("data: "):
                data = json.loads(line[6:])
        if name == "text_chunk" and isinstance(data, dict):
            self.snapshot.content += str(data.get("token") or data.get("delta") or "")
            if self.first_output_ms is None and self.snapshot.content:
                self.first_output_ms = round((time.monotonic() - self.started) * 1000)
                logger.info("chat_first_output", elapsed_ms=self.first_output_ms)
        elif name == "citations" and isinstance(data, list):
            self.snapshot.citations = [CitationItem.model_validate(item) for item in data]
        elif name == "artifact_ready":
            self.snapshot.artifacts.append(
                ArtifactReadyPayload.model_validate(
                    {
                        "title": "Study material",
                        "mime_type": "application/octet-stream",
                        "file_extension": "file",
                        **data,
                    }
                )
            )
            self.snapshot.tool_started = True
            self.snapshot.retry_blocked = True
            if self.first_output_ms is None:
                self.first_output_ms = round((time.monotonic() - self.started) * 1000)
                logger.info(
                    "chat_first_output", elapsed_ms=self.first_output_ms, output_kind="artifact"
                )
            artifact = self.snapshot.artifacts[-1]
            cards = artifact.content.get("cards") if isinstance(artifact.content, dict) else None
            logger.info(
                "chat_artifact_ready",
                skill=artifact.skill_name,
                item_count=len(cards) if isinstance(cards, list) else None,
            )
        elif name in {"tool_start", "tool_end"} and isinstance(data, dict):
            self.snapshot.tool_started = True
            if not retry_safe_tool(str(data.get("tool_name", ""))):
                self.snapshot.retry_blocked = True
            if not isinstance(data.get("call_id"), str):
                # Legacy malformed tool frames must not destroy a valid answer.
                self.publish(frame)
                return
            previous = next(
                (item for item in self.snapshot.tools if item.call_id == data.get("call_id")), None
            )
            self.snapshot.tools = [
                item for item in self.snapshot.tools if item.call_id != data.get("call_id")
            ]
            # Run snapshots never expose internal arguments/results; artifacts
            # and authorized citations carry the public output separately.
            self.snapshot.tools.append(
                RunToolSnapshot(
                    call_id=data["call_id"],
                    tool_name=data.get("tool_name", previous.tool_name if previous else "tool"),
                    status="running"
                    if name == "tool_start"
                    else "error"
                    if data.get("status") == "error"
                    else "success",
                )
            )
        elif name == "public_progress":
            update = PublicProgressUpdate.model_validate(data)
            self.snapshot.activity = update.code
            self.snapshot.public_progress.append(update)
            self.snapshot.public_progress = self.snapshot.public_progress[-12:]
            logger.info(
                "chat_public_stage",
                stage=update.code,
                elapsed_ms=round((time.monotonic() - self.started) * 1000),
            )
        elif name == "thinking_chunk" and isinstance(data, dict):
            if isinstance(data.get("code"), str) and data["code"] in PROGRESS_LABELS:
                self.snapshot.activity = data["code"]
        elif name == "error" and isinstance(data, dict):
            self.outcome = "error"
            self.snapshot.error_code = str(data.get("code") or "GENERATION_FAILED")
            self.snapshot.retryable = data.get("retryable", True) is not False
            # The reference links plain student copy to detailed content-free logs.
            data["request_id"] = self.snapshot.request_id
            frame = f"event: error\ndata: {json.dumps(data)}\n\n"
            logger.warning(
                "chat_run_error",
                error_code=self.snapshot.error_code,
                retryable=self.snapshot.retryable,
                elapsed_ms=round((time.monotonic() - self.started) * 1000),
            )
        elif name == "done":
            if self.outcome != "error":
                self.outcome = "complete"
            if isinstance(data, dict) and self.outcome == "complete":
                self.snapshot.content = str(data.get("full_text", self.snapshot.content))
                self.snapshot.completion_warning = (
                    "additional_work_incomplete"
                    if data.get("completion_warning") == "additional_work_incomplete"
                    else None
                )
        self.publish(frame)

    async def events(self) -> AsyncIterator[str]:
        try:
            while True:
                try:
                    frame = await asyncio.wait_for(self.queue.get(), 15)
                except TimeoutError:
                    yield ": keep-alive\n\n"
                    continue
                if frame is None:
                    return
                yield frame
        finally:
            self.attached = False
            while not self.queue.empty():
                self.queue.get_nowait()
            logger.info(
                "chat_subscriber_detached",
                run_id=self.snapshot.run_id,
                generation_continues=bool(
                    self.outcome is None and self.task and not self.task.done()
                ),
            )


class ChatRuns:
    def __init__(self) -> None:
        self.runs: dict[str, ManagedRun] = {}
        self.post_tasks: set[asyncio.Task[None]] = set()

    def defer(self, operation: Awaitable[None]) -> None:
        async def execute() -> None:
            try:
                async with asyncio.timeout(15):
                    await operation
            except Exception as exc:
                logger.warning("chat_postrun_work_deferred", **error_fields(exc))

        task = asyncio.create_task(execute(), name="chat-postrun")
        self.post_tasks.add(task)
        task.add_done_callback(self.post_tasks.discard)

    def prune(self) -> None:
        now = time.monotonic()
        for key, run in list(self.runs.items()):
            if run.task and run.task.done() and now - run.touched > 300:
                self.runs.pop(key, None)
        if len(self.runs) >= 128:
            for run in sorted(self.runs.values(), key=lambda item: item.touched):
                if run.task and run.task.done():
                    self.runs.pop(run.session_id, None)
                if len(self.runs) < 128:
                    break

    def require_room(self, owner: str) -> None:
        self.prune()
        active = [run for run in self.runs.values() if run.task and not run.task.done()]
        if len(active) >= 64 or sum(run.owner_id == owner for run in active) >= 4:
            raise HTTPException(429, "Please wait for an answer to finish before starting another.")

    def get(self, session: str, owner: str, university: str) -> ManagedRun | None:
        self.prune()
        run = self.runs.get(session)
        return run if run and run.owner_id == owner and run.university_id == university else None

    def start(
        self,
        run: ManagedRun,
        produce: Callable[[ManagedRun], Awaitable[None]],
        finalize: Callable[[ManagedRun], Awaitable[None]],
    ) -> None:
        # Recheck synchronously after async lease/auth preparation. Otherwise
        # simultaneous requests can all pass the earlier admission check.
        self.require_room(run.owner_id)
        self.runs[run.session_id] = run

        async def work() -> None:
            run.ready.set()
            with structlog.contextvars.bound_contextvars(
                request_id=run.snapshot.request_id,
                run_id=run.snapshot.run_id,
                session_id=run.session_id,
            ):
                logger.info("chat_run_started")
                try:
                    await produce(run)
                except asyncio.CancelledError:
                    run.outcome = "cancelled"
                except Exception as exc:
                    logger.error("chat_run_failed", **error_fields(exc))
                    run.emit('event: error\ndata: {"code":"RUN_FAILED","retryable":true}\n\n')
                finally:
                    run.snapshot.status = run.outcome or "error"
                    if run.snapshot.status == "error" and not run.snapshot.error_code:
                        run.snapshot.error_code = "CONNECTION_ENDED"
                    try:
                        await finalize(run)
                    except Exception as exc:
                        logger.error("chat_run_summary_failed", **error_fields(exc))
                    run.touched = time.monotonic()
                    run.publish(None)
                    logger.info(
                        "chat_run_finished",
                        outcome=run.snapshot.status,
                        error_code=run.snapshot.error_code,
                        first_output_ms=run.first_output_ms,
                        total_ms=round((time.monotonic() - run.started) * 1000),
                        tool_started=run.snapshot.tool_started,
                        completion_warning=run.snapshot.completion_warning,
                    )

        run.task = asyncio.create_task(work(), name=f"chat-run:{run.snapshot.run_id}")

    async def shutdown(self) -> None:
        await asyncio.sleep(0)
        tasks = [run.task for run in self.runs.values() if run.task and not run.task.done()]
        for task in tasks:
            task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        post = list(self.post_tasks)
        for task in post:
            task.cancel()
        if post:
            await asyncio.gather(*post, return_exceptions=True)
        self.post_tasks.clear()
        self.runs.clear()


chat_runs = ChatRuns()
