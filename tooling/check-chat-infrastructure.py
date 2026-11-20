"""Opt-in, read-only startup diagnostics. Never prints a DSN, key or query data."""

import argparse
import asyncio
import json
import socket
import sys
import time
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps/api"))

import asyncpg  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.diagnostics import error_fields  # noqa: E402


async def evaluate(output: Path, alternate_pooler: bool, warm_model: bool) -> None:
    results: list[dict[str, object]] = []
    dsn = settings.DATABASE_URL
    if not dsn:
        raise RuntimeError("DATABASE_URL is not configured")
    address = urlsplit(dsn)
    host, port = address.hostname, address.port or 5432
    if not host:
        raise RuntimeError("Database host is not configured")
    results.append(
        {
            "endpoint": "shared_pooler" if host.endswith("pooler.supabase.com") else "database",
            "port": port,
        }
    )
    for phase in ("dns", "tcp", "postgres_connect", "select_one"):
        started = time.monotonic()
        connection = None
        try:
            if phase == "dns":
                async with asyncio.timeout(5):
                    records = await asyncio.get_running_loop().getaddrinfo(
                        host, port, type=socket.SOCK_STREAM
                    )
                detail = {
                    "ipv4": any(item[0] == socket.AF_INET for item in records),
                    "ipv6": any(item[0] == socket.AF_INET6 for item in records),
                }
            elif phase == "tcp":
                async with asyncio.timeout(5):
                    _, writer = await asyncio.open_connection(host, port)
                    writer.close()
                    await writer.wait_closed()
                detail = {}
            else:
                connection = await asyncpg.connect(
                    dsn, statement_cache_size=0, timeout=10, command_timeout=5
                )
                if phase == "select_one":
                    assert await connection.fetchval("SELECT 1") == 1
                detail = {}
            results.append(
                {
                    "phase": phase,
                    "ok": True,
                    "elapsed_ms": round((time.monotonic() - started) * 1000),
                    **detail,
                }
            )
        except Exception as exc:
            results.append(
                {
                    "phase": phase,
                    "ok": False,
                    "elapsed_ms": round((time.monotonic() - started) * 1000),
                    **error_fields(exc),
                }
            )
        finally:
            if connection is not None:
                await connection.close(timeout=2)
    if alternate_pooler and host.endswith("pooler.supabase.com") and port != 6543:
        started = time.monotonic()
        try:
            async with asyncio.timeout(5):
                _, writer = await asyncio.open_connection(host, 6543)
                writer.close()
                await writer.wait_closed()
            results.append(
                {
                    "phase": "alternate_pooler_tcp",
                    "port": 6543,
                    "ok": True,
                    "elapsed_ms": round((time.monotonic() - started) * 1000),
                }
            )
            connection = await asyncpg.connect(
                dsn, port=6543, statement_cache_size=0, timeout=10, command_timeout=5
            )
            try:
                assert await connection.fetchval("SELECT 1") == 1
            finally:
                await connection.close(timeout=2)
            results.append(
                {
                    "phase": "alternate_pooler_query",
                    "port": 6543,
                    "ok": True,
                    "elapsed_ms": round((time.monotonic() - started) * 1000),
                }
            )
        except Exception as exc:
            results.append(
                {
                    "phase": "alternate_pooler",
                    "port": 6543,
                    "ok": False,
                    "elapsed_ms": round((time.monotonic() - started) * 1000),
                    **error_fields(exc),
                }
            )
    if warm_model:
        from app.engines.reranker import CandidateReranker

        engine = CandidateReranker()
        started = time.monotonic()
        try:
            model = await asyncio.wait_for(
                asyncio.shield(asyncio.wrap_future(engine.start_warmup())), 110
            )
            results.append(
                {
                    "phase": "local_model_warmup",
                    "ok": model is not None,
                    "elapsed_ms": round((time.monotonic() - started) * 1000),
                }
            )
        except Exception as exc:
            results.append({"phase": "local_model_warmup", "ok": False, **error_fields(exc)})
        finally:
            engine.close()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(
            {
                "database_read_only": True,
                "model_cache_write_requested": warm_model,
                "results": results,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "database_read_only": True,
                "model_cache_write_requested": warm_model,
                "results": results,
            }
        ),
        flush=True,
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--live", action="store_true")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument(
        "--alternate-pooler",
        action="store_true",
        help="Read-only port 6543 comparison; never modifies configured DSN",
    )
    parser.add_argument(
        "--warm-model",
        action="store_true",
        help="Provision the bounded public reranker cache in the workspace",
    )
    args = parser.parse_args()
    if not args.live:
        parser.error("--live is required to contact the configured database")
    asyncio.run(evaluate(args.output, args.alternate_pooler, args.warm_model))
