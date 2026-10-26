"""Refresh only Phase 11 table contracts from the live catalog when CLI codegen needs Docker.

Preferred full codegen remains tooling/gen-types.sh. This bounded fallback reads
CHAT_SCHEMA_DATABASE_URL, changes no database data, and validates all public
table/column names against the resulting contract before writing it.
"""

import asyncio
import json
import os
import re
from pathlib import Path

import asyncpg

TABLES = ("chat_sessions", "chat_messages", "chat_attachments", "chat_message_feedback")
OUTPUT = Path(__file__).resolve().parents[1] / "packages/types/src/supabase.ts"
TYPES = {"uuid": "string", "text": "string", "timestamptz": "string", "int4": "number", "int2": "number", "bool": "boolean", "jsonb":"Json", "_text":"string[]", "tsvector":"unknown", "interaction_role":'Database["public"]["Enums"]["interaction_role"]'}


def table_block(
    name: str, columns: list[asyncpg.Record], relationships: list[asyncpg.Record]
) -> str:
    lines = [f"      {name}: {{"]
    for kind in ("Row", "Insert", "Update"):
        lines.append(f"        {kind}: {{")
        for column in sorted(columns, key=lambda row: row["column_name"]):
            nullable = column["is_nullable"] == "YES"
            optional = kind == "Update" or (
                kind == "Insert" and (nullable or column["column_default"] is not None)
            )
            value = TYPES[column["udt_name"]] + (" | null" if nullable else "")
            if kind != "Row" and column["is_generated"] == "ALWAYS":
                value, optional = "never", True
            lines.append(f"          {column['column_name']}{'?' if optional else ''}: {value}")
        lines.append("        }")
    lines.append("        Relationships: [")
    for relation in relationships:
        lines.extend(
            [
                "          {",
                f"            foreignKeyName: {json.dumps(relation['name'])}",
                f"            columns: {json.dumps(relation['columns'])}",
                "            isOneToOne: false",
                f"            referencedRelation: {json.dumps(relation['target'])}",
                f"            referencedColumns: {json.dumps(relation['target_columns'])}",
                "          },",
            ]
        )
    lines.extend(["        ]", "      }"])
    return "\n".join(lines)


async def main() -> None:
    connection = await asyncpg.connect(
        os.environ["CHAT_SCHEMA_DATABASE_URL"], statement_cache_size=0, timeout=15
    )
    try:
        source = OUTPUT.read_text(encoding="utf-8")
        prefix, source = source.split("  public: {", 1)
        for table in TABLES:
            columns = await connection.fetch(
                """SELECT column_name,udt_name,is_nullable,column_default,is_generated FROM information_schema.columns
                WHERE table_schema='public' AND table_name=$1""",
                table,
            )
            if not columns:
                raise RuntimeError(f"Expected migrated table missing: {table}")
            relationships = await connection.fetch(
                """SELECT c.conname AS name, target.relname AS target,
                ARRAY(SELECT a.attname FROM unnest(c.conkey) WITH ORDINALITY k(attnum,ord)
                      JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum ORDER BY k.ord) AS columns,
                ARRAY(SELECT a.attname FROM unnest(c.confkey) WITH ORDINALITY k(attnum,ord)
                      JOIN pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=k.attnum ORDER BY k.ord) AS target_columns
                FROM pg_constraint c JOIN pg_class target ON target.oid=c.confrelid
                WHERE c.contype='f' AND c.conrelid=('public.'||$1)::regclass ORDER BY c.conname""",
                table,
            )
            replacement = table_block(table, columns, relationships)
            match = re.search(r"^      " + table + r": \{", source, re.MULTILINE)
            if match:
                begin = source.index("{", match.start())
                depth, end = 1, begin + 1
                while depth:
                    depth += (source[end] == "{") - (source[end] == "}")
                    end += 1
                source = source[: match.start()] + replacement + source[end:]
            else:
                insertion = source.index("    Tables: {\n") + len("    Tables: {\n")
                source = source[:insertion] + replacement + "\n" + source[insertion:]
        # Do not overwrite a newer schema or silently accept incomplete contracts.
        expected = {}
        for row in await connection.fetch(
            "SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN (SELECT tablename FROM pg_tables WHERE schemaname='public')"
        ):
            expected.setdefault(row["table_name"], set()).add(row["column_name"])
        actual = {}
        for match in re.finditer(
            r"^      (\w+): \{\n        Row: \{(.*?)^        \};?$", source, re.MULTILINE | re.DOTALL
        ):
            actual[match[1]] = set(re.findall(r"^          (\w+):", match[2], re.MULTILINE))
        if actual != expected:
            raise RuntimeError(
                "Catalog and generated table/column contracts differ; refusing write"
            )
        OUTPUT.write_text(prefix + "  public: {" + source.rstrip() + "\n", encoding="utf-8")
        print(
            f"Refreshed {len(TABLES)} chat table definitions and validated all {len(actual)} public table/column contracts."
        )
    finally:
        await connection.close()


if __name__ == "__main__":
    asyncio.run(main())
