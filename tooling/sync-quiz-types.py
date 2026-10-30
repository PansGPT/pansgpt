"""Refresh ONLY quiz table contracts from a designated disposable PostgreSQL catalog.

Useful when Supabase's Docker-backed pg-meta generator is unavailable locally.
The regular full-schema CI comparison remains authoritative for every table/RPC.
"""

import asyncio
import os
import re
from pathlib import Path
from urllib.parse import urlparse

import asyncpg

TABLES = (
    "quizzes",
    "quiz_questions",
    "quiz_attempts",
    "quiz_generation_jobs",
    "quiz_sessions",
    "quiz_result_shares",
)


async def main() -> None:
    url = os.environ["QUIZ_TEST_DATABASE_URL"]
    if urlparse(url).hostname not in ("127.0.0.1", "localhost"):
        raise SystemExit("Only a disposable loopback database is accepted.")
    path = Path(__file__).resolve().parents[1] / "packages/types/src/supabase.ts"
    prefix, source = path.read_text(encoding="utf-8").split("  public: {", 1)
    conn = await asyncpg.connect(url)
    try:
        for table in TABLES:
            columns = await conn.fetch(
                """SELECT column_name,udt_name,is_nullable,column_default FROM information_schema.columns
            WHERE table_schema='public' AND table_name=$1 ORDER BY column_name""",
                table,
            )
            if not columns:
                raise SystemExit("Quiz migration has not been applied.")

            def ts_type(row: asyncpg.Record) -> str:
                pg = row["udt_name"]
                value = (
                    "Json"
                    if pg == "jsonb"
                    else "number"
                    if pg in ("int2", "int4", "int8", "numeric", "float4", "float8")
                    else "string[]"
                    if pg == "_uuid"
                    else 'Database["public"]["Enums"]["quiz_job_status"]'
                    if pg == "quiz_job_status"
                    else 'Database["public"]["Enums"]["university_level"]'
                    if pg == "university_level"
                    else "string"
                )
                return value + (" | null" if row["is_nullable"] == "YES" else "")

            block = f"      {table}: {{\n"
            for operation in ("Row", "Insert", "Update"):
                block += f"        {operation}: {{\n"
                for row in columns:
                    optional = (
                        operation == "Update"
                        or operation == "Insert"
                        and (
                            row["column_default"] is not None
                            or row["is_nullable"] == "YES"
                        )
                    )
                    block += f"          {row['column_name']}{'?' if optional else ''}: {ts_type(row)};\n"
                block += "        };\n"
            block += "        Relationships: [\n"
            relations = await conn.fetch(
                """SELECT con.conname,child.attname AS column_name,parent.relname AS foreign_table,ref.attname AS foreign_column
            FROM pg_constraint con JOIN pg_class own ON own.oid=con.conrelid
            JOIN pg_class parent ON parent.oid=con.confrelid JOIN pg_attribute child ON child.attrelid=own.oid AND child.attnum=con.conkey[1]
            JOIN pg_attribute ref ON ref.attrelid=parent.oid AND ref.attnum=con.confkey[1]
            JOIN pg_namespace n ON n.oid=own.relnamespace
            WHERE n.nspname='public' AND own.relname=$1 AND con.contype='f' ORDER BY con.conname""",
                table,
            )
            for relation in relations:
                column = relation["column_name"]
                one = await conn.fetchval(
                    """SELECT EXISTS(SELECT 1 FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid JOIN pg_namespace n ON n.oid=t.relnamespace
                JOIN pg_attribute a ON a.attrelid=t.oid AND a.attname=$2
                WHERE n.nspname='public' AND t.relname=$1 AND i.indisunique AND i.indnkeyatts=1 AND i.indkey[0]=a.attnum AND i.indpred IS NULL)""",
                    table,
                    column,
                )
                block += (
                    "          {\n"
                    + f'            foreignKeyName: "{relation["conname"]}";\n            columns: ["{column}"];\n            isOneToOne: {str(one).lower()};\n            referencedRelation: "{relation["foreign_table"]}";\n            referencedColumns: ["{relation["foreign_column"]}"];\n'
                    + "          },\n"
                )
            block += "        ];\n      };"
            pattern = rf"^      {table}: \{{\n.*?^      \}};"
            if re.search(pattern, source, re.MULTILINE | re.DOTALL):
                source = re.sub(
                    pattern,
                    lambda _, replacement=block: replacement,
                    source,
                    count=1,
                    flags=re.MULTILINE | re.DOTALL,
                )
            else:
                source = source.replace("    Tables: {", "    Tables: {\n" + block, 1)
        path.write_text(prefix + "  public: {" + source, encoding="utf-8")
        print(
            "Updated six quiz table contracts from the migrated disposable database catalog."
        )
    finally:
        await conn.close()


asyncio.run(main())
