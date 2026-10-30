"""Create an EMPTY isolated loopback PostgreSQL 18 database for quiz tests.

Run with the API Python interpreter. This never reads application credentials and
refuses to change a populated database. Full Supabase replay is a separate CI gate.
"""

import asyncio
import argparse
from pathlib import Path

import asyncpg

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument(
    "--database",
    choices=["pansgpt_quiz_speed_test", "pansgpt_quiz_capacity_test"],
    default="pansgpt_quiz_speed_test",
)
NAME = parser.parse_args().database
URL = f"postgresql://postgres@127.0.0.1:55432/{NAME}"


async def main() -> None:
    admin = await asyncpg.connect("postgresql://postgres@127.0.0.1:55432/postgres")
    try:
        exists = await admin.fetchval(
            "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname=$1)", NAME
        )
        if not exists:
            await admin.execute(f'CREATE DATABASE "{NAME}"')
    finally:
        await admin.close()
    conn = await asyncpg.connect(URL)
    try:
        if await conn.fetchval(
            "SELECT count(*) FROM pg_tables WHERE schemaname='public'"
        ):
            raise SystemExit("Test database is populated; refusing to change it.")
        async with conn.transaction():
            await conn.execute(
                (ROOT / "apps/api/tests/fixtures/quiz-baseline.sql").read_text()
            )
            await conn.execute(
                (
                    ROOT / "supabase/migrations/20260906090004_learning_and_quizzes.sql"
                ).read_text()
            )
            await conn.execute(
                (
                    ROOT / "supabase/migrations/20261026100000_quiz_lifecycle.sql"
                ).read_text()
            )
        print(
            "Applied the existing quiz schema and new lifecycle migration to isolated loopback PostgreSQL."
        )
    finally:
        await conn.close()


asyncio.run(main())
