"""Bounded first-page previews; no persisted copies or external inference."""

import asyncio
import math
import os
import subprocess
import sys
import tempfile
from pathlib import Path

MAX_SOURCE_BYTES = 32 * 1024 * 1024
_render_slots = asyncio.Semaphore(2)


def render_first_page(source: Path, target: Path) -> None:
    """Run only in the isolated renderer process, never concurrently in API threads."""
    import pymupdf as fitz

    with fitz.open(source) as document:
        if not document.is_pdf or document.needs_pass or not document.page_count:
            raise ValueError("A readable PDF is required.")
        page = document[0]
        width, height = page.rect.width, page.rect.height
        if not all(math.isfinite(value) and value > 0 for value in (width, height)):
            raise ValueError("Invalid page size.")
        scale = min(400 / width, 600 / height)
        image = page.get_pixmap(
            matrix=fitz.Matrix(scale, scale), colorspace=fitz.csRGB, alpha=False, annots=False
        )
        image.save(target)


async def document_thumbnail(storage_key: str) -> bytes:
    from app.engines.storage import storage_engine

    async with asyncio.timeout(12), _render_slots:
        source = await storage_engine.download_bytes(storage_key, max_bytes=MAX_SOURCE_BYTES)
        with tempfile.TemporaryDirectory(prefix="pansgpt-thumbnail-") as directory:
            input_path = Path(directory) / "source.pdf"
            output_path = Path(directory) / "thumbnail.png"
            input_path.write_bytes(source)
            # Windows Uvicorn reload uses SelectorEventLoop, which has no async
            # subprocess transport. Spawn normally and wait off the event loop.
            process = subprocess.Popen(
                [sys.executable, "-m", "app.engines.thumbnail", str(input_path), str(output_path)],
                cwd=Path(__file__).resolve().parents[2],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
            )
            try:
                await asyncio.to_thread(process.wait, timeout=8)
            finally:
                if process.poll() is None:
                    process.kill()
                    await asyncio.to_thread(process.wait)
            if process.returncode != 0 or not output_path.is_file():
                raise ValueError("Document preview is unavailable.")
            return output_path.read_bytes()


if __name__ == "__main__":
    render_first_page(Path(sys.argv[1]), Path(sys.argv[2]))
