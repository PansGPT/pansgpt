"""Private attachment parsing with a process timeout and bounded concurrency."""

import asyncio
import os
import subprocess
import sys
import tempfile
from pathlib import Path

_slots = asyncio.Semaphore(2)


async def document_text(data: bytes, content_type: str) -> str:
    async with asyncio.timeout(20), _slots:
        with tempfile.TemporaryDirectory(prefix="pansgpt-attachment-") as directory:
            source, target = Path(directory) / "source", Path(directory) / "text"
            source.write_bytes(data)
            process = subprocess.Popen(
                [
                    sys.executable,
                    "-m",
                    "app.engines.chat_document_worker",
                    str(source),
                    str(target),
                    content_type,
                ],
                cwd=Path(__file__).resolve().parents[2],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
            )
            try:
                await asyncio.to_thread(process.wait, timeout=12)
            except subprocess.TimeoutExpired as exc:
                raise TimeoutError("Attachment parsing timed out.") from exc
            finally:
                if process.poll() is None:
                    process.kill()
                    await asyncio.to_thread(process.wait)
            if process.returncode != 0 or not target.is_file() or target.stat().st_size > 160_000:
                raise ValueError("The attachment could not be read.")
            return target.read_text(encoding="utf-8")
