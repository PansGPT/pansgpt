"""Run inside the production image as its non-root application user."""

import asyncio
import io
import os

import fitz
from app.engines.converter import convert_office_to_pdf
from docx import Document


async def main() -> None:
    assert os.geteuid() != 0, "Conversion must work as the application user"
    document = Document()
    document.add_paragraph("PansGPT deployment conversion verification")
    source = io.BytesIO()
    document.save(source)
    pdf = await convert_office_to_pdf(source.getvalue(), "docx")
    with fitz.open(stream=pdf, filetype="pdf") as rendered:
        assert len(rendered) >= 1
        assert "PansGPT deployment conversion verification" in rendered[0].get_text()
    print(
        "Real LibreOffice DOCX-to-PDF conversion passed as the non-root application user."
    )


asyncio.run(main())
