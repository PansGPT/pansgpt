# ==============================================================================
# Document Extractor Engine (Roadmap Phase 5: 5.3 & 5.4)
# Multi-Format Support: PDF (native + local OCR-first), DOCX, PPTX, TXT, CSV, MD
# ==============================================================================

from __future__ import annotations

import csv
import hashlib  # [IMAGE FIX]
import io
from dataclasses import dataclass, field

import fitz  # PyMuPDF

MIN_IMAGE_SIDE: int = 100  # [IMAGE FIX]
MAX_ASPECT_RATIO: float = 5.0  # [IMAGE FIX]
MAX_IMAGES_PER_PAGE: int = 3  # [IMAGE FIX]


@dataclass  # [IMAGE FIX]
class ExtractionStats:  # [IMAGE FIX]
    images_seen_total: int = 0  # [IMAGE FIX]
    filtered_out: int = 0  # [IMAGE FIX]
    duplicates_skipped: int = 0  # [IMAGE FIX]
    capped_out: int = 0  # [IMAGE FIX]
    images_sent: int = 0  # [IMAGE FIX]


@dataclass
class ExtractedTable:
    page_number: int
    markdown: str
    headers: list[str]
    rows: list[list[str]]
    is_native: bool = True
    bounding_box: dict | None = None


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
    page_width: float = 0.0
    page_height: float = 0.0
    bounding_box: dict | None = None


TEXT_LAYER_MIN_ALNUM: int = 10  # [IMAGES PHASE]


class DocumentExtractor:
    """
    Unified multi-format document extraction engine:
    - PDF: PyMuPDF native extraction -> Local OCR-first check -> Scanned canvas fallback
    - DOCX: python-docx paragraph, heading, and table extraction
    - PPTX: python-pptx slide title, body, table, and image extraction
    - TXT / MD: Plaintext and markdown structured section parsing
    - CSV / XLSX: Structured tabular row & column extraction
    """

    _ocr_available: bool | None = None  # Class-level cache for PyMuPDF local OCR [IMAGES PHASE]

    def __init__(self):  # [IMAGE FIX]
        self.last_stats: ExtractionStats | None = None  # [IMAGE FIX]

    # --------------------------------------------------------------------------
    # 5.3 PDF Extraction & Local OCR-First Step ($0 Cost)
    # --------------------------------------------------------------------------

    def check_page_text_layer(
        self,
        page: fitz.Page,
        min_char_threshold: int = TEXT_LAYER_MIN_ALNUM,  # [IMAGES PHASE]
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
        if DocumentExtractor._ocr_available is not False:  # [IMAGES PHASE]
            try:
                textpage_ocr = page.get_textpage_ocr(language="eng", dpi=150)
                DocumentExtractor._ocr_available = True  # [IMAGES PHASE]
                ocr_text = textpage_ocr.extractText().strip()
                ocr_alnum = sum(1 for c in ocr_text if c.isalnum())
                if ocr_alnum >= min_char_threshold:
                    return True, "ocr", ocr_text
            except Exception:
                # Local OCR (Tesseract / language data) not available or failed
                DocumentExtractor._ocr_available = False  # [IMAGES PHASE]

        return False, "scanned_canvas", ""

    def extract_tables_from_page(
        self, page: fitz.Page, page_number: int
    ) -> list[ExtractedTable]:  # [VISION FIX]
        """Stage 6 Native Path: PyMuPDF cell geometry extraction with junk filtering."""  # [VISION FIX]
        tables = []  # [VISION FIX]
        try:  # [VISION FIX]
            tab_finder = page.find_tables()  # [VISION FIX]
            p_w = float(page.rect.width) if page.rect.width > 0 else 1.0  # [VISION FIX]
            p_h = float(page.rect.height) if page.rect.height > 0 else 1.0  # [VISION FIX]
            for tab in tab_finder.tables:  # [VISION FIX]
                extracted = tab.extract()  # [VISION FIX]
                if not extracted or len(extracted) < 2:  # [VISION FIX]
                    continue  # [VISION FIX]

                n_rows = len(extracted)  # [VISION FIX]
                n_cols = max(len(r) for r in extracted) if extracted else 0  # [VISION FIX]
                if n_rows < 2 or n_cols < 2:  # [VISION FIX]
                    continue  # [VISION FIX]

                # Count cells with at least 2 alphanumeric characters each  # [VISION FIX]
                valid_cell_count = sum(  # [VISION FIX]
                    1  # [VISION FIX]
                    for row in extracted  # [VISION FIX]
                    for cell in row  # [VISION FIX]
                    if cell is not None
                    and sum(1 for c in str(cell) if c.isalnum()) >= 2  # [VISION FIX]
                )  # [VISION FIX]
                if valid_cell_count < 4:  # [VISION FIX]
                    continue  # [VISION FIX]

                headers = [
                    str(col).strip() if col is not None else "" for col in extracted[0]
                ]  # [VISION FIX]
                rows = [  # [VISION FIX]
                    [str(val).strip() if val is not None else "" for val in row]  # [VISION FIX]
                    for row in extracted[1:]  # [VISION FIX]
                ]  # [VISION FIX]

                header_line = "| " + " | ".join(headers) + " |"  # [VISION FIX]
                separator_line = "| " + " | ".join(["---"] * len(headers)) + " |"  # [VISION FIX]
                row_lines = ["| " + " | ".join(r) + " |" for r in rows]  # [VISION FIX]
                markdown = "\n".join([header_line, separator_line] + row_lines)  # [VISION FIX]

                t_bbox = getattr(tab, "bbox", (0, 0, 0, 0))  # [VISION FIX]
                norm_bbox = [  # [VISION FIX]
                    round(t_bbox[0] / p_w, 4),  # [VISION FIX]
                    round(t_bbox[1] / p_h, 4),  # [VISION FIX]
                    round(t_bbox[2] / p_w, 4),  # [VISION FIX]
                    round(t_bbox[3] / p_h, 4),  # [VISION FIX]
                ]  # [VISION FIX]
                bbox_data = {  # [VISION FIX]
                    "page": page_number,  # [VISION FIX]
                    "page_width": p_w,  # [VISION FIX]
                    "page_height": p_h,  # [VISION FIX]
                    "bbox": norm_bbox,  # [VISION FIX]
                    "rects": [norm_bbox],  # [VISION FIX]
                }  # [VISION FIX]

                tables.append(  # [VISION FIX]
                    ExtractedTable(  # [VISION FIX]
                        page_number=page_number,  # [VISION FIX]
                        markdown=markdown,  # [VISION FIX]
                        headers=headers,  # [VISION FIX]
                        rows=rows,  # [VISION FIX]
                        is_native=True,  # [VISION FIX]
                        bounding_box=bbox_data,  # [VISION FIX]
                    )  # [VISION FIX]
                )  # [VISION FIX]
        except Exception:  # [VISION FIX]
            pass  # [VISION FIX]
        return tables  # [VISION FIX]

    def extract_embedded_images(  # [IMAGE FIX]
        self,  # [IMAGE FIX]
        doc: fitz.Document,  # [IMAGE FIX]
        page: fitz.Page,  # [IMAGE FIX]
        page_number: int,  # [IMAGE FIX]
        seen_hashes: set[str] | None = None,  # [IMAGE FIX]
        stats: ExtractionStats | None = None,  # [IMAGE FIX]
    ) -> list[ExtractedImage]:  # [IMAGE FIX]
        """Stage 3a: Scan page for embedded figures, diagrams, and scans."""  # [IMAGE FIX]
        images: list[ExtractedImage] = []  # [IMAGE FIX]
        image_list = page.get_image_info(xrefs=True)  # [IMAGE FIX]
        pdf_doc = doc if doc is not None else getattr(page, "parent", None)  # [IMAGE FIX]
        for img in image_list:  # [IMAGE FIX]
            if stats is not None:  # [IMAGE FIX]
                stats.images_seen_total += 1  # [IMAGE FIX]
            xref = img.get("xref", 0)  # [IMAGE FIX]
            if not xref or xref <= 0:  # [IMAGE FIX]
                if stats is not None:  # [IMAGE FIX]
                    stats.filtered_out += 1  # [IMAGE FIX]
                continue  # [IMAGE FIX]
            try:  # [IMAGE FIX]
                base_image = pdf_doc.extract_image(xref) if pdf_doc else None  # [IMAGE FIX]
                if not base_image:  # [IMAGE FIX]
                    if stats is not None:  # [IMAGE FIX]
                        stats.filtered_out += 1  # [IMAGE FIX]
                    continue  # [IMAGE FIX]
                image_bytes = base_image.get("image", b"")  # [IMAGE FIX]
                if not image_bytes:  # [IMAGE FIX]
                    if stats is not None:  # [IMAGE FIX]
                        stats.filtered_out += 1  # [IMAGE FIX]
                    continue  # [IMAGE FIX]
                img_ext = base_image.get("ext", "png")  # [IMAGE FIX]
                width = base_image.get("width", 0)  # [IMAGE FIX]
                height = base_image.get("height", 0)  # [IMAGE FIX]
                if width == 0 or height == 0:  # [IMAGE FIX]
                    from PIL import Image  # [IMAGE FIX]

                    pil_img = Image.open(io.BytesIO(image_bytes))  # [IMAGE FIX]
                    width, height = pil_img.width, pil_img.height  # [IMAGE FIX]

                if width < MIN_IMAGE_SIDE or height < MIN_IMAGE_SIDE:  # [IMAGE FIX]
                    if stats is not None:  # [IMAGE FIX]
                        stats.filtered_out += 1  # [IMAGE FIX]
                    continue  # [IMAGE FIX]

                aspect_ratio = width / height if height > 0 else 0.0  # [IMAGE FIX]
                if aspect_ratio > MAX_ASPECT_RATIO or aspect_ratio < (
                    1.0 / MAX_ASPECT_RATIO
                ):  # [IMAGE FIX]
                    if stats is not None:  # [IMAGE FIX]
                        stats.filtered_out += 1  # [IMAGE FIX]
                    continue  # [IMAGE FIX]

                img_hash = hashlib.md5(image_bytes).hexdigest()  # [IMAGE FIX]
                if seen_hashes is not None and img_hash in seen_hashes:  # [IMAGE FIX]
                    if stats is not None:  # [IMAGE FIX]
                        stats.duplicates_skipped += 1  # [IMAGE FIX]
                    continue  # [IMAGE FIX]

                if len(images) >= MAX_IMAGES_PER_PAGE:  # [IMAGE FIX]
                    if stats is not None:  # [IMAGE FIX]
                        stats.capped_out += 1  # [IMAGE FIX]
                    continue  # [IMAGE FIX]

                if seen_hashes is not None:  # [IMAGE FIX]
                    seen_hashes.add(img_hash)  # [IMAGE FIX]

                images.append(  # [IMAGE FIX]
                    ExtractedImage(  # [IMAGE FIX]
                        page_number=page_number,  # [IMAGE FIX]
                        image_bytes=image_bytes,  # [IMAGE FIX]
                        format=img_ext,  # [IMAGE FIX]
                        width=width,  # [IMAGE FIX]
                        height=height,  # [IMAGE FIX]
                        xref=xref,  # [IMAGE FIX]
                    )  # [IMAGE FIX]
                )  # [IMAGE FIX]
                if stats is not None:  # [IMAGE FIX]
                    stats.images_sent += 1  # [IMAGE FIX]
            except Exception:  # [IMAGE FIX]
                if stats is not None:  # [IMAGE FIX]
                    stats.filtered_out += 1  # [IMAGE FIX]
                continue  # [IMAGE FIX]
        return images  # [IMAGE FIX]

    def render_page_canvas(self, page: fitz.Page, dpi: int = 150) -> bytes:
        """Stage 3b: Render full page canvas as image for Vision fallback."""
        pix = page.get_pixmap(dpi=dpi)
        return pix.tobytes("png")

    def process_pdf(self, pdf_bytes: bytes) -> list[ExtractedPage]:  # [IMAGE FIX]
        """Process PDF document through Stages 2, 3a, 3b, and 6."""  # [IMAGE FIX]
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")  # [IMAGE FIX]
        pages: list[ExtractedPage] = []  # [IMAGE FIX]
        seen_hashes: set[str] = set()  # [IMAGE FIX]
        stats = ExtractionStats()  # [IMAGE FIX]
        self.last_stats = stats  # [IMAGE FIX]

        for page_idx in range(len(doc)):  # [IMAGE FIX]
            page_num = page_idx + 1  # [IMAGE FIX]
            page = doc[page_idx]  # [IMAGE FIX]
            p_w = float(page.rect.width) if page.rect.width > 0 else 1.0  # [IMAGE FIX]
            p_h = float(page.rect.height) if page.rect.height > 0 else 1.0  # [IMAGE FIX]

            has_text, method, text_content = self.check_page_text_layer(page)  # [IMAGE FIX]
            if has_text:  # [IMAGE FIX]
                tables = self.extract_tables_from_page(page, page_num)  # [IMAGE FIX]
                embedded_images = self.extract_embedded_images(  # [IMAGE FIX]
                    doc,
                    page,
                    page_num,
                    seen_hashes=seen_hashes,
                    stats=stats,  # [IMAGE FIX]
                )  # [IMAGE FIX]

                line_rects = []
                try:
                    text_dict = page.get_text("dict")
                    for block in text_dict.get("blocks", []):
                        if block.get("type") == 0:  # Text block
                            for line in block.get("lines", []):
                                lb = line.get("bbox")
                                if lb:
                                    line_rects.append(
                                        [
                                            round(lb[0] / p_w, 4),
                                            round(lb[1] / p_h, 4),
                                            round(lb[2] / p_w, 4),
                                            round(lb[3] / p_h, 4),
                                        ]
                                    )
                except Exception:
                    line_rects = []

                page_bbox = [0.05, 0.05, 0.95, 0.95]
                if line_rects:
                    min_x = min(r[0] for r in line_rects)
                    min_y = min(r[1] for r in line_rects)
                    max_x = max(r[2] for r in line_rects)
                    max_y = max(r[3] for r in line_rects)
                    page_bbox = [min_x, min_y, max_x, max_y]

                bbox_data = {
                    "page": page_num,
                    "page_width": p_w,
                    "page_height": p_h,
                    "bbox": page_bbox,
                    "rects": line_rects[:30],
                }

                pages.append(
                    ExtractedPage(
                        page_number=page_num,
                        has_text_layer=True,
                        native_text=text_content,
                        extraction_method=method,
                        tables=tables,
                        embedded_images=embedded_images,
                        full_page_render=None,
                        page_width=p_w,
                        page_height=p_h,
                        bounding_box=bbox_data,
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
                        page_width=p_w,
                        page_height=p_h,
                        bounding_box=None,
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

        if fmt in ("docx", "doc", "pptx", "ppt"):  # [OFFICE PDF FIX]
            # PyMuPDF convert_to_pdf is prohibited for Office documents to avoid layout collapse.  # [OFFICE PDF FIX]
            # Delegate to LibreOffice converter or raise clear error in async loops.  # [OFFICE PDF FIX]
            import asyncio  # [OFFICE PDF FIX]

            from app.engines.converter import convert_office_to_pdf  # [OFFICE PDF FIX]

            try:  # [OFFICE PDF FIX]
                loop = asyncio.get_running_loop()  # [OFFICE PDF FIX]
            except RuntimeError:  # [OFFICE PDF FIX]
                loop = None  # [OFFICE PDF FIX]
            if loop and loop.is_running():  # [OFFICE PDF FIX]
                raise RuntimeError(  # [OFFICE PDF FIX]
                    f"PyMuPDF conversion for Office format '{fmt}' is disabled. "  # [OFFICE PDF FIX]
                    "Use 'await convert_office_to_pdf(file_bytes, extension)' from async contexts."  # [OFFICE PDF FIX]
                )  # [OFFICE PDF FIX]
            return asyncio.run(convert_office_to_pdf(file_bytes, fmt))  # [OFFICE PDF FIX]

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
