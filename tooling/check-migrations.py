"""Fail CI if the documented migration mirror differs from the executable history."""

from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
source = root / "supabase/migrations"
mirror = root / "packages/database/migrations"
expected = {path.name: path.read_bytes() for path in source.glob("*.sql")}
actual = {path.name: path.read_bytes() for path in mirror.glob("*.sql")}
if expected != actual:
    raise SystemExit("Migration mirror differs; copy the authoritative supabase/migrations files.")
for filename, data in expected.items():
    sql = data.decode("utf-8")
    # Every CREATE TABLE is followed by RLS before another object is created.
    for match in re.finditer(r"CREATE TABLE (?:IF NOT EXISTS )?(public\.\w+)\s*\(", sql, re.I):
        end = sql.index(";", match.end())
        suffix = sql[end + 1 :].lstrip()
        required = f"ALTER TABLE {match[1]} ENABLE ROW LEVEL SECURITY;"
        if not suffix.lower().startswith(required.lower()):
            raise SystemExit(f"{filename}: {match[1]} must enable RLS immediately after creation")
print(f"Verified {len(expected)} mirrored migrations.")
