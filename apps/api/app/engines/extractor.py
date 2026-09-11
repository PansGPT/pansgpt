# ==============================================================================
# Document Extractor Engine (Roadmap Phase 5: 5.3 & 5.4)
# Multi-Format Support: PDF (native + local OCR-first), DOCX, PPTX, TXT, CSV, MD
# ==============================================================================

from __future__ import annotations

import csv
import io
from dataclasses import dataclass, field

import fitz  # PyMuPDF


@dataclass
class ExtractedTable:
    page_number: int
    markdown: str
    headers: list[str]
    rows: list[list[str]]
    is_native: bool = True


@dataclass
class ExtractedImage:
    page_number: int
    image_bytes: bytes
    format: str = "png"
    width: int = 0
    height: int = 0
    xref: int | None = None


@dataclass
class ExtractedPage:
    page_number: int
    has_text_layer: bool
    native_text: str = ""
    extraction_method: str = "native"  # 'native', 'ocr', 'scanned_canvas'
    tables: list[ExtractedTable] = field(default_factory=list)
    embedded_images: list[ExtractedImage] = field(default_factory=list)
    full_page_render: bytes | None = None


class DocumentExtractor:
    """
    Unified multi-format document extraction engine:
    - PDF: PyMuPDF native extraction -> Local OCR-first check -> Scanned canvas fallback
    - DOCX: python-docx paragraph, heading, and table extraction
    - PPTX: python-pptx slide title, body, table, and image extraction
    - TXT / MD: Plaintext and markdown structured section parsing
    - CSV / XLSX: Structured tabular row & column extraction
    """

    # --------------------------------------------------------------------------
    # 5.3 PDF Extraction & Local OCR-First Step ($0 Cost)
    # --------------------------------------------------------------------------

    def check_page_text_layer(
        self, page: fitz.Page, min_char_threshold: int = 35
    ) -> tuple[bool, str, str]:
        """
        Stage 2 + Local OCR-First Step:
        1. Check if page has selectable text layer. If yes -> ('native', text).
        2. If no, attempt zero-cost Local OCR (PyMuPDF get_textpage_ocr).
           If local OCR yields >= min_char_threshold -> ('ocr', ocr_text).
        3. If local OCR is unavailable or fails -> (False, 'scanned_canvas', '').
        """
        text = page.get_text("text").strip()
        alnum_chars = sum(1 for c in text if c.isalnum())
        if alnum_chars >= min_char_threshold:
            return True, "native", text

        # Attempt Local OCR-first step ($0 cost) before falling back to Vision LLM
        try:
            textpage_ocr = page.get_textpage_ocr(language="eng", dpi=150)
            ocr_text = textpage_ocr.extractText().strip()
            ocr_alnum = sum(1 for c in ocr_text if c.isalnum())
            if ocr_alnum >= min_char_threshold:
                return True, "ocr", ocr_text
        except Exception:
            # Local OCR (Tesseract / language data) not available or failed
            pass

        return False, "scanned_canvas", ""

    def extract_tables_from_page(self, page: fitz.Page, page_number: int) -> list[ExtractedTable]:
        """Stage 6 Native Path: PyMuPDF cell geometry extraction."""
        tables = []
        try:
            tab_finder = page.find_tables()
            for tab in tab_finder.tables:
                extracted = tab.extract()
                if not extracted or len(extracted) < 2:
                    continue

                headers = [str(col).strip() if col is not None else "" for col in extracted[0]]
                rows = [
                    [str(val).strip() if val is not None else "" for val in row]
                    for row in extracted[1:]
                ]

                header_line = "| " + " | ".join(headers) + " |"
                separator_line = "| " + " | ".join(["---"] * len(headers)) + " |"
                row_lines = ["| " + " | ".join(r) + " |" for r in rows]
                markdown = "\n".join([header_line, separator_line] + row_lines)

                tables.append(
                    ExtractedTable(
                        page_number=page_number,
                        markdown=markdown,
                        headers=headers,
                        rows=rows,
                        is_native=True,
                    )
                )
        except Exception:
            pass
        return tables

    def extract_embedded_images(
        self, doc: fitz.Document, page: fitz.Page, page_number: int
    ) -> list[ExtractedImage]:
        """Stage 3a: Scan page for embedded figures, diagrams, and scans."""
        images = []
        image_list = page.get_images(full=True)
        for img_info in image_list:
            xref = img_info[0]
            try:
                base_image = doc.extract_image(xref)
                if not base_image:
                    continue
                image_bytes = base_image["image"]
                img_ext = base_image.get("ext", "png")
                width = base_image.get("width", 0)
                height = base_image.get("height", 0)

                if width < 80 or height < 80:
                    continue

                images.append(
                    ExtractedImage(
                        page_number=page_number,
                        image_bytes=image_bytes,
                        format=img_ext,
                        width=width,
                        height=height,
                        xref=xref,
                    )
                )
            except Exception:
                continue
        return images

    def render_page_canvas(self, page: fitz.Page, dpi: int = 150) -> bytes:
        """Stage 3b: Render full page canvas as image for Vision fallback."""
        pix = page.get_pixmap(dpi=dpi)
        return pix.tobytes("png")

    def process_pdf(self, pdf_bytes: bytes) -> list[ExtractedPage]:
        """Process PDF document through Stages 2, 3a, 3b, and 6."""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        pages: list[ExtractedPage] = []

        for page_idx in range(len(doc)):
            page_num = page_idx + 1
            page = doc[page_idx]

            has_text, method, text_content = self.check_page_text_layer(page)
            if has_text:
                tables = self.extract_tables_from_page(page, page_num)
                embedded_images = self.extract_embedded_images(doc, page, page_num)
                pages.append(
                    ExtractedPage(
                        page_number=page_num,
                        has_text_layer=True,
                        native_text=text_content,
                        extraction_method=method,
                        tables=tables,
                        embedded_images=embedded_images,
                        full_page_render=None,
                    )
                )
            else:
                full_render = self.render_page_canvas(page, dpi=150)
                pages.append(
                    ExtractedPage(
                        page_number=page_num,
                        has_text_layer=False,
                        native_text="",
                        extraction_method="scanned_canvas",
                        tables=[],
                        embedded_images=[],
                        full_page_render=full_render,
                    )
                )

        doc.close()
        return pages

    # --------------------------------------------------------------------------
    # 5.4 Multi-Format Extractors (DOCX, PPTX, TXT, CSV, MD)
    # --------------------------------------------------------------------------

    def process_docx(self, file_bytes: bytes) -> list[ExtractedPage]:
        """Extract text, headings, and tables from Word (.docx) documents."""
        import docx

        doc = docx.Document(io.BytesIO(file_bytes))
        paragraphs: list[str] = []
        for p in doc.paragraphs:
            text = p.text.strip()
            if not text:
                continue
            # Preserve headings cleanly with markdown indicators
            if p.style.name.startswith("Heading"):
                level = 1
                try:
                    level = int(p.style.name.split()[-1])
                except (ValueError, IndexError):
                    level = 1
                paragraphs.append(f"{'#' * level} {text}")
            else:
                paragraphs.append(text)

        tables: list[ExtractedTable] = []
        for t_idx, t in enumerate(doc.tables):
            if not t.rows:
                continue
            headers = [cell.text.strip() for cell in t.rows[0].cells]
            rows = [[cell.text.strip() for cell in row.cells] for row in t.rows[1:]]
            header_line = "| " + " | ".join(headers) + " |"
            separator_line = "| " + " | ".join(["---"] * len(headers)) + " |"
            row_lines = ["| " + " | ".join(r) + " |" for r in rows]
            markdown = "\n".join([header_line, separator_line] + row_lines)
            tables.append(
                ExtractedTable(
                    page_number=1,
                    markdown=markdown,
                    headers=headers,
                    rows=rows,
                    is_native=True,
                )
            )

        full_text = "\n\n".join(paragraphs)
        return [
            ExtractedPage(
                page_number=1,
                has_text_layer=True,
                native_text=full_text,
                extraction_method="native",
                tables=tables,
            )
        ]

    def process_pptx(self, file_bytes: bytes) -> list[ExtractedPage]:
        """Extract slides, titles, shapes, and notes from PowerPoint (.pptx) decks."""
        import pptx

        prs = pptx.Presentation(io.BytesIO(file_bytes))
        pages: list[ExtractedPage] = []

        for slide_idx, slide in enumerate(prs.slides):
            slide_num = slide_idx + 1
            slide_texts: list[str] = []
            tables: list[ExtractedTable] = []

            for shape in slide.shapes:
                if shape.has_text_frame:
                    for paragraph in shape.text_frame.paragraphs:
                        text = paragraph.text.strip()
                        if text:
                            slide_texts.append(text)
                elif shape.has_table:
                    t = shape.table
                    all_rows = list(t.rows)
                    headers = [cell.text.strip() for cell in all_rows[0].cells] if all_rows else []
                    rows = (
                        [[cell.text.strip() for cell in row.cells] for row in all_rows[1:]]
                        if len(all_rows) > 1
                        else []
                    )
                    header_line = "| " + " | ".join(headers) + " |"
                    separator_line = "| " + " | ".join(["---"] * len(headers)) + " |"
                    row_lines = ["| " + " | ".join(r) + " |" for r in rows]
                    markdown = "\n".join([header_line, separator_line] + row_lines)
                    tables.append(
                        ExtractedTable(
                            page_number=slide_num,
                            markdown=markdown,
                            headers=headers,
                            rows=rows,
                            is_native=True,
                        )
                    )

            # Extract presenter notes if present
            if slide.has_notes_slide and slide.notes_slide.notes_text_frame:
                notes_text = slide.notes_slide.notes_text_frame.text.strip()
                if notes_text:
                    slide_texts.append(f"[Presenter Notes: {notes_text}]")

            native_text = "\n\n".join(slide_texts)
            pages.append(
                ExtractedPage(
                    page_number=slide_num,
                    has_text_layer=bool(native_text or tables),
                    native_text=native_text,
                    extraction_method="native",
                    tables=tables,
                )
            )

        return pages or [
            ExtractedPage(page_number=1, has_text_layer=False, extraction_method="native")
        ]

    def process_txt_or_md(
        self, file_bytes: bytes, is_markdown: bool = False
    ) -> list[ExtractedPage]:
        """Extract plain text (.txt) and markdown (.md) documents."""
        try:
            text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            text = file_bytes.decode("latin-1", errors="replace")

        # Split very large text documents into ~1,000 word virtual pages
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        pages: list[ExtractedPage] = []
        current_page_paras: list[str] = []
        current_word_count = 0
        page_num = 1

        for para in paragraphs:
            words = len(para.split())
            if current_word_count + words > 800 and current_page_paras:
                pages.append(
                    ExtractedPage(
                        page_number=page_num,
                        has_text_layer=True,
                        native_text="\n\n".join(current_page_paras),
                        extraction_method="native",
                    )
                )
                page_num += 1
                current_page_paras = [para]
                current_word_count = words
            else:
                current_page_paras.append(para)
                current_word_count += words

        if current_page_paras:
            pages.append(
                ExtractedPage(
                    page_number=page_num,
                    has_text_layer=True,
                    native_text="\n\n".join(current_page_paras),
                    extraction_method="native",
                )
            )

        return pages or [
            ExtractedPage(page_number=1, has_text_layer=False, extraction_method="native")
        ]

    def process_csv_or_excel(self, file_bytes: bytes, is_csv: bool = True) -> list[ExtractedPage]:
        """Extract tabular data from CSV (.csv) or Excel (.xlsx) files into structured tables."""
        tables: list[ExtractedTable] = []

        if is_csv:
            try:
                decoded = file_bytes.decode("utf-8")
            except UnicodeDecodeError:
                decoded = file_bytes.decode("latin-1", errors="replace")
            reader = csv.reader(io.StringIO(decoded))
            rows_list = list(reader)
            if rows_list:
                headers = [str(col).strip() for col in rows_list[0]]
                rows = [[str(val).strip() for val in row] for row in rows_list[1:]]
                header_line = "| " + " | ".join(headers) + " |"
                separator_line = "| " + " | ".join(["---"] * len(headers)) + " |"
                row_lines = ["| " + " | ".join(r) for r in rows]
                markdown = "\n".join([header_line, separator_line] + [f"{r} |" for r in row_lines])
                tables.append(
                    ExtractedTable(
                        page_number=1,
                        markdown=markdown,
                        headers=headers,
                        rows=rows,
                        is_native=True,
                    )
                )
        else:
            import openpyxl

            wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
            for sheet_idx, sheetname in enumerate(wb.sheetnames):
                sheet = wb[sheetname]
                rows_data = list(sheet.iter_rows(values_only=True))
                if not rows_data:
                    continue
                headers = [str(col).strip() if col is not None else "" for col in rows_data[0]]
                rows = [
                    [str(val).strip() if val is not None else "" for val in row]
                    for row in rows_data[1:]
                ]
                header_line = "| " + " | ".join(headers) + " |"
                separator_line = "| " + " | ".join(["---"] * len(headers)) + " |"
                row_lines = ["| " + " | ".join(r) + " |" for r in rows]
                markdown = f"### Sheet: {sheetname}\n\n" + "\n".join(
                    [header_line, separator_line] + row_lines
                )
                tables.append(
                    ExtractedTable(
                        page_number=sheet_idx + 1,
                        markdown=markdown,
                        headers=headers,
                        rows=rows,
                        is_native=True,
                    )
                )

        return [
            ExtractedPage(
                page_number=1,
                has_text_layer=True,
                native_text=f"Tabular document with {len(tables)} table(s).",
                extraction_method="native",
                tables=tables,
            )
        ]

    # --------------------------------------------------------------------------
    # Universal Entrypoint
    # --------------------------------------------------------------------------

    def process_document(self, file_bytes: bytes, file_format: str = "pdf") -> list[ExtractedPage]:
        """
        Universal document processor handling PDF, DOCX, PPTX, TXT, MD, CSV, XLSX.
        """
        fmt = file_format.lower().lstrip(".")
        if fmt == "pdf":
            return self.process_pdf(file_bytes)
        if fmt in ("docx", "doc"):
            return self.process_docx(file_bytes)
        if fmt in ("pptx", "ppt"):
            return self.process_pptx(file_bytes)
        if fmt in ("txt", "text"):
            return self.process_txt_or_md(file_bytes, is_markdown=False)
        if fmt in ("md", "markdown"):
            return self.process_txt_or_md(file_bytes, is_markdown=True)
        if fmt == "csv":
            return self.process_csv_or_excel(file_bytes, is_csv=True)
        if fmt in ("xlsx", "xls"):
            return self.process_csv_or_excel(file_bytes, is_csv=False)

        # Default fallback to PDF
        return self.process_pdf(file_bytes)

    def convert_to_pdf(self, file_bytes: bytes, file_format: str = "pdf") -> bytes:
        """
        Converts non-PDF Office documents (DOCX, PPTX) and text files to standard PDF bytes
        using PyMuPDF's high-fidelity conversion engine. If already PDF, returns bytes unchanged.
        """
        fmt = file_format.lower().lstrip(".")
        if fmt == "pdf":
            return file_bytes

        if fmt in ("docx", "doc", "pptx", "ppt"):
            doc = fitz.open(stream=file_bytes, filetype=fmt)
            pdf_bytes = doc.convert_to_pdf()
            doc.close()
            return pdf_bytes

        if fmt in ("txt", "text", "md", "markdown", "csv"):
            doc = fitz.open()
            text_content = file_bytes.decode("utf-8", errors="replace")
            lines = text_content.splitlines()
            page = doc.new_page(width=595, height=842)
            y = 50
            for line in lines:
                if y > 790:
                    page = doc.new_page(width=595, height=842)
                    y = 50
                page.insert_text((50, y), line[:120], fontsize=10)
                y += 14
            pdf_bytes = doc.tobytes()
            doc.close()
            return pdf_bytes

        return file_bytes


document_extractor = DocumentExtractor()
