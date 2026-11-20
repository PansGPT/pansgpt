"""Explicit opt-in Redis Lua/concurrency checks using isolated expiring test keys.

No LLM calls, student records, or production quota counters are used.
"""

import argparse
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps/api"))

from app.core.config import settings  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--live", action="store_true")
    args = parser.parse_args()
    if not args.live:
        parser.error("--live is required to contact Redis")
    connection = settings.redis_connection_url
    if not connection:
        parser.error("Redis is not configured")
    os.environ["CAPACITY_TEST_REDIS_URL"] = connection
    import pytest

    return pytest.main(
        [
            str(ROOT / "apps/api/tests/test_provider_capacity.py"),
            str(ROOT / "apps/api/tests/test_chat_system_limits.py"),
            "-m",
            "live",
            "--allow-live-services",
            "-q",
            "--tb=short",
        ]
    )


if __name__ == "__main__":
    raise SystemExit(main())
