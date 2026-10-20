"""Compare committed table/column and RPC argument names with a migrated database.

Run only against a disposable local database. Values and credentials are never printed.
"""

import asyncio
import os
import re
from pathlib import Path

import asyncpg


async def main() -> None:
    source = (Path(__file__).resolve().parents[1] / "packages/types/src/supabase.ts").read_text()
    tables = {}
    for match in re.finditer(
        r"^      (\w+): \{\n        Row: \{(.*?)^        \};", source, re.M | re.S
    ):
        tables[match[1]] = set(re.findall(r"^          (\w+):", match[2], re.M))
    connection = await asyncpg.connect(os.environ["RLS_TEST_DATABASE_URL"])
    try:
        rows = await connection.fetch(
            "SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN (SELECT tablename FROM pg_tables WHERE schemaname='public')"
        )
        actual: dict[str, set[str]] = {}
        for row in rows:
            actual.setdefault(row["table_name"], set()).add(row["column_name"])
        errors = []
        for table in sorted(tables.keys() | actual.keys()):
            if tables.get(table) != actual.get(table):
                errors.append(
                    f"{table}: missing={sorted(actual.get(table, set()) - tables.get(table, set()))}, extra={sorted(tables.get(table, set()) - actual.get(table, set()))}"
                )
        functions = source.split("    Functions: {", 1)[1]
        for match in re.finditer(
            r"^      (\w+): \{\s*Args: (?:\{(.*?)\}|Record<PropertyKey, never>);",
            functions,
            re.M | re.S,
        ):
            expected = set(re.findall(r"(\w+)\??:", match[2] or ""))
            signatures = await connection.fetch(
                "SELECT proargnames[1:pronargs] AS names FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND proname=$1",
                match[1],
            )
            if not any(set(row["names"] or []) == expected for row in signatures):
                errors.append(f"RPC {match[1]}: argument names differ from catalog")
        if errors:
            raise SystemExit("Schema contract drift:\n" + "\n".join(errors))
        print(f"Verified {len(tables)} table contracts and declared RPC argument contracts.")
    finally:
        await connection.close()


asyncio.run(main())
