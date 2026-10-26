import asyncio
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.core.config import Settings
from workers import verify_batch


def staging_settings(**overrides: object) -> Settings:
    values: dict[str, object] = {
        "ENVIRONMENT": "staging",
        "ENABLE_AI": False,
        "ENABLE_INGESTION": False,
        "LOCAL_DEV_MODE": False,
        "EMBEDDER_FAKE_MODE": False,
        "VISION_FAKE_MODE": False,
        "DATABASE_URL": (
            "postgresql://postgres.nrzbjhqtcxlfiyvoeanb:offline@"
            "aws-1-eu-west-1.pooler.supabase.com:5432/postgres"
        ),
        "SUPABASE_URL": "https://nrzbjhqtcxlfiyvoeanb.supabase.co",
        "SUPABASE_ANON_KEY": "offline-key",
        "SUPABASE_SERVICE_ROLE_KEY": "offline-key",
        "UPSTASH_REDIS_URL": "rediss://offline@redis.invalid:6379",
        "CLOUDFLARE_R2_BUCKET_STAGING": "pansgpt-library-staging",
        **{f"{provider}_ZDR_CONFIRMED": False for provider in verify_batch.PROVIDERS},
        **{
            name: None
            for name in (
                "GEMINI_API_KEY",
                "GROQ_API_KEY",
                "OPENROUTER_API_KEY",
                "OPENAI_API_KEY",
                "TAVILY_API_KEY",
                "COHERE_API_KEY",
            )
        },
    }
    # No settings validation or dotenv load: each invalid case must reach the
    # verification guard itself, even if normal hosted startup would also reject it.
    return Settings.model_construct(**(values | overrides))


@pytest.mark.parametrize(
    "overrides",
    [
        {"ENVIRONMENT": "production"},
        {"SUPABASE_URL": "https://other-project.supabase.co"},
        {"DATABASE_URL": "postgresql://postgres.other@aws-1-eu-west-1.pooler.supabase.com/db"},
        {"DATABASE_URL": "postgresql://postgres.nrzbjhqtcxlfiyvoeanb@pooler.supabase.com.evil/db"},
        {"CLOUDFLARE_R2_BUCKET_STAGING": "pansgpt-library-production"},
        {"UPSTASH_REDIS_URL": "redis://redis.invalid"},
        {"ENABLE_AI": True},
        {"ENABLE_INGESTION": True},
        {"LOCAL_DEV_MODE": True},
        {"EMBEDDER_FAKE_MODE": True},
        {"VISION_FAKE_MODE": True},
        *[{f"{provider}_ZDR_CONFIRMED": True} for provider in verify_batch.PROVIDERS],
        {"GEMINI_API_KEY": "private-provider-credential"},
    ],
)
def test_verification_rejects_unsafe_targets(overrides: dict[str, object]) -> None:
    with pytest.raises(RuntimeError, match="verification policy"):
        verify_batch.validate_target(staging_settings(**overrides))


def test_verification_accepts_only_blocked_staging() -> None:
    verify_batch.validate_target(staging_settings())


async def test_worker_cancellation_closes_connections() -> None:
    started = asyncio.Event()

    async def wait_forever() -> None:
        started.set()
        await asyncio.Event().wait()

    worker = SimpleNamespace(async_run=wait_forever, close=AsyncMock())
    task = asyncio.create_task(verify_batch.run_worker(worker))
    await started.wait()
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    worker.close.assert_awaited_once()


async def test_failed_enqueue_cleans_only_own_keys() -> None:
    redis = SimpleNamespace(enqueue_job=AsyncMock(return_value=None), delete=AsyncMock())
    with pytest.raises(RuntimeError, match="enqueue failed"):
        await verify_batch.verify_queue(redis, object, "main")
    keys = redis.delete.await_args.args
    assert len(keys) == 6
    assert all("pansgpt-verification" in key for key in keys)
    assert not any("*" in key or key in ("arq:queue", "arq:picture_queue") for key in keys)


def test_public_result_never_contains_raw_failure_or_import_output(monkeypatch, capsys) -> None:
    sensitive = "private-document-title password=private-config"

    async def fail() -> dict[str, object]:
        print(sensitive)
        raise ValueError(sensitive)

    monkeypatch.setattr(verify_batch, "bounded_checks", fail)
    assert verify_batch.main() == 1
    captured = capsys.readouterr()
    assert sensitive not in captured.out + captured.err
    assert json.loads(captured.out) == {"status": "failed", "error_type": "ValueError"}
