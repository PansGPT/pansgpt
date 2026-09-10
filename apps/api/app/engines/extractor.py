# ==============================================================================
# Document Extractor Engine (Stage 2, 3a, 3b, 6 - PyMuPDF)
# Per-page text layer detection, native text extraction, structural tables, and image rendering
# ==============================================================================

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
    tables: list[ExtractedTable] = field(default_factory=list)
    embedded_images: list[ExtractedImage] = field(default_factory=list)
    full_page_render: bytes | None = None


class DocumentExtractor:
    """Zero-AI deterministic PDF extractor using PyMuPDF (fitz)."""

    def check_page_text_layer(self, page: fitz.Page, min_char_threshold: int = 35) -> bool:
        """
        Stage 2: Deterministic check if page has selectable text layer.
        True -> route to Stage 3a (native text).
        False -> route to Stage 3b (scanned canvas).
        """
        text = page.get_text("text").strip()
        # Ensure there are genuine printable alphanumeric characters
        alnum_chars = sum(1 for c in text if c.isalnum())
        return alnum_chars >= min_char_threshold

    def extract_tables_from_page(self, page: fitz.Page, page_number: int) -> list[ExtractedTable]:
        """
        Stage 6 Native Path: PyMuPDF page.find_tables() cell geometry extraction.
        100% exact, deterministic, $0 token cost.
        """
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

                # Convert to clean markdown table representation
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
            # If table finding encounters malformed vector objects, skip gracefully
            pass
        return tables

    def extract_embedded_images(
        self, doc: fitz.Document, page: fitz.Page, page_number: int
    ) -> list[ExtractedImage]:
        """
        Stage 3a: Scan page for embedded figures, diagrams, and scanned snippets.
        """
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

                # Skip tiny icons or layout glyphs (< 80x80)
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
        """
        Stage 3b: Render full page canvas as image for OCR or vision fallback.
        """
        pix = page.get_pixmap(dpi=dpi)
        return pix.tobytes("png")

    def process_document(self, pdf_bytes: bytes) -> list[ExtractedPage]:
        """
        Process entire PDF document through Stages 2, 3a, 3b, and 6 (native tables).
        """
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        pages: list[ExtractedPage] = []

        for page_idx in range(len(doc)):
            page_num = page_idx + 1
            page = doc[page_idx]

            has_text = self.check_page_text_layer(page)
            if has_text:
                # Stage 3a: Extract native text, structural tables, embedded images
                native_text = page.get_text("text").strip()
                tables = self.extract_tables_from_page(page, page_num)
                embedded_images = self.extract_embedded_images(doc, page, page_num)

                pages.append(
                    ExtractedPage(
                        page_number=page_num,
                        has_text_layer=True,
                        native_text=native_text,
                        tables=tables,
                        embedded_images=embedded_images,
                        full_page_render=None,
                    )
                )
            else:
                # Stage 3b: Fully scanned page -> render full page canvas
                full_render = self.render_page_canvas(page, dpi=150)
                pages.append(
                    ExtractedPage(
                        page_number=page_num,
                        has_text_layer=False,
                        native_text="",
                        tables=[],
                        embedded_images=[],
                        full_page_render=full_render,
                    )
                )

        doc.close()
        return pages


document_extractor = DocumentExtractor()
