"""Prepare only the dedicated local governance test database from versioned DDL.

Usage: apps/api/.venv/Scripts/python.exe tooling/governance-test-database.py
The PostgreSQL server must already listen on loopback port 55434. No hosted
credentials are read. This intentionally does not emulate Supabase Auth or vector
search: it verifies the governance migration and its actual PostgreSQL queries.
"""

import asyncio
import sys
import re
from pathlib import Path

import asyncpg

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / 'supabase/migrations'
DATABASE = 'pansgpt_governance_test'


async def main() -> None:
    admin = await asyncpg.connect(host='127.0.0.1', port=55434, user='postgres', database='postgres')
    try:
        if '--fresh' in sys.argv and await admin.fetchval('SELECT 1 FROM pg_database WHERE datname=$1',DATABASE):
            await admin.execute('DROP DATABASE pansgpt_governance_test WITH (FORCE)')
        if not await admin.fetchval('SELECT 1 FROM pg_database WHERE datname=$1', DATABASE):
            await admin.execute('CREATE DATABASE pansgpt_governance_test')
        for role in ('anon','authenticated','service_role'):
            if not await admin.fetchval('SELECT 1 FROM pg_roles WHERE rolname=$1',role):
                await admin.execute(f'CREATE ROLE {role} NOLOGIN')
    finally:
        await admin.close()
    conn = await asyncpg.connect(host='127.0.0.1', port=55434, user='postgres', database=DATABASE)
    try:
        if await conn.fetchval("SELECT to_regclass('public.admin_memberships')"):
            print('Dedicated governance test schema is already prepared.')
            return
        async with conn.transaction():
            await conn.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;")
            extensions = (MIGRATIONS/'20260906090001_extensions_and_uuidv7.sql').read_text(encoding='utf-8')
            for statement in re.findall(r'CREATE TYPE [\s\S]*?;',extensions):
                await conn.execute(statement)
            helpers=(MIGRATIONS/'20260906090008_row_level_security.sql').read_text(encoding='utf-8').split('-- 3.')[0]
            await conn.execute('CREATE FUNCTION public.uuid_generate_v7() RETURNS uuid LANGUAGE sql VOLATILE AS $$ SELECT uuidv7() $$;')
            await conn.execute('CREATE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;')
            files = {
                '20260906090002_identity_and_tenancy.sql':['universities','academic_terms','users','invitations'],
                '20260906090003_content_and_ingestion.sql':['documents'],
                '20260906090005_ai_and_chat.sql':['ai_telemetry'],
                '20260906090006_academic_operations_and_notes.sql':['timetables','course_knowledge','exam_restrictions','system_settings','system_settings_history','audit_logs'],
                '20260911010001_phase4_database_foundation_complete.sql':['exam_timetables','support_tickets','support_ticket_replies'],
            }
            for name,tables in files.items():
                source=(MIGRATIONS/name).read_text(encoding='utf-8')
                for table in tables:
                    match=re.search(r'CREATE TABLE (?:IF NOT EXISTS )?public\.'+table+r'\s*\([\s\S]*?\n\);',source)
                    if match is None:raise RuntimeError(f'Cannot find canonical DDL for {table}')
                    await conn.execute(match[0])
                    await conn.execute(f'ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY')
            await conn.execute(helpers)
            await conn.execute((MIGRATIONS/'20261020091000_durable_ingestion.sql').read_text(encoding='utf-8'))
            await conn.execute((MIGRATIONS/'20261020095000_invitation_redemption.sql').read_text(encoding='utf-8'))
            await conn.execute('GRANT SELECT,INSERT,UPDATE,DELETE ON public.invitations TO authenticated')
            await conn.execute((MIGRATIONS/'20261113120000_administrative_governance.sql').read_text(encoding='utf-8'))
        print('Prepared isolated governance schema from canonical table DDL and governance migration.')
    finally:
        await conn.close()


if __name__=='__main__':asyncio.run(main())
