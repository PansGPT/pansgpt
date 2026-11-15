"""Bounded local text extraction. Run untrusted document parsers in a subprocess."""

import io
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
MAX_TEXT = 40_000


def office_text(data: bytes, content_type: str) -> str:
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        entries = archive.infolist()
        if (
            len(entries) > 1_000
            or len({entry.filename for entry in entries}) != len(entries)
            or sum(entry.file_size for entry in entries) > 20 * 1024 * 1024
            or any(entry.flag_bits & 1 for entry in entries)
        ):
            raise ValueError("Office package limits exceeded.")

        def xml(name: str) -> ET.Element:
            entry = archive.getinfo(name)
            if entry.file_size > 2 * 1024 * 1024:
                raise ValueError("Office part is too large.")
            raw = archive.read(entry)
            if b"\x00" in raw or b"<!DOCTYPE" in raw.upper() or b"<!ENTITY" in raw.upper():
                raise ValueError("XML declarations are not supported.")
            return ET.fromstring(raw)

        if content_type == DOCX:
            root = xml("word/document.xml")
            return "\n".join(
                " ".join(node.text or "" for node in paragraph.iter() if node.tag.endswith("}t"))
                for paragraph in root.iter()
                if paragraph.tag.endswith("}p")
            )
        # Follow the actual deck order, not numeric ZIP filenames. Never resolve external links.
        deck = xml("ppt/presentation.xml")
        relationships = {
            item.attrib["Id"]: item.attrib.get("Target", "")
            for item in xml("ppt/_rels/presentation.xml.rels")
            if item.attrib.get("TargetMode") != "External"
        }
        slides = [node for node in deck.iter() if node.tag.endswith("}sldId")]
        if not 1 <= len(slides) <= 50:
            raise ValueError("Use a presentation with 1 to 50 slides.")
        parts: list[str] = []
        readable = False
        for number, slide in enumerate(slides, 1):
            relation = slide.attrib.get(
                "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id", ""
            )
            target = relationships.get(relation, "")
            if not target.startswith("slides/") or ".." in target or "\\" in target:
                raise ValueError("Invalid slide relationship.")
            text = "\n".join(
                node.text or "" for node in xml(f"ppt/{target}").iter() if node.tag.endswith("}t")
            )
            readable = readable or bool(text.strip())
            parts.append(f"[Slide {number}]\n{text}")
            if sum(map(len, parts)) > MAX_TEXT:
                raise ValueError("Presentation text limit exceeded.")
        if not readable:
            raise ValueError("These slides have no readable text. Upload slide images instead.")
        return "\n\n".join(parts)


def extract_document(data: bytes, content_type: str) -> str:
    if content_type == "application/pdf":
        import pymupdf

        if not data.startswith(b"%PDF-"):
            raise ValueError("The file is not a PDF.")
        parts: list[str] = []
        with pymupdf.open(stream=data, filetype="pdf") as document:
            if document.is_encrypted or not 1 <= len(document) <= 50:
                raise ValueError("Use an unlocked PDF with at most 50 pages.")
            readable = False
            for number, page in enumerate(document, 1):
                text = page.get_text()
                readable = readable or bool(text.strip())
                parts.append(f"[Page {number}]\n{text}")
                if sum(map(len, parts)) > MAX_TEXT:
                    raise ValueError("PDF text limit exceeded.")
            if not readable:
                raise ValueError("This PDF has no readable text. Upload page images instead.")
        text = "\n\n".join(parts)
    elif content_type in (PPTX, DOCX):
        text = office_text(data, content_type)
    elif content_type in ("text/plain", "text/markdown", "text/csv"):
        text = data.decode("utf-8-sig")
    else:
        raise ValueError("Unsupported document type.")
    if not text.strip() or "\x00" in text or len(text) > MAX_TEXT:
        raise ValueError("Use a non-empty document with at most 40,000 characters.")
    return text


if __name__ == "__main__":
    try:
        source, target, kind = sys.argv[1:]
        Path(target).write_text(extract_document(Path(source).read_bytes(), kind), encoding="utf-8")
    except Exception:
        sys.exit(1)
