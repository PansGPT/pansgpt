# ==============================================================================  # [OFFICE PDF FIX]
# PansGPT 2.0 LibreOffice Document Conversion Engine (Office -> High-Fidelity PDF)  # [OFFICE PDF FIX]
# ==============================================================================  # [OFFICE PDF FIX]

import asyncio  # [OFFICE PDF FIX]
import os  # [OFFICE PDF FIX]
import shutil  # [OFFICE PDF FIX]
import tempfile  # [OFFICE PDF FIX]
from pathlib import Path  # [OFFICE PDF FIX]

import structlog  # [OFFICE PDF FIX]

from app.core.config import settings  # [OFFICE PDF FIX]

logger = structlog.get_logger(__name__)  # [OFFICE PDF FIX]


class ConversionError(Exception):  # [OFFICE PDF FIX]
    """Raised when Office document to PDF conversion fails."""  # [OFFICE PDF FIX]

    pass  # [OFFICE PDF FIX]


_CONVERSION_SEMAPHORE = asyncio.Semaphore(1)  # [OFFICE PDF FIX]


def find_soffice_binary() -> str | None:  # [OFFICE PDF FIX]
    """Auto-detects LibreOffice soffice executable across configured path, PATH, and system defaults."""  # [OFFICE PDF FIX]
    # 1. Explicit setting in config  # [OFFICE PDF FIX]
    if (
        getattr(settings, "SOFFICE_PATH", None) and settings.SOFFICE_PATH.strip()
    ):  # [OFFICE PDF FIX]
        configured = settings.SOFFICE_PATH.strip()  # [OFFICE PDF FIX]
        if os.path.exists(configured):  # [OFFICE PDF FIX]
            return configured  # [OFFICE PDF FIX]
        found = shutil.which(configured)  # [OFFICE PDF FIX]
        if found:  # [OFFICE PDF FIX]
            return found  # [OFFICE PDF FIX]

    # 2. In system PATH  # [OFFICE PDF FIX]
    for binary_name in ("soffice.com", "soffice", "libreoffice"):  # [OFFICE PDF FIX]
        path = shutil.which(binary_name)  # [OFFICE PDF FIX]
        if path:  # [OFFICE PDF FIX]
            return path  # [OFFICE PDF FIX]

    # 3. Default Windows folders  # [OFFICE PDF FIX]
    windows_candidates = [  # [OFFICE PDF FIX]
        r"C:\Program Files\LibreOffice\program\soffice.com",  # [OFFICE PDF FIX]
        r"C:\Program Files\LibreOffice\program\soffice.exe",  # [OFFICE PDF FIX]
        r"C:\Program Files (x86)\LibreOffice\program\soffice.com",  # [OFFICE PDF FIX]
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",  # [OFFICE PDF FIX]
    ]  # [OFFICE PDF FIX]
    for win_path in windows_candidates:  # [OFFICE PDF FIX]
        if os.path.exists(win_path):  # [OFFICE PDF FIX]
            return win_path  # [OFFICE PDF FIX]

    # 4. Default Linux / container paths  # [OFFICE PDF FIX]
    linux_candidates = [  # [OFFICE PDF FIX]
        "/usr/bin/soffice",  # [OFFICE PDF FIX]
        "/usr/bin/libreoffice",  # [OFFICE PDF FIX]
        "/usr/local/bin/soffice",  # [OFFICE PDF FIX]
        "/usr/local/bin/libreoffice",  # [OFFICE PDF FIX]
    ]  # [OFFICE PDF FIX]
    for lin_path in linux_candidates:  # [OFFICE PDF FIX]
        if os.path.exists(lin_path):  # [OFFICE PDF FIX]
            return lin_path  # [OFFICE PDF FIX]

    return None  # [OFFICE PDF FIX]


async def convert_office_to_pdf(file_bytes: bytes, extension: str) -> bytes:  # [OFFICE PDF FIX]
    """# [OFFICE PDF FIX]
    Converts Office documents (.docx, .doc, .pptx, .ppt) to faithful visual PDF bytes via LibreOffice.  # [OFFICE PDF FIX]
    Runs soffice in headless mode with an isolated per-call profile under a module-level concurrency semaphore.  # [OFFICE PDF FIX]
    """  # [OFFICE PDF FIX]
    ext = (extension or "").lower().lstrip(".")  # [OFFICE PDF FIX]
    if not ext:  # [OFFICE PDF FIX]
        raise ConversionError(
            "File extension must be specified for Office conversion."
        )  # [OFFICE PDF FIX]
    if not file_bytes:  # [OFFICE PDF FIX]
        raise ConversionError("Input file bytes are empty.")  # [OFFICE PDF FIX]

    soffice_path = find_soffice_binary()  # [OFFICE PDF FIX]
    if not soffice_path:  # [OFFICE PDF FIX]
        raise ConversionError(  # [OFFICE PDF FIX]
            "LibreOffice soffice executable not found. "  # [OFFICE PDF FIX]
            "Please install LibreOffice or set SOFFICE_PATH in environment."  # [OFFICE PDF FIX]
        )  # [OFFICE PDF FIX]

    async with _CONVERSION_SEMAPHORE:  # [OFFICE PDF FIX]
        temp_dir = tempfile.mkdtemp(prefix="libreoffice_conv_")  # [OFFICE PDF FIX]
        try:  # [OFFICE PDF FIX]
            temp_path = Path(temp_dir)  # [OFFICE PDF FIX]
            profile_dir = temp_path / "profile"  # [OFFICE PDF FIX]
            profile_dir.mkdir(parents=True, exist_ok=True)  # [OFFICE PDF FIX]
            out_dir = temp_path / "out"  # [OFFICE PDF FIX]
            out_dir.mkdir(parents=True, exist_ok=True)  # [OFFICE PDF FIX]
            in_file = temp_path / f"input.{ext}"  # [OFFICE PDF FIX]
            in_file.write_bytes(file_bytes)  # [OFFICE PDF FIX]

            profile_uri = profile_dir.as_uri()  # [OFFICE PDF FIX]
            cmd = [  # [OFFICE PDF FIX]
                soffice_path,  # [OFFICE PDF FIX]
                "--headless",  # [OFFICE PDF FIX]
                "--norestore",  # [OFFICE PDF FIX]
                f"-env:UserInstallation={profile_uri}",  # [OFFICE PDF FIX]
                "--convert-to",  # [OFFICE PDF FIX]
                "pdf",  # [OFFICE PDF FIX]
                "--outdir",  # [OFFICE PDF FIX]
                str(out_dir),  # [OFFICE PDF FIX]
                str(in_file),  # [OFFICE PDF FIX]
            ]  # [OFFICE PDF FIX]

            try:  # [OFFICE PDF FIX]
                proc = await asyncio.create_subprocess_exec(  # [OFFICE PDF FIX]
                    *cmd,  # [OFFICE PDF FIX]
                    stdout=asyncio.subprocess.PIPE,  # [OFFICE PDF FIX]
                    stderr=asyncio.subprocess.PIPE,  # [OFFICE PDF FIX]
                )  # [OFFICE PDF FIX]
            except Exception as exc:  # [OFFICE PDF FIX]
                raise ConversionError(
                    f"Failed to execute LibreOffice subprocess: {exc}"
                ) from exc  # [OFFICE PDF FIX]

            try:  # [OFFICE PDF FIX]
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(), timeout=180.0
                )  # [OFFICE PDF FIX]
            except TimeoutError:  # [OFFICE PDF FIX]
                try:  # [OFFICE PDF FIX]
                    proc.kill()  # [OFFICE PDF FIX]
                    await proc.wait()  # [OFFICE PDF FIX]
                except Exception:  # [OFFICE PDF FIX]
                    pass  # [OFFICE PDF FIX]
                raise ConversionError(  # [OFFICE PDF FIX]
                    f"LibreOffice conversion timed out after 180 seconds for .{ext}"  # [OFFICE PDF FIX]
                )  # [OFFICE PDF FIX]

            if proc.returncode != 0:  # [OFFICE PDF FIX]
                err_text = (  # [OFFICE PDF FIX]
                    stderr.decode("utf-8", errors="replace").strip()  # [OFFICE PDF FIX]
                    or stdout.decode("utf-8", errors="replace").strip()  # [OFFICE PDF FIX]
                )  # [OFFICE PDF FIX]
                raise ConversionError(  # [OFFICE PDF FIX]
                    f"LibreOffice conversion failed with exit code {proc.returncode}: {err_text}"  # [OFFICE PDF FIX]
                )  # [OFFICE PDF FIX]

            out_pdf = out_dir / "input.pdf"  # [OFFICE PDF FIX]
            if not out_pdf.exists() or out_pdf.stat().st_size == 0:  # [OFFICE PDF FIX]
                pdf_files = list(out_dir.glob("*.pdf"))  # [OFFICE PDF FIX]
                if pdf_files and pdf_files[0].stat().st_size > 0:  # [OFFICE PDF FIX]
                    out_pdf = pdf_files[0]  # [OFFICE PDF FIX]
                else:  # [OFFICE PDF FIX]
                    raise ConversionError(  # [OFFICE PDF FIX]
                        f"LibreOffice did not produce a valid non-empty PDF file for .{ext}"  # [OFFICE PDF FIX]
                    )  # [OFFICE PDF FIX]

            return out_pdf.read_bytes()  # [OFFICE PDF FIX]
        finally:  # [OFFICE PDF FIX]
            shutil.rmtree(temp_dir, ignore_errors=True)  # [OFFICE PDF FIX]
